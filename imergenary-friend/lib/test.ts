import { getPullRequestInformation } from "./github";
import { evaluate } from "./evaluate";

export async function evaluateAgainstGitHub(url: string, program: string) {
  const parts = url.match(/https?:\/\/github.com\/([a-z0-9-]+)\/([a-z0-9-]+)\/pull\/(\d+)/);
  if (!parts) {
    throw new Error(`Does not look like a GitHub pull request URL: ${url}`);
  }

  const prInfo = await getPullRequestInformation({
    owner: parts[1],
    repo: parts[2],
    pull_number: parseInt(parts[3], 10),
  });

  evaluate(prInfo, program, {
    debug: process.stdout
  });
}