import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import * as ifriend from 'imergenary-friend';
import * as AWS from 'aws-sdk';
import * as AdmZip from 'adm-zip';
import { PullRequestAction, PullRequestInformation } from "imergenary-friend";

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const eventPayload = JSON.parse(event.body ?? '{}');
  const eventType = event.headers['X-GitHub-Event'];

  try {
    const events = ifriend.parseEvent(eventType, eventPayload);

    for (const event of events) {
      const actions = await actionsForEvent(event);
      console.log(JSON.stringify({ event, actions }));
    }

    return {
      body: JSON.stringify({
        success: true
      }),
      statusCode: 200,
    };
  } catch(e) {
    console.log(JSON.stringify({ error: e.message, eventType, eventPayload }));
    throw e;
  }
}

async function actionsForEvent(event: ifriend.TriggerEvent): Promise<EventActions[]> {
  const { owner, repo } = event.repository;

  const program = await fetchConfig(owner, repo);
  if (!program) { return []; }

  await fetchToken();

  const pullRequests = event.event === 'status'
    ? await ifriend.findPullRequestsFromHead(owner, repo, event.sha)
    : [await ifriend.getPullRequestInformation(owner, repo, event.pullNumber)];

  return pullRequests.map(pullRequest => ({
    pullRequest,
    actions: ifriend.evaluate(program, { pullRequest, event }).map(action => ({
      repository: { owner, repo },
      pullNumber: pullRequest.number,
      action,
    }))
  }));
}

async function fetchToken() {
  if (!process.env.GITHUB_TOKEN) {
    const secrets = new AWS.SecretsManager();
    const token = await secrets.getSecretValue({
      SecretId: process.env.GITHUB_TOKEN_SECRET_ARN!,
    }).promise();
    process.env.GITHUB_TOKEN = token.SecretString;
  }
}

let downloadedConfigZip: Buffer | undefined;
async function fetchConfig(owner: string, repo: string): Promise<string | undefined> {
  if (downloadedConfigZip === undefined) {
    const s3 = new AWS.S3();
    const response = await s3.getObject({
      Bucket: process.env.CONFIG_BUCKET!,
      Key: process.env.CONFIG_KEY!,
    }).promise();
    downloadedConfigZip = response.Body as Buffer;
  }

  const zip = new AdmZip(downloadedConfigZip);
  const fileName = `${owner}_${repo}.pro`;
  try {
    return zip.readAsText(fileName, 'utf-8');
  } catch (e) {
    return undefined;
  }
}

function flatMap<A, B>(xs: A[], fn: (x: A) => B[]): B[] {
  return Array.prototype.concat([], xs.map(fn));
}

interface EventActions {
  pullRequest: PullRequestInformation;
  actions: PullRequestAction[];
}