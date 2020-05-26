import { evaluateAgainstGitHub } from "../lib/test";
import { promises as fs } from 'fs';
import { graphqlQuery } from "../lib";

async function main() {
  const result = await graphqlQuery(`
    query {
      repository(name:"aws-cdk", owner:"aws"){
        pullRequests(first:100) {
          nodes {
            number,
            mergeStateStatus
          }
        }
      }
    }
  `);

  console.log(result);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});