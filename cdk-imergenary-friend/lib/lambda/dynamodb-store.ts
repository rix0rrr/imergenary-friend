import * as AWS from 'aws-sdk';
import { IPullRequestStore, PullRequestInformation, IMergeFromBase, IPullRequestState } from "imergenary-friend";

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

  public async requestMergeFromBase(pullRequest: PullRequestInformation): Promise<IMergeFromBase | undefined> {
    const tsNow = Date.now();

    const key = prKey(pullRequest);

    // Add an 'enqueued' field with the current time, if it doesn't exist yet.
    // (Don't overwrite if we already exist or we'll move to the back of the queue!)
    try {
      await this.ddb.updateItem({
        TableName: this.tableName,
        Key: prKey(pullRequest),
        UpdateExpression: 'SET enqueued = :ts',
        ConditionExpression: 'attribute_not_exists(enqueued)',
        ExpressionAttributeValues: {
          ':ts': { N: `${tsNow}` }
        }
      }).promise();
    } catch (e) {
      // Conditional check failed is okay
      if (e.code !== 'ConditionalCheckFailedException') { throw e; }
    }

    // Now query the index: we succeeded if we're the first element in the index
    const response = await this.ddb.query({
      TableName: this.tableName,
      IndexName: this.queueIndexName,
      ConsistentRead: true,
      Limit: 1,
      KeyConditionExpression: 'repo = :repo',
      ExpressionAttributeValues: {
        ':repo': key.repo,
      },
      ScanIndexForward: true,
      Select: 'ALL_PROJECTED_ATTRIBUTES',
    }).promise();

    const firstItem = response.Items?.[0];
    if (!firstItem || firstItem.repo.S !== key.repo || firstItem.pull.N !== key.pull) { return undefined; }
    const enqueued = firstItem.enqueued;
    if (!enqueued) { return undefined; }

    return {
      dequeue: async() => {
        await this.ddb.updateItem({
          TableName: this.tableName,
          Key: prKey(pullRequest),
          UpdateExpression: 'REMOVE enqueued',
          ConditionExpression: 'enqueued = :enqueued',
          ExpressionAttributeValues: {
            ':enqueued': { N: `${enqueued}` }
          }
        }).promise();
      }
    };
  }
}

function prKey(pullRequest: PullRequestInformation): Record<string, any> {
  return {
    repo: { S: `${pullRequest.repository.owner}/${pullRequest.repository.repo}` },
    pull: { N: `${pullRequest.number}` },
  };
}