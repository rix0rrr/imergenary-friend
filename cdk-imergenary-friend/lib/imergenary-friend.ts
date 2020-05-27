import * as path from 'path';
import { Construct, Duration, SecretValue, RemovalPolicy } from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as njslambda from '@aws-cdk/aws-lambda-nodejs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as assets from '@aws-cdk/aws-s3-assets';

export interface ImergenaryFriendProps {
  /**
   * Token to access GitHub with
   */
  githubTokenSecret: secrets.ISecret;

  /**
   * Directory with config files
   */
  configFiles: assets.Asset;
}

export class ImergenaryFriend extends Construct {
  constructor(scope: Construct, id: string, props: ImergenaryFriendProps) {
    super(scope, id);

    const table = new ddb.Table(this, 'Table', {
      partitionKey: { name: 'repo', type: ddb.AttributeType.STRING },
      sortKey: { name: 'pull', type: ddb.AttributeType.NUMBER },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const queueIndexName = 'MergeFromBaseQueue';

    table.addLocalSecondaryIndex({
      indexName: queueIndexName,
      sortKey: { name: 'enqueued', type: ddb.AttributeType.NUMBER },
      projectionType: ddb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['expected_sha'],
    });

    const fn = new njslambda.NodejsFunction(this, 'Lambda', {
      entry: path.join(__dirname, 'lambda', 'lambda.js'),
      description: 'ImergenaryFriend Main Lambda',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      timeout: Duration.minutes(10),
      environment: {
        GITHUB_TOKEN_SECRET_ARN: props.githubTokenSecret.secretArn,
        CONFIG_BUCKET: props.configFiles.s3BucketName,
        CONFIG_KEY: props.configFiles.s3ObjectKey,
        TABLE_NAME: table.tableName,
        QUEUE_INDEX_NAME: queueIndexName,
      }
    });

    table.grantReadWriteData(fn);

    props.githubTokenSecret.grantRead(fn);
    props.configFiles.grantRead(fn);

    new apigw.LambdaRestApi(this, 'API', {
      restApiName: 'ImergenaryFriend',
      description: 'WebHook endpoint for GitHub Workflow Automation',
      handler: fn,
    });
  }
}
