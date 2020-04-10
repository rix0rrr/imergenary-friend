# Imergenary Friend

A friendly GitHub merge bot, slightly different from all the other ones out there.

Built using CDK.

## Why is this different from other bots?

- Can act both on events and on PR states.
- Flexible configuration language (Prolog!)



## What it does

* Add a specific label to all PRs from a select set of people.
* Automatically add a message and merge a PR once a number of conditions are
  satisfied. Chooses between squash-merge/regular merge on request,
  full control over squash merge message.
* Trigger a merge from master on a PR if it has been scheduled for
  merging and is behind.
* Dismiss approvals if a non-core member changes the PR.
* Automatically approve Dependabot PRs.
* When people have submitted a "Change Requested" PR and the author changes
  the PR, gently remind them that they need to click "re-request review."
* Does not touch Dependabot PRs, unless they're completely ready to
  merge in which case it will merge them.



## Available terms

A number of terms, all starting with `pr_`, are defined based on the state
of the PR. These are available:

```
pr_state(open|closed).
pr_title(...).
pr_body(...).
pr_author(<username>).
pr_base(<branch>).
pr_head(<branch>).
pr_author_assocation(contributor|maintainer).
pr_draft.
pr_mergeable.
pr_rebaseable.
pr_mergeable_state(behind|blocked|clean|dirty|draft|unknown|unstable).  % https://developer.github.com/v4/enum/mergestatestatus/
pr_maintainer_can_modify.
pr_label(<label>).
pr_check(<name>, success|failure|neutral|cancelled|timed_out|action_required|pending).
pr_status(<context>, pending|success|failure|error).
pr_review(<username>, approved|changes_requested).
```

## Additions w.r.t ISO Prolog

Base API Reference: http://tau-prolog.org/documentation#builtin

```
not/1
```

We add `not/1` back, since it reads much more natural than `\+`.
