// The Bead Jar API: saves and loads a person's jars by sync code.
//
//   GET /jars/{syncId}  -> the jars saved under that code
//   PUT /jars/{syncId}  -> replace the jars saved under that code
//
// The AWS SDK is preinstalled in the Lambda runtime — no bundling needed.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// The table name is injected by Terraform via an environment variable,
// so this code doesn't hard-code infrastructure details.
const TABLE = process.env.TABLE_NAME;

export const handler = async (event) => {
  const method = event.requestContext.http.method;
  const syncId = event.pathParameters?.syncId;

  // Never trust input: sync codes have exactly one legal shape.
  if (!syncId || !/^[a-zA-Z0-9-]{8,64}$/.test(syncId)) {
    return respond(400, { error: "syncId must be 8-64 letters, digits, or dashes" });
  }

  if (method === "GET") {
    const result = await db.send(new GetCommand({ TableName: TABLE, Key: { syncId } }));
    if (!result.Item) {
      return respond(404, { error: "Nothing saved under this sync code yet" });
    }
    return respond(200, { jars: result.Item.jars, savedAt: result.Item.savedAt });
  }

  if (method === "PUT") {
    if ((event.body || "").length > 100000) {
      return respond(413, { error: "Too much data" });
    }
    let body;
    try {
      body = JSON.parse(event.body || "");
    } catch {
      return respond(400, { error: "Body must be valid JSON" });
    }
    if (!Array.isArray(body.jars)) {
      return respond(400, { error: 'Body must look like { "jars": [...] }' });
    }

    const savedAt = new Date().toISOString();
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: { syncId, jars: body.jars, savedAt },
    }));
    return respond(200, { saved: body.jars.length, savedAt });
  }

  return respond(405, { error: "Only GET and PUT are supported" });
};

function respond(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
