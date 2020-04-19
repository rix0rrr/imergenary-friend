import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import * as ifriend from 'imergenary-friend';

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // Always log the event to start with ;)
  const eventPayload = JSON.parse(event.body ?? '{}');
  eventPayload.headers = event.headers;

  const events = ifriend.parseEvent(event.headers['X-GitHub-Event'], eventPayload);
  events.forEach(console.log);

  return {
    body: JSON.stringify({
      success: true
    }),
    statusCode: 200,
  };
}
