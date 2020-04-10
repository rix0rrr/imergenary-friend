import { Octokit } from '@octokit/rest';

// These types are all not exported by Octokit
// https://github.com/octokit/types.ts/issues/25
//
// Reference the type via the method returning it.

type PullsGetResponse = PromiseValue<
  ReturnType<InstanceType<typeof Octokit>['pulls']['get']>
>['data']

type ReviewsListResponse = PromiseValue<
  ReturnType<InstanceType<typeof Octokit>['pulls']['listReviews']>
>['data']

type ChecksListResponse = PromiseValue<
  ReturnType<InstanceType<typeof Octokit>['checks']['listForRef']>
>['data']

type StatusesListResponse = PromiseValue<
  ReturnType<InstanceType<typeof Octokit>['repos']['listStatusesForRef']>
>['data']

type PromiseValue<A> = A extends Promise<infer B> ? B : never;


/**
 * Information we have on the pull request
 */
export interface PullRequestInformation {
  /**
   * The response of octokit.pulls.get(...)
   */
  pullRequest: PullsGetResponse;

  /**
   * The response of octokit.checks.list(...)
   */
  checks: ChecksListResponse;

  /**
   * The response of octokit.repos.listStatusesForRef(...)
   */
  statuses: StatusesListResponse;

  /**
   * Reviews associated with the PR
   */
  reviews: ReviewsListResponse;
}