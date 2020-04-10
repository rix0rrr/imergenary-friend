import { evaluateAgainstGitHub } from "../lib/test";
import { promises as fs } from 'fs';

async function main() {
  const fileName = process.argv[2];
  const url = process.argv[3];

  if (!fileName || !url) {
    throw new Error(`Usage: test-rules <SCRIPTFILE> <URL>`);
  }

  console.log(`Evaluating ${url} using ${fileName}`);
  const program = await fs.readFile(fileName, { encoding: 'utf-8' });

  await evaluateAgainstGitHub(url, program.toString());
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});