import { PullRequestInformation } from "../types";

/**
 * Database for pull request storage
 */
export interface IPullRequestStore {
  accessPullRequestState(pullRequest: PullRequestInformation): Promise<IPullRequestState>;
  requestMergeFromBase(pullRequest: PullRequestInformation): Promise<IMergeFromBase | undefined>;
}

export interface IPullRequestState {
  hasAction(actionHash: string): Promise<boolean>;
  replaceActions(actionHashes: string[]): Promise<void>;
}

export interface IMergeFromBase {
  dequeue(): Promise<void>;
}