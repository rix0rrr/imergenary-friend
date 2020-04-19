import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import * as ifriend from 'imergenary-friend';

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // Always log the event to start with ;)
  const eventPayload = JSON.parse(event.body ?? '{}');
  const eventType = event.headers['X-GitHub-Event'];

  try {
    const events = ifriend.parseEvent(eventType, eventPayload);
    events.forEach(x => console.log(JSON.stringify(x)));
  } catch(e) {
    console.log(JSON.stringify({ error: e.message, eventType, event }));
  }

  return {
    body: JSON.stringify({
      success: true
    }),
    statusCode: 200,
  };
}
