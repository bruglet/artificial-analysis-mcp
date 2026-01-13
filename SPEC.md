# Artificial Analysis MCP Server Specification

## Overview

A Model Context Protocol (MCP) server that wraps the [Artificial Analysis](https://artificialanalysis.ai) API to provide LLM model information including pricing, speed metrics, and benchmark scores.

## Server Details

- **Name**: `artificial-analysis`
- **Language**: TypeScript/Node.js
- **Transport**: stdio (standard MCP transport)

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AA_API_KEY` | Yes | Artificial Analysis API key |

### MCP Client Configuration Example

```json
{
  "mcpServers": {
    "artificial-analysis": {
      "command": "node",
      "args": ["/path/to/aa-mcp/dist/index.js"],
      "env": {
        "AA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## API Integration

### Base URL
```
https://artificialanalysis.ai/api/v2/data/llms/models
```

### Authentication
```
Header: x-api-key: <AA_API_KEY>
```

### Caching
No caching - always fetch fresh data from the API.

## Tools

### 1. `list_models`

List all available LLM models with optional filtering and sorting.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `creator` | string | No | Filter by model creator (e.g., "OpenAI", "Anthropic", "Google") |
| `sort_by` | string | No | Field to sort by (see sortable fields below) |
| `sort_order` | string | No | Sort order: "asc" or "desc" (default: "desc") |
| `limit` | number | No | Maximum number of results to return |

**Sortable Fields:**
- `price_input` - Price per 1M input tokens
- `price_output` - Price per 1M output tokens
- `price_blended` - Blended price (3:1 ratio)
- `speed` - Output tokens per second
- `ttft` - Time to first token
- `intelligence_index` - AA Intelligence Index
- `coding_index` - AA Coding Index
- `math_index` - AA Math Index
- `mmlu_pro` - MMLU Pro score
- `gpqa` - GPQA score
- `release_date` - Model release date

**Returns:** Array of model objects with key fields.

---

### 2. `get_model`

Get detailed information about a specific model.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `model` | string | Yes | Model name or slug (e.g., "claude-3-5-sonnet", "gpt-4o") |

**Returns:** Complete model object including:
- Basic info (name, slug, release date, creator)
- Pricing (input, output, blended)
- Speed metrics (tokens/sec, TTFT)
- All benchmark scores

---

## Data Model

### Model Object

```typescript
interface Model {
  id: string;
  name: string;
  slug: string;
  release_date: string | null;

  creator: {
    name: string;
    slug: string;
  };

  pricing: {
    input_per_1m: number | null;      // USD per 1M input tokens
    output_per_1m: number | null;     // USD per 1M output tokens
    blended_per_1m: number | null;    // USD per 1M tokens (3:1 ratio)
  };

  speed: {
    tokens_per_second: number | null;           // Median output tokens/sec
    time_to_first_token_ms: number | null;      // Median TTFT in ms
  };

  benchmarks: {
    intelligence_index: number | null;  // AA Intelligence Index
    coding_index: number | null;        // AA Coding Index
    math_index: number | null;          // AA Math Index
    mmlu_pro: number | null;
    gpqa: number | null;
    hle: number | null;
    livecodebench: number | null;
    scicode: number | null;
    math_500: number | null;
    aime: number | null;
    aime_25: number | null;
    ifbench: number | null;
    lcr: number | null;
    terminalbench_hard: number | null;
    tau2: number | null;
  };
}
```

## Project Structure

```
aa-mcp/
├── SPEC.md
├── package.json
├── tsconfig.json
├── .claude-plugin/
│   └── plugin.json       # Claude Code plugin manifest
├── .mcp.json             # MCP server config for Claude Code
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── api.ts            # Artificial Analysis API client
│   ├── tools.ts          # Tool implementations
│   └── types.ts          # TypeScript interfaces
└── dist/                 # Compiled output
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for TypeScript
- `zod` - Schema validation for tool parameters
- `typescript` - TypeScript compiler

## Error Handling

- Missing API key: Return clear error message about setting `AA_API_KEY`
- API errors: Pass through API error messages with status codes
- Invalid model: Return "Model not found" with suggestions if possible
- Invalid parameters: Return Zod validation errors

## Claude Code Plugin Configuration

To enable installation via `/mcp add`, the server includes Claude Code plugin configuration files.

### .claude-plugin/plugin.json

```json
{
  "name": "artificial-analysis",
  "description": "Get LLM model pricing, speed metrics, and benchmark scores from Artificial Analysis",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/yourusername/aa-mcp"
  },
  "repository": "https://github.com/yourusername/aa-mcp",
  "category": "ai-tools",
  "mcpServers": {
    "artificial-analysis": {
      "command": "npx",
      "args": ["-y", "aa-mcp"],
      "env": {
        "AA_API_KEY": "${AA_API_KEY}"
      }
    }
  }
}
```

### .mcp.json (for local development)

```json
{
  "mcpServers": {
    "artificial-analysis": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "AA_API_KEY": "${AA_API_KEY}"
      }
    }
  }
}
```

### Installation Methods

**Via npx (after npm publish):**
```bash
claude mcp add artificial-analysis -e AA_API_KEY=your-key -- npx -y aa-mcp
```

**Via GitHub (before npm publish):**
```bash
claude /mcp add https://github.com/yourusername/aa-mcp
```

**Manual configuration:**
Add to `~/.claude/settings.json` or project `.claude/settings.json`:
```json
{
  "mcpServers": {
    "artificial-analysis": {
      "command": "npx",
      "args": ["-y", "aa-mcp"],
      "env": {
        "AA_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Notes

- No compare_models tool - comparison logic is delegated to the LLM consumer
- All benchmark fields exposed for maximum flexibility
- Sorting supports both ascending and descending order
- Null values handled gracefully in sorting (placed at end)
