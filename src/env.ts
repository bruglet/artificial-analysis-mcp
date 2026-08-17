import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface WorkerEnv {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  AA_API_KEY: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  ALLOWED_GITHUB_USERNAME: string;
}

export interface AuthProps {
  login: string;
  name: string | null;
  email: string | null;
}
