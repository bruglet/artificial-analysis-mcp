import { env } from "cloudflare:workers";
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp/server";
import { z } from "zod";
import { fetchFreeModels, fetchLegacySortValues } from "./api";
import { AuthHandler } from "./auth-handler";
import type { AuthProps, WorkerEnv } from "./env";
import type { SortField, SortOrder } from "./types";
import {
  findModel,
  filterModelsByCreator,
  isLegacySortField,
  sortModels,
  sortWithLegacyFallback,
  suggestModelSlugs
} from "./model-tools";

const workerEnv = env as unknown as WorkerEnv;

const SERVER_INFO = {
  name: "artificial-analysis",
  title: "Artificial Analysis",
  version: "1.0.0",
  description:
    "LLM pricing, performance, and benchmark data from Artificial Analysis.",
  websiteUrl: "https://artificialanalysis.ai",
  icons: [
    {
      src: "https://artificial-analysis-mcp.ismind.workers.dev/icon.png",
      mimeType: "image/png",
      sizes: ["512x512"]
    }
  ]
};

function createServer() {
  const server = new McpServer(SERVER_INFO);

  server.registerTool(
    "list_models",
    {
      title: "List LLM Models",
      description:
        "Use this to compare, filter, or rank multiple LLMs by Artificial Analysis Free-tier pricing, performance, release date, and benchmark indices; it returns the Intelligence Index version and normalized model records. Use get_model instead for details about one known model. Legacy-only sorts are best effort and may return Free results in API order with a warning; unavailable metric values sort last.",
      inputSchema: {
        creator: z
          .string()
          .optional()
          .describe(
            "Optional case-insensitive creator-name substring, such as OpenAI, Anthropic, or Google. Use it for provider-specific requests; models with no creator data do not match."
          ),
        sort_by: z
          .enum([
            "price_input",
            "price_output",
            "price_blended",
            "speed",
            "ttft",
            "intelligence_index",
            "coding_index",
            "agentic_index",
            "math_index",
            "mmlu_pro",
            "gpqa",
            "release_date"
          ])
          .optional()
          .describe(
            "Metric used to rank models. price_input, price_output, speed, ttft, intelligence_index, coding_index, agentic_index, and release_date use current Free data; price_blended, math_index, mmlu_pro, and gpqa are legacy-only and may produce a warning instead of a sorted result. Omit to preserve API order."
          ),
        sort_order: z
          .enum(["asc", "desc"])
          .optional()
          .default("desc")
          .describe(
            "Sort direction: asc or desc (default desc). This is ignored when sort_by is omitted, and null metric values remain last in either direction."
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(
            "Optional integer from 1 to 100 applied after filtering and sorting. Use it for top-N requests; omit it to return every matching model."
          )
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ creator, sort_by, sort_order, limit }) => {
      try {
        const freeResponse = await fetchFreeModels(workerEnv.AA_API_KEY);
        let models = freeResponse.models;
        let warning: string | undefined;

        if (creator) {
          models = filterModelsByCreator(models, creator);
        }
        if (sort_by) {
          const sortField = sort_by as SortField;
          const sortOrder = (sort_order ?? "desc") as SortOrder;

          if (isLegacySortField(sortField)) {
            const legacyResult = await sortWithLegacyFallback(
              models,
              sortField,
              sortOrder,
              () => fetchLegacySortValues(workerEnv.AA_API_KEY, sortField)
            );
            models = legacyResult.models;
            warning = legacyResult.warning;
          } else {
            models = sortModels(models, sortField, sortOrder);
          }
        }
        if (limit) {
          models = models.slice(0, limit);
        }

        const result = {
          intelligence_index_version: freeResponse.intelligence_index_version,
          models,
          ...(warning ? { warning } : {})
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching models: ${message}` }]
        };
      }
    }
  );

  server.registerTool(
    "get_model",
    {
      title: "Get Model Details",
      description:
        "Use this when the user asks for Free-tier pricing, performance, release date, benchmarks, or Intelligence Index cost for one model; it returns the matched normalized model and Intelligence Index version. Prefer an exact slug from list_models when the model is ambiguous, and use list_models instead for comparisons or rankings. Partial slug and name matching is supported but may select the first match; a failed lookup returns suggested slugs.",
      inputSchema: {
        model: z
          .string()
          .min(1)
          .describe(
            "Non-empty model slug or name, such as gpt-4o. Prefer an exact slug obtained from list_models; partial slugs and names are accepted but can resolve to the first matching model."
          )
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ model }) => {
      try {
        const freeResponse = await fetchFreeModels(workerEnv.AA_API_KEY);
        const models = freeResponse.models;
        const found = findModel(models, model);

        if (!found) {
          const suggestions = suggestModelSlugs(models, model);

          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Model \"${model}\" not found.${suggestions.length ? ` Possible matches: ${suggestions.join(", ")}` : ""}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  intelligence_index_version: freeResponse.intelligence_index_version,
                  model: found
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching model: ${message}` }]
        };
      }
    }
  );

  server.registerTool(
    "whoami",
    {
      title: "Show Authenticated User",
      description:
        "Use this only when the user asks which GitHub account is authenticated or when diagnosing access to this private MCP server. It returns the current OAuth account context, or reports that no context is available; do not use it for Artificial Analysis model data.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const auth = getMcpAuthContext();
      const props = auth?.props as AuthProps | undefined;
      return {
        content: [
          {
            type: "text",
            text: props ? JSON.stringify(props, null, 2) : "No authentication context available"
          }
        ]
      };
    }
  );

  return server;
}

const mcpHandler = createMcpHandler(createServer);

async function addLegacyServerInfo(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  const originalText = await response.text();

  const patchMessage = (message: unknown): unknown => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("result" in message)
    ) {
      return message;
    }

    const rpcMessage = message as {
      result?: Record<string, unknown>;
    };

    if (!rpcMessage.result) return message;

    rpcMessage.result.serverInfo = SERVER_INFO;

    rpcMessage.result._meta = {
      ...(typeof rpcMessage.result._meta === "object"
        ? rpcMessage.result._meta
        : {}),
      "io.modelcontextprotocol/serverInfo": SERVER_INFO
    };

    return rpcMessage;
  };

  let patchedText = originalText;

  if (contentType.includes("application/json")) {
    patchedText = JSON.stringify(patchMessage(JSON.parse(originalText)));
  } else if (contentType.includes("text/event-stream")) {
    patchedText = originalText
      .split("\n")
      .map((line) => {
        if (!line.startsWith("data:")) return line;

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") return line;

        try {
          return `data: ${JSON.stringify(
            patchMessage(JSON.parse(data))
          )}`;
        } catch {
          return line;
        }
      })
      .join("\n");
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(patchedText, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

const apiHandler = {
  async fetch(
    request: Request,
    currentEnv: unknown,
    ctx: ExecutionContext
  ): Promise<Response> {
    let method: string | undefined;

    if (request.method === "POST") {
      try {
        const body = (await request.clone().json()) as {
          method?: string;
        };
        method = body.method;
      } catch {
        // Leave non-JSON requests untouched.
      }
    }

    const response = await mcpHandler(request, currentEnv, ctx);

    if (method === "initialize") {
      return addLegacyServerInfo(response);
    }

    return response;
  }
};

export default new OAuthProvider({
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  apiRoute: "/mcp",
  apiHandler,
  defaultHandler: {
    async fetch(request: Request, currentEnv: unknown, ctx: ExecutionContext) {
      return AuthHandler.fetch(request, currentEnv as WorkerEnv, ctx);
    }
  }
});
