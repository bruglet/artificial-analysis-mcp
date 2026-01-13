# Artificial Analysis MCP Server

An MCP (Model Context Protocol) server that provides LLM model pricing, speed metrics, and benchmark scores from [Artificial Analysis](https://artificialanalysis.ai).

## Features

- Get real-time pricing for 300+ LLM models (input/output/blended rates)
- Compare speed metrics (tokens/sec, time to first token)
- Access benchmark scores (Intelligence Index, Coding Index, MMLU-Pro, GPQA, and more)
- Filter by provider (OpenAI, Anthropic, Google, etc.)
- Sort by any metric

## Installation

### Claude Code

```bash
claude mcp add artificial-analysis -e AA_API_KEY=your-key -- npx -y artificial-analysis-mcp
```

Or install from GitHub:

```bash
claude /mcp add https://github.com/davidhariri/artificial-analysis-mcp
```

### Manual Configuration

Add to your Claude settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "artificial-analysis": {
      "command": "npx",
      "args": ["-y", "artificial-analysis-mcp"],
      "env": {
        "AA_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `AA_API_KEY` | Yes | Your Artificial Analysis API key |

Get your API key at [artificialanalysis.ai](https://artificialanalysis.ai).

## Tools

### `list_models`

List all available LLM models with optional filtering and sorting.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `creator` | string | No | Filter by model creator (e.g., "OpenAI", "Anthropic") |
| `sort_by` | string | No | Sort field (see below) |
| `sort_order` | string | No | "asc" or "desc" (default: "desc") |
| `limit` | number | No | Maximum results to return |

**Sort fields:** `price_input`, `price_output`, `price_blended`, `speed`, `ttft`, `intelligence_index`, `coding_index`, `math_index`, `mmlu_pro`, `gpqa`, `release_date`

**Example usage:**
- "List the top 5 fastest models"
- "Show me Anthropic models sorted by price"
- "What are the cheapest models with high intelligence scores?"

### `get_model`

Get detailed information about a specific model.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `model` | string | Yes | Model name or slug (e.g., "gpt-4o", "claude-4-5-sonnet") |

**Returns:** Complete model details including pricing, speed metrics, and all benchmark scores.

**Example usage:**
- "Get pricing for GPT-4o"
- "What are Claude 4.5 Sonnet's benchmark scores?"

## Model Data

Each model includes:

- **Pricing**: Input/output/blended rates per 1M tokens (USD)
- **Speed**: Output tokens per second, time to first token
- **Benchmarks**: Intelligence Index, Coding Index, Math Index, MMLU-Pro, GPQA, LiveCodeBench, and more

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
AA_API_KEY=your-key node dist/index.js
```

## License

MIT
