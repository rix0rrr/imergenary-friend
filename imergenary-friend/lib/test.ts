import { getPullRequestInformation } from "./github";
import { evaluate } from "./evaluate";

export async function evaluateAgainstGitHub(url: string, program: string) {
  const parts = url.match(/https?:\/\/github.com\/([a-z0-9-]+)\/([a-z0-9-]+)\/pull\/(\d+)/);
  if (!parts) {
    throw new Error(`Does not look like a GitHub pull request URL: ${url}`);
  }

  const prInfo = await getPullRequestInformation(
    parts[1],
    parts[2],
    parseInt(parts[3], 10),
  );

  evaluate(program, {
    pullRequest: prInfo,
    debug: process.stdout
  });
}