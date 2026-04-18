import { error } from "@howells/cli";
import { LinearClient } from "@linear/sdk";

let client: LinearClient | undefined;

/** Get or create the Linear SDK client. Reads LINEAR_API_KEY from env. */
export function getClient(): LinearClient {
  if (client) return client;

  const apiKey = process.env.LINEAR_API_KEY ?? process.env.LINEAR;
  if (!apiKey) {
    error("No Linear API key found. Set LINEAR_API_KEY or LINEAR env var.");
  }

  client = new LinearClient({ apiKey });
  return client;
}
