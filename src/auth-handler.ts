import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import type { AuthProps, WorkerEnv } from "./env";

const STATE_PREFIX = "github-oauth-state:";
const STATE_COOKIE = "__Host-AA_MCP_STATE";
const STATE_TTL_SECONDS = 600;

const app = new Hono<{ Bindings: WorkerEnv }>();

app.get("/", (c) =>
  c.html(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Artificial Analysis MCP</title></head>
<body style="font-family:system-ui;max-width:720px;margin:4rem auto;padding:0 1rem;line-height:1.5">
  <h1>Artificial Analysis MCP</h1>
  <p>This is a private, OAuth-protected MCP server.</p>
  <p>MCP endpoint: <code>/mcp</code></p>
</body>
</html>`)
);

app.get("/authorize", async (c) => {
  const oauthRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  if (!oauthRequest.clientId) {
    return c.text("Invalid OAuth client", 400);
  }

  const state = crypto.randomUUID();
  await c.env.OAUTH_KV.put(`${STATE_PREFIX}${state}`, JSON.stringify(oauthRequest), {
    expirationTtl: STATE_TTL_SECONDS
  });

  const stateHash = await signState(state, c.env.COOKIE_ENCRYPTION_KEY);
  const callbackUrl = new URL("/callback", c.req.url).href;
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", c.env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.href,
      "Set-Cookie": `${STATE_COOKIE}=${stateHash}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}`
    }
  });
});

app.get("/callback", async (c) => {
  const state = c.req.query("state");
  const code = c.req.query("code");
  if (!state || !code) {
    return c.text("Missing OAuth state or code", 400);
  }

  const cookieHash = getCookie(c.req.raw, STATE_COOKIE);
  if (!cookieHash || cookieHash !== (await signState(state, c.env.COOKIE_ENCRYPTION_KEY))) {
    return c.text("Invalid OAuth state", 400);
  }

  const stored = await c.env.OAUTH_KV.get(`${STATE_PREFIX}${state}`);
  if (!stored) {
    return c.text("OAuth state expired or already used", 400);
  }
  await c.env.OAUTH_KV.delete(`${STATE_PREFIX}${state}`);

  let oauthRequest: AuthRequest;
  try {
    oauthRequest = JSON.parse(stored) as AuthRequest;
  } catch {
    return c.text("Invalid stored OAuth request", 500);
  }

  const callbackUrl = new URL("/callback", c.req.url).href;
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl
    })
  });

  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !tokenBody.access_token) {
    console.error("GitHub token exchange failed", tokenBody.error, tokenBody.error_description);
    return c.text("GitHub authentication failed", 502);
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenBody.access_token}`,
      "User-Agent": "artificial-analysis-mcp-worker",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (!userResponse.ok) {
    return c.text("Could not read the authenticated GitHub account", 502);
  }

  const user = (await userResponse.json()) as {
    login: string;
    name: string | null;
    email: string | null;
  };

  if (user.login.toLowerCase() !== c.env.ALLOWED_GITHUB_USERNAME.trim().toLowerCase()) {
    return c.text("This GitHub account is not allowed to use this MCP server", 403);
  }

  const props: AuthProps = {
    login: user.login,
    name: user.name,
    email: user.email
  };

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthRequest,
    userId: user.login,
    metadata: { label: user.login },
    scope: oauthRequest.scope,
    props
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": `${STATE_COOKIE}=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0`
    }
  });
});

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const [key, ...valueParts] = item.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return null;
}

async function signState(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export { app as AuthHandler };
