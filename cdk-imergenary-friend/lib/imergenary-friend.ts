import * as path from 'path';
import { Construct, Duration } from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as njslambda from '@aws-cdk/aws-lambda-nodejs';
import * as lambda from '@aws-cdk/aws-lambda';

export interface ImergenaryFriendProps {
}

export class ImergenaryFriend extends Construct {
  constructor(scope: Construct, id: string, props?: ImergenaryFriendProps) {
    super(scope, id);

    const fn = new njslambda.NodejsFunction(this, 'Lambda', {
      entry: path.join(__dirname, 'lambda', 'lambda.ts'),
      description: 'ImergenaryFriend Main Lambda',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      timeout: Duration.minutes(10),
    });

    new apigw.LambdaRestApi(this, 'API', {
      restApiName: 'ImergenaryFriend',
      description: 'WebHook endpoint for GitHub Workflow Automation',
      handler: fn,
    });
  }
}
