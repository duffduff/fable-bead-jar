// Our first Lambda. AWS calls this function once per request.
//
// `event` describes the incoming request (who called, with what).
// Whatever we return becomes the HTTP response.
export const handler = async (event) => {
  console.log("Bead Jar API was called!");   // ends up in CloudWatch logs

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Hello from the Bead Jar API!",
      poweredBy: "AWS Lambda",
    }),
  };
};
