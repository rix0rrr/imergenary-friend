import * as AWS from 'aws-sdk';
import { IPullRequestStore, PullRequestInformation, IPullRequestState, IMergeQueueHead } from "imergenary-friend";

export class DynamoDBTableStore implements IPullRequestStore {
  private ddb: AWS.DynamoDB;

  constructor(private readonly tableName: string, private readonly queueIndexName: string) {
    this.ddb = new AWS.DynamoDB();
  }

  public async accessPullRequestState(pullRequest: PullRequestInformation): Promise<IPullRequestState> {
    const response = await this.ddb.getItem({
      TableName: this.tableName,
      Key: prKey(pullRequest),
      AttributesToGet: [ 'actions' ],
      ConsistentRead: true,
    }).promise();

    const actions: string[] = response.Item?.actions?.SS ?? [];

    return {
      hasAction: (actionHash) => Promise.resolve(actions.includes(actionHash)),
      replaceActions: async (actionHashes) => {
        await this.ddb.updateItem({
          TableName: this.tableName,
          Key: prKey(pullRequest),
          UpdateExpression: 'SET actions = :actions',
          ExpressionAttributeValues: {
            ':actions': { SS: actionHashes }
          }
        }).promise();
      },
    };
  }

  public async enqueueMerge(pullRequest: PullRequestInformation): Promise<void> {
    const tsNow = Date.now();

    const key = prKey(pullRequest);

    // Add an 'enqueued' field with the current time, if it doesn't exist yet.
    // (Don't overwrite if we already exist or we'll move to the back of the queue!)
    try {
      await this.ddb.updateItem({
        TableName: this.tableName,
        Key: prKey(pullRequest),
        UpdateExpression: 'SET enqueued = if_not_exists(enqueued, :ts), expected_sha = :sha',
        ExpressionAttributeValues: {
          ':ts': { N: `${tsNow}` },
          ':sha': { S: pullRequest.headOid },
        }
      }).promise();
    } catch (e) {
      // Conditional check failed is okay
      if (e.code !== 'ConditionalCheckFailedException') { throw e; }
    }
  }

  public async checkHeadOfQueue(pullRequest: PullRequestInformation): Promise<IMergeQueueHead | undefined> {
    const key = prKey(pullRequest);

    // Now query the index: we succeeded if we're the first element in the index
    const response = await this.ddb.query({
      TableName: this.tableName,
      IndexName: this.queueIndexName,
      ConsistentRead: true,
      Limit: 2,
      KeyConditionExpression: 'repo = :repo',
      ExpressionAttributeValues: {
        ':repo': key.repo,
      },
      ScanIndexForward: true,
      Select: 'ALL_PROJECTED_ATTRIBUTES',
    }).promise();

    const firstItem = parseQueueEntry(response.Items?.[0]);
    const secondItem = parseQueueEntry(response.Items?.[1]);
    if (firstItem?.number !== pullRequest.number) { return undefined; }

    return {
      dequeue: async () => {
        try {
          await this.ddb.updateItem({
            TableName: this.tableName,
            Key: prKey(pullRequest),
            UpdateExpression: 'REMOVE enqueued, expected_sha',
            ConditionExpression: 'enqueued = :enqueued',
            ExpressionAttributeValues: {
              ':enqueued': { N: `${firstItem.enqueued}` }
            }
          }).promise();

          if (!secondItem) { return undefined; }
          const [owner, repo] = secondItem.repo.split('/');

          return {
            owner,
            repo,
            number: secondItem.number,
            expectedSha: secondItem.expected_sha,
          };
        } catch (e) {
          // Conditional check failed is okay
          if (e.code !== 'ConditionalCheckFailedException') { throw e; }
        }

        return undefined;
      }
    };
  }
}


function prKey(pullRequest: PullRequestInformation): AWS.DynamoDB.AttributeMap {
  return {
    repo: { S: `${pullRequest.repository.owner}/${pullRequest.repository.repo}` },
    pull: { N: `${pullRequest.number}` },
  };
}

function parseQueueEntry(ddb: AWS.DynamoDB.AttributeMap | undefined): QueueEntry | undefined {
  if (!ddb) { return; }

  if (!ddb.repo?.S || !ddb.number?.N || !ddb.enqueued?.N || !ddb.expected_sha?.S) { return; }
  return {
    repo: ddb.repo?.S,
    number: parseInt(ddb.number?.N, 10),
    enqueued: parseInt(ddb.enqueued?.N, 10),
    expected_sha: ddb.expected_sha?.S,
  };
}

interface QueueEntry {
  /**
   * Repository as "owner/repo" string
   */
  readonly repo: string;
  readonly number: number;
  readonly enqueued: number;
  readonly expected_sha: string;
}



