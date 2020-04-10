import * as path from 'path';
import { Construct, Duration } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as apigw from '@aws-cdk/aws-apigateway';

export interface ImergenaryFriendProps {
}

export class ImergenaryFriend extends Construct {
  constructor(scope: Construct, id: string, props?: ImergenaryFriendProps) {
    super(scope, id);

    const fn = new lambda.Function(this, 'Lambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      handler: 'lambda.handler',
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
