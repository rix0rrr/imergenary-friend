declare module 'tau-prolog' {

  function create(limit?: number): type.Session;
  function format_answer(sub: type.Substitution): string;
  function flatten_error(error: type.Error): FlatError;

  type ParseError = type.Error;

  export type FlatError = {
    type: string;
    thrown: string | null;
    expected: string | null;
    found: string | null;
    representation: string | null;
    existence: string | null;
    existence_type: string | null;
    line: number | null;
    column: number | null;
    permission_operation: string | null;
    permission_type: string | null;
    evaluation_type: string | null;
  }

  namespace type {
    interface Session {
      readonly rules: Record<string, type.Rule[]>;

      consult(program: string, options?: {}): true | ParseError;
      query(query: string): true | ParseError;
      answer(cb: (x: type.Error | type.Substitution | false | null) => void): void;
      answers(cb: (x: type.Error | type.Substitution | false | null) => void): void;

      add_rule(rule: type.Rule, options?: {}): void;
    }

    class Substitution {
      constructor(links?: Record<string, any>, attrs?: Record<string, any>);

      lookup(variable: string): Atom;
    }

    type Atom = Term | Var | Num;

    class Term {
      public readonly ref: number;
      public readonly id: string;
      public readonly indicator: string;
      public readonly args: Atom[];

      constructor(id: string, args: Atom[]);

      replace<A extends Atom>(expr: A): A;

      toString(): string;
    }

    class Error extends Term {
      public readonly id: 'throw';
      public readonly args: [Term];
    }

    class Var {
      public readonly id: string;
      constructor(id: string);
    }

    class Num {
      public readonly value: number;
      public readonly is_float: boolean;

      constructor(value: number, is_float?: boolean);
    }

    class Rule {
      public readonly term: Term;
      public readonly body: Term | null;
      public readonly dynamic: boolean;

      constructor(head: Term, body: Term | null, dynamic?: boolean);
    }

    type RuleList = Rule[];
    type RuleFunction = (thread: Thread, point: Term, atom: Term) => boolean;
    type RuleDefinition = RuleList | RuleFunction;

    class Module {
      public readonly id: string;
      public readonly rules: Record<string, RuleDefinition>;
      public readonly exports: string[];

      constructor(id: string, rules: Record<string, RuleDefinition>, exports: string[]);

      exports_predicate(indicator: string): boolean;
    }

    class State {
      public readonly goal: Term;
      public readonly substitution: Substitution;
      public readonly parent: State;

      constructor(goal: Term, subs?: Substitution, parent?: State);
    }

    class Thread {
      public readonly session: Session;
      constructor(session: Session);

      throw(error: Term): void;
      success(point: Term, parent?: Term): void;
      prepend(states: State[]): void;
    }

    function is_substitution(x: any): x is Substitution;
    function is_variable(x: any): x is Var;
    function is_term(x: any): x is Term;
    function is_error(x: any): x is Error;
  }
}