# Artificial Analysis MCP Worker

A stateless, remote MCP server for Artificial Analysis, deployed on Cloudflare Workers and protected with GitHub OAuth.

The model tools use Artificial Analysis's Free language-model API. Responses include
the Intelligence Index version and the Free-tier model data. The existing blended
price, math, MMLU-Pro, and GPQA sort inputs are retained as legacy compatibility
options; if the legacy endpoint is unavailable, the tool returns unsorted Free data
with a warning.

## Prerequisites

- Node.js 20 or newer
- A Cloudflare account
- An Artificial Analysis API key
- A GitHub OAuth App

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Log in to Cloudflare:

   ```bash
   npx wrangler login
   ```

3. Create the OAuth KV namespace:

   ```bash
   npx wrangler kv namespace create OAUTH_KV
   ```

   Copy the returned namespace ID into `wrangler.jsonc`.

4. Deploy once to reserve the Worker URL:

   ```bash
   npm run deploy
   ```

5. Create a GitHub OAuth App with:

   - Homepage URL: `https://artificial-analysis-mcp.<YOUR_WORKERS_SUBDOMAIN>.workers.dev`
   - Authorization callback URL: `https://artificial-analysis-mcp.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/callback`

6. Add secrets:

   ```bash
   npx wrangler secret put AA_API_KEY
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler secret put COOKIE_ENCRYPTION_KEY
   npx wrangler secret put ALLOWED_GITHUB_USERNAME
   ```

   Generate `COOKIE_ENCRYPTION_KEY` with:

   ```bash
   openssl rand -hex 32
   ```

7. Deploy again:

   ```bash
   npm run deploy
   ```

Your MCP endpoint is:

```text
https://artificial-analysis-mcp.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/mcp
```

## Local development

Create `.dev.vars` with the five secret values, then run:

```bash
npm run dev
```

Run the adapter and sorting tests with:

```bash
npm test
```
