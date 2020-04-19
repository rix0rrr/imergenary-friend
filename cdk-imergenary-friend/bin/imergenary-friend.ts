#!/usr/bin/env node
import 'source-map-support/register';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { ImergenaryFriend } from '../lib/imergenary-friend';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as path from 'path';
import * as assets from '@aws-cdk/aws-s3-assets';

class ImergenaryFriendStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new ImergenaryFriend(this, 'ImergenaryFriend', {
      githubTokenSecret: secrets.Secret.fromSecretArn(this, 'Token', 'arn:aws:secretsmanager:eu-west-1:993655754359:secret:imergenary-friend-token-cRL5Hn'),
      configFiles: new assets.Asset(this, 'Config', {
        path: path.join(__dirname, 'config'),
      })
    });
  }
}

const app = new App();
new ImergenaryFriendStack(app, 'ImergenaryFriendStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
