# Bead Jar backend

Serverless API on AWS Lambda. Region: `us-east-1`, account `058264520091`.

## Phase 7 — hello Lambda, deployed by hand *(decommissioned)*

> **This function no longer exists.** `bead-jar-hello` was a throwaway that
> Terraform never managed, sitting on a public URL anyone could call, so
> `terraform destroy` would have left it running forever. It and its role
> were deleted on 2026-07-24. The commands below are kept as the learning
> record — they still describe how a Lambda is assembled by hand — but
> don't expect the URL or the function to be there.

A Lambda deployment has three parts, created in this order:

**1. The IAM role** — the permission badge the function runs as.
The trust policy says who may wear the badge (the Lambda service);
the attached policy says what the wearer may do (write logs only).

```sh
aws iam create-role \
  --role-name bead-jar-hello-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name bead-jar-hello-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

**2. The code** — `hello/index.mjs` (also deleted), zipped:

```sh
cd hello && zip -j function.zip index.mjs
```

**3. The function** — glues code + role + runtime together:

```sh
aws lambda create-function \
  --function-name bead-jar-hello \
  --runtime nodejs22.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::058264520091:role/bead-jar-hello-role
```

**Public URL** — the built-in HTTPS front door. Since October 2025 a
public URL needs BOTH permissions below (an older recipe with only
`InvokeFunctionUrl` gives 403 Forbidden — we hit this):

```sh
aws lambda create-function-url-config \
  --function-name bead-jar-hello --auth-type NONE

aws lambda add-permission \
  --function-name bead-jar-hello \
  --statement-id public-url-access \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE

aws lambda add-permission \
  --function-name bead-jar-hello \
  --statement-id public-url-invoke-function \
  --action lambda:InvokeFunction \
  --principal "*" \
  --invoked-via-function-url
```

**Redeploying after a code change:**

```sh
cd hello && zip -j function.zip index.mjs && \
aws lambda update-function-code \
  --function-name bead-jar-hello --zip-file fileb://function.zip
```

## Phase 8 — the real API, in Terraform

Everything lives in `terraform/main.tf`: DynamoDB table `bead-jar-data`,
Lambda `bead-jar-api` (code in `api/index.mjs`), and an API Gateway
HTTP API with `GET`/`PUT /state/{syncId}` routes.

Live at: https://g4tul8gnh2.execute-api.us-east-1.amazonaws.com

```sh
cd terraform
terraform plan    # preview what would change
terraform apply   # make reality match main.tf (also redeploys code changes)
```

The state files (`*.tfstate`) are Terraform's memory of what it built —
they stay out of git (see .gitignore) and must not be deleted.

### The API

```
GET  /state/{syncId}  -> 200 { state, savedAt, revision }
                         404 if nothing is saved under that code
PUT  /state/{syncId}  -> 200 { savedAt, revision }
                         400 bad syncId / bad JSON / state isn't an object
                         409 someone else saved first (stale revision)
                         413 over 100KB
```

`state` is stored as an **opaque blob** — whatever JSON object the app
sends comes back unchanged. The backend deliberately knows nothing about
beads or behaviors, so the app's data model can change without a deploy.

`revision` is how two devices avoid overwriting each other. A save sends
back the revision it last read; if the stored one has moved on, the write
is rejected with a 409 and the app should reload first. A first-ever save
sends `revision: 0` (or omits it).

```sh
API=$(cd terraform && terraform output -raw api_url)
curl -s "$API/state/mysynccode1"
curl -s -X PUT "$API/state/mysynccode1" \
  -H 'content-type: application/json' \
  -d '{"state":{"beads":[]},"revision":0}'
```

### Known gaps

There is no authentication: the sync code *is* the credential, and it
travels in the URL. Anyone who knows a code can read and overwrite that
jar, and CORS is still `*`. Rate limiting (20 req/s) and a Lambda
concurrency cap of 5 are in place so this can't get expensive, but real
accounts and a tightened origin are Phase 10 work.

## Why Phase 8 existed

Count the commands above. That was ONE function with no database, no
routes, no stages. Phase 8 replaces this ritual with one template file
and one deploy command (infrastructure as code) — now that we know
exactly what the tooling automates for us.
