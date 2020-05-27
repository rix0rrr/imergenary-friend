import { evaluateAgainstGitHub } from "../lib/test";
import { promises as fs } from 'fs';
import { graphqlQuery } from "../lib";

async function main() {
  const result = await graphqlQuery(`
    query {
      repository(name:"aws-cdk", owner:"aws"){
        pullRequests(last:100, states: [OPEN]) {
          nodes {
            number,
            mergeable,
            mergeStateStatus
          }
        }
      }
    }
  `);

  console.log(JSON.stringify(result, undefined, 2));
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});