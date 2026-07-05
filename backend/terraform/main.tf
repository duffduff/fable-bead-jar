# Bead Jar backend, declared as code.
# Run from this directory:  terraform init && terraform plan && terraform apply

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# --- The database -----------------------------------------------------
# DynamoDB is AWS's serverless key-value store: no server, pay per
# request. One row per sync code; hash_key is the lookup key.

resource "aws_dynamodb_table" "jars" {
  name         = "bead-jar-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "syncId"

  attribute {
    name = "syncId"
    type = "S" # string
  }
}

# --- The Lambda's permission badge ------------------------------------
# Same two pieces we built by hand in Phase 7: a trust policy (who may
# wear the badge) and permissions (what the wearer may do). Plus one
# new inline policy: this function may read/write OUR table — only ours.

resource "aws_iam_role" "api" {
  name = "bead-jar-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "api_dynamo" {
  name = "read-write-jars-table"
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
      Resource = aws_dynamodb_table.jars.arn
    }]
  })
}

# --- The function ------------------------------------------------------
# archive_file zips the code at plan time; source_code_hash means
# "redeploy whenever the zip's contents change".

data "archive_file" "api" {
  type        = "zip"
  source_file = "${path.module}/../api/index.mjs"
  output_path = "${path.module}/build/api.zip"
}

resource "aws_lambda_function" "api" {
  function_name    = "bead-jar-api"
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  role             = aws_iam_role.api.arn

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.jars.name
    }
  }
}

# --- The front door ----------------------------------------------------
# An API Gateway "HTTP API": real routes with a path parameter, CORS
# handled for us, one URL. Requests are proxied to the Lambda.

resource "aws_apigatewayv2_api" "api" {
  name          = "bead-jar-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"] # tightened to our real domain in Phase 10
    allow_methods = ["GET", "PUT", "OPTIONS"]
    allow_headers = ["content-type"]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_jars" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /jars/{syncId}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "put_jars" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "PUT /jars/{syncId}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

# Allow API Gateway (and only it) to invoke the function.
resource "aws_lambda_permission" "allow_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# --- Outputs: facts we'll need elsewhere -------------------------------

output "api_url" {
  value = aws_apigatewayv2_api.api.api_endpoint
}
