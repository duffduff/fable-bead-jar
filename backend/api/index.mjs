// The Bead Jar API: saves and loads the whole app state by sync code.
//
//   GET /state/{syncId}  -> the state saved under that code
//   PUT /state/{syncId}  -> replace the state saved under that code
//
// The state is stored as an opaque blob: whatever JSON object the app
// sends, we hand back unchanged. That means the app can change its own
// data model (add a field, rename one) without ever redeploying this.
//
// The AWS SDK is preinstalled in the Lambda runtime — no bundling needed.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// The table name is injected by Terraform via an environment variable,
// so this code doesn't hard-code infrastructure details.
const TABLE = process.env.TABLE_NAME;

// DynamoDB refuses any single row bigger than 400KB. We stop well short
// of that so an oversized save fails as a clear "too big" instead of as
// a database error nobody can read.
const MAX_BYTES = 100 * 1024;

export const handler = async (event) => {
  // One try/catch around everything. Without it, an unexpected failure
  // (a database hiccup, a bug in here) escapes as a bare 502 with no
  // explanation. With it, the caller always gets JSON back.
  try {
    const method = event.requestContext?.http?.method;
    const syncId = event.pathParameters?.syncId;

    // Never trust input: sync codes have exactly one legal shape.
    if (!syncId || !/^[a-zA-Z0-9-]{8,64}$/.test(syncId)) {
      return respond(400, { error: "syncId must be 8-64 letters, digits, or dashes" });
    }

    if (method === "GET") return await loadState(syncId);
    if (method === "PUT") return await saveState(syncId, event);

    return respond(405, { error: "Only GET and PUT are supported" });
  } catch (err) {
    console.error("Unhandled error", err); // ends up in CloudWatch logs
    return respond(500, { error: "Something went wrong saving your beads" });
  }
};

async function loadState(syncId) {
  const result = await db.send(new GetCommand({ TableName: TABLE, Key: { syncId } }));

  if (!result.Item) {
    return respond(404, { error: "Nothing saved under this sync code yet" });
  }

  return respond(200, {
    state: result.Item.state,
    savedAt: result.Item.savedAt,
    revision: result.Item.revision,
  });
}

async function saveState(syncId, event) {
  // API Gateway sometimes hands us the body base64-encoded. Decode first,
  // then measure the real bytes — a JS string's .length counts characters,
  // and one emoji can be four bytes.
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) {
    return respond(413, { error: "Too much data" });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return respond(400, { error: "Body must be valid JSON" });
  }

  // `state` must be a plain object. An empty one is fine — a brand-new
  // device with nothing in the jar yet is a perfectly valid thing to save.
  const state = body?.state;
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    return respond(400, { error: 'Body must look like { "state": { ... } }' });
  }

  // Optimistic concurrency, so two phones can't silently overwrite each
  // other. The caller sends back the revision it last saw; we only accept
  // the write if the stored revision still matches. First write sends 0
  // (or nothing) and relies on the row not existing yet.
  const expected = Number.isInteger(body.revision) ? body.revision : 0;
  const savedAt = new Date().toISOString();
  const revision = expected + 1;

  try {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: { syncId, state, savedAt, revision },
      ConditionExpression: "attribute_not_exists(syncId) OR revision = :expected",
      ExpressionAttributeValues: { ":expected": expected },
    }));
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return respond(409, {
        error: "This jar changed on another device. Load it again before saving.",
      });
    }
    throw err; // anything else is a real failure — let the handler's catch log it
  }

  return respond(200, { savedAt, revision });
}

function respond(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
