import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import { Octokit } from '@octokit/rest';

/*
const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_TOKEN}`,
  userAgent: 'imergenary-friend',
});
*/

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // Always log the event to start with ;)
  const eventPayload = JSON.parse(event.body ?? '{}');
  eventPayload.headers = event.headers;

  console.log(JSON.stringify(eventPayload));

  return {
    body: JSON.stringify({
      success: true
    }),
    statusCode: 200,
  };
}
