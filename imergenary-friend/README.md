# Imergenary Friend Core

A friendly GitHub merge bot, slightly different from all the other ones out there.

![It is your friend](monster.png)

## Configuration Language

The bot is configured using Prolog. Why? No particularly good reason. Because I
can... because I didn't feel like implementing Yet Another Complex Rules Language
inside JSON or YAML... and because Prolog is supposed to be good at things like this!

Disclaimer: I'm not an experienced Prolog developer. I may have modeled this
in a way or did some things that would be silly to an experienced Prologian. If
so, please drop me a line. I'd be happy to be enlightened!

## A crash course in Prolog

A Prolog program is made up of clauses. A clause is either a fact:

```
% Some things are powerful
powerful(git).
powerful(cdk).

% Some things are simple
simple(cdk).
```

Or a rule containing variables and a set of other conditions that need to be
true for the fact to be satisfied:

```
% Things that are powerful AND simple are great!
great(X) :- powerful(X), simple(X).
```

We can now ask questions of the system:

```
% Is CDK great?
?- great(cdk).
true

% What things are powerful?
?- powerful(X).
X = git
X = cdk
```

By asking questions with a variable, Prolog is going to try to match the question
we ask against all facts and rules it has, and see the values that satisfy it.

## API

The API of Imergenary Friend is as follows:

1. Whenever IF determines something interesting happened to the PR and is ready
   to make a decision, it's going to evaluate your Prolog program.
2. The Prolog program gets loaded together with a set of facts that describe the PR,
   and potentially the event.
3. IF is going to ask the following question: `?- action(X).`. So, your rules that
   describe the action to be taken should be written like this:

```
action(the_thing_to_do('parameter')) :- whatever(makes), the_action(necessary).
```

The set of actions you can describe are listed below.

A note on syntax: quoted and unquoted terms are not semantically different, it's just
that special characters need to be escaped. So:

```
% These two are equivalent
pr_state(open)
pr_state('open')
```

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
pr_merge_state_status(behind|blocked|clean|dirty|draft|unknown|unstable).  % https://developer.github.com/v4/enum/mergestatestatus/
pr_maintainer_can_modify.
pr_label(<label>).
pr_check(<name>, success|failure|neutral|cancelled|timed_out|action_required|pending).
pr_status(<context>, pending|success|failure|error).
pr_review(<username>, approved|changes_requested).
```

If the PR was nodified:

```
event_change(<username>, assigned|unassigned|review_requested|review_request_removed|labeled|unlabeled|opened|edited|closed|ready_for_review|locked|unlocked|reopened|synchronize)
```

## Available actions


## Additions w.r.t ISO Prolog

Base API Reference: http://tau-prolog.org/documentation#builtin

```
not/1
```

We add `not/1` back, since it reads much more natural than `\+`.

## Attributions

Monster image designed by [Freepik](http://www.freepik.com).
