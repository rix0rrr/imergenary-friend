import { PullRequestInformation } from "../types";

/**
 * Database for pull request storage
 */
export interface IPullRequestStore {
  accessPullRequestState(pullRequest: PullRequestInformation): Promise<IPullRequestState>;
  enqueueMerge(pullRequest: PullRequestInformation): Promise<void>;
  checkHeadOfQueue(pullRequest: PullRequestInformation): Promise<IMergeQueueHead | undefined>;
}

export interface IPullRequestState {
  hasAction(actionHash: string): Promise<boolean>;
  replaceActions(actionHashes: string[]): Promise<void>;
}

export interface IMergeQueueHead {
  dequeue(): Promise<INextPullRequest | undefined>;
}

export interface INextPullRequest {
  owner: string;
  repo: string;
  number: number;
  expectedSha: string;
}