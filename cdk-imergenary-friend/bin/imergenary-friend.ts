#!/usr/bin/env node
import 'source-map-support/register';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { ImergenaryFriend } from '../lib/imergenary-friend-stack';

class ImergenaryFriendStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new ImergenaryFriend(this, 'ImergenaryFriend');
  }
}

const app = new App();
new ImergenaryFriendStack(app, 'ImergenaryFriendStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
