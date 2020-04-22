import * as pl from 'tau-prolog';
import * as ph from './prolog-helpers';
import { PullRequestInformation, TriggerEvent, Action } from "./types";

export interface EvaluateOptions {
  pullRequest: PullRequestInformation;
  event?: TriggerEvent;
  debug?: NodeJS.WriteStream;
}

/**
 * Evaluate the given prolog program against the given Pull Request
 */
export function evaluate(program: string, options: EvaluateOptions): Action[] {
  const session = pl.create();

  // Seed the session with rules
  addPrFacts(options.pullRequest, session, options);
  if (options.event) {
    addEventFacts(options.event, session, options);
  }
  extendRuleSet(session);

  // Evaluate the program
  const parsed = session.consult(program);
  if (parsed !== true) { throw termToError(parsed); }

  // Ask for all actions
  const queried = session.query('action(X).');
  if (queried !== true) { throw termToError(queried); }

  const ret = new Array<Action>();
  session.answers(x => {
    if (x) {
      ret.push({ description: pl.format_answer(x) });
    }
  });

  return ret;
}

/**
 * Turn PR data into a set of facts
 */
function addPrFacts(pr: PullRequestInformation, session: pl.type.Session, options: EvaluateOptions) {
  const _ = new FactHelper(session, options.debug);

  // Facts about the PR
  _.stringFact('pr_state', pr.state);
  _.boolFact('pr_locked', pr.locked);
  _.stringFact('pr_title', pr.title);
  _.stringFact('pr_body', pr.body);
  _.stringFact('pr_author', pr.author);
  _.boolFact('pr_draft', pr.draft);
  _.stringFact('pr_base', pr.base);
  _.stringFact('pr_head', pr.head);
  _.stringFact('pr_author_association', pr.authorAssociation);
  _.boolFact('pr_merged', pr.merged);
  _.boolFact('pr_mergeable', pr.mergeable);
  _.boolFact('pr_rebaseable', pr.rebaseable);
  _.stringFact('pr_merge_state_status', pr.mergeStateStatus);
  _.boolFact('pr_maintainer_can_modify', pr.maintainerCanModify);

  _.listFact('pr_label', 1, pr.labels ?? []);
  _.listFact('pr_requested_reviewers', 1, pr.requestedReviewers ?? []);
  _.listFact('pr_requested_teams', 1, pr.requestedTeams ?? []);
  _.listFact('pr_check', 2, (pr.checks ?? []).map(c => [c.name, c.conclusion]));
  _.listFact('pr_status', 2, (pr.statuses ?? []).map(c => [c.context, c.state]));
  _.listFact('pr_review', 2, (pr.reviews ?? []).map(r => [r.reviewer, r.state]));
}

/**
 * Turn an event into a set of facts
 */
function addEventFacts(event: TriggerEvent, session: pl.type.Session, options: EvaluateOptions) {
  const _ = new FactHelper(session, options.debug);
  switch (event.event) {
    case 'pull_request':
      _.addRule(ph.rule('event_changed', [ph.term(event.sender), ph.term(event.action)]));
      break;
  }

  // Make sure the rule exists so
  _.addRule(ph.rule('event_change', [ph._(), ph._()], ph.term('fail')));
}

/**
 * Extend the base rule set with some convenient rules
 */
function extendRuleSet(session: pl.type.Session) {
  // Add a 'not' rule. \+ is the built-in 'not', but that reads like crap.
  // Definition:  not(X) :- call(X), !, fail.
  //              not(_).
  session.add_rule(ph.rule('not', [ph.X()],
    ph.term('call', ph.X()),
    ph.term('!'),
    ph.term('fail')));
  session.add_rule(ph.rule('not', [ph._()]));
}

/**
 * Translate an error term to an throwable Error
 *
 * Examples:
 * - throw(error(syntax_error('. or operator expected'), [line(1), column(2), found('Users')]))
 * - throw(error(syntax_error('. or operator expected'), [line(1), column(15), token_not_found]))
 * - throw(error(syntax_error('argument expected'), [line(7), column(75), found(')')]))
 *
 * This means 'draft/0' does not exist (found inside 'call/1')
 * - error(existence_error(procedure, '/'(draft, 0)), '/'(call, 1))
 *
 */
function termToError(term: pl.type.Term) {
  if (term.id !== 'throw') { return new Error(term.toString()); }
  // FIXME: Do properly at some point
  console.log((term as any).__constructor__);
  return new Error(term.toString());
}

function range(n: number) {
  const ret: number[] = [];
  for (let i = 0; i < n; i++) {
    ret.push(i);
  }
  return ret;
}

class FactHelper {
  constructor(private readonly session: pl.type.Session, private readonly debug?: NodeJS.WriteStream) {
  }

  // Helpers
  public stringFact(factName: string, value: string) {
    this.addRule(ph.rule(factName, [ph.term(value)]));
  }

  public boolFact(factName: string, value: boolean) {
    if (value) {
      this.addRule(ph.rule(factName, []));
    } else {
      this.addRule(ph.rule(factName, [], ph.term('fail')));
    }
  }

  public listFact<A extends number>(factName: string, arity: A, values: ArityValue<A>[]) {
    for (const value of values) {
      if (typeof value === 'string') {
        this.addRule(ph.rule(factName, [ph.term(value)]));
      } else if (Array.isArray(value)) {
        this.addRule(ph.rule(factName, value.map(t => ph.term(t))));
      }
    }

    // Add a 'fail' for this list if it is empty, otherwise we'll get an 'undefined' error.
    if (values.length === 0) {
      this.addRule(ph.rule(factName, range(arity).map(_ => ph._()), ph.term('fail')));
    }
  }

  public addRule(rule: pl.type.Rule) {
    if (this.debug) {
      this.debug.write(`${rule}\n`);
    }
    this.session.add_rule(rule);
  }
}

type ArityValue<A extends number> =
  A extends 1 ? string :
  A extends 2 ? [any, any] :
  A extends 3 ? [any, any, any] :
  never;
