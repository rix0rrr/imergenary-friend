import * as path from 'path';
import { Construct, Duration, SecretValue } from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as njslambda from '@aws-cdk/aws-lambda-nodejs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as secrets from '@aws-cdk/aws-secretsmanager';
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

    const fn = new njslambda.NodejsFunction(this, 'Lambda', {
      entry: path.join(__dirname, 'lambda', 'lambda.ts'),
      description: 'ImergenaryFriend Main Lambda',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      timeout: Duration.minutes(10),
      environment: {
        GITHUB_TOKEN_SECRET_ARN: props.githubTokenSecret.secretArn,
        CONFIG_BUCKET: props.configFiles.s3BucketName,
        CONFIG_KEY: props.configFiles.s3ObjectKey,
      }
    });

    props.githubTokenSecret.grantRead(fn);
    props.configFiles.grantRead(fn);

    new apigw.LambdaRestApi(this, 'API', {
      restApiName: 'ImergenaryFriend',
      description: 'WebHook endpoint for GitHub Workflow Automation',
      handler: fn,
    });
  }
}
