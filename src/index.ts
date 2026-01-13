#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ArtificialAnalysisAPI } from './api.js';
import type { Model, SortField, SortOrder } from './types.js';

// Get API key from environment
const apiKey = process.env.AA_API_KEY;
if (!apiKey) {
  console.error('Error: AA_API_KEY environment variable is required');
  process.exit(1);
}

const api = new ArtificialAnalysisAPI(apiKey);

// Create MCP server
const server = new McpServer({
  name: 'artificial-analysis',
  version: '1.0.0',
});

// Sort field mapping to model properties
function getSortValue(model: Model, field: SortField): number | string | null {
  switch (field) {
    case 'price_input':
      return model.pricing.input_per_1m;
    case 'price_output':
      return model.pricing.output_per_1m;
    case 'price_blended':
      return model.pricing.blended_per_1m;
    case 'speed':
      return model.speed.tokens_per_second;
    case 'ttft':
      return model.speed.time_to_first_token_ms;
    case 'intelligence_index':
      return model.benchmarks.intelligence_index;
    case 'coding_index':
      return model.benchmarks.coding_index;
    case 'math_index':
      return model.benchmarks.math_index;
    case 'mmlu_pro':
      return model.benchmarks.mmlu_pro;
    case 'gpqa':
      return model.benchmarks.gpqa;
    case 'release_date':
      return model.release_date;
    default:
      return null;
  }
}

function sortModels(models: Model[], sortBy: SortField, sortOrder: SortOrder): Model[] {
  return [...models].sort((a, b) => {
    const aVal = getSortValue(a, sortBy);
    const bVal = getSortValue(b, sortBy);

    // Handle nulls - push to end
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    // Compare values
    let comparison: number;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = (aVal as number) - (bVal as number);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

// Register list_models tool
server.registerTool(
  'list_models',
  {
    title: 'List LLM Models',
    description:
      'List all available LLM models from Artificial Analysis with pricing, speed, and benchmark data. Filter by creator (OpenAI, Anthropic, Google, etc.) and sort by price, speed, or benchmark scores.',
    inputSchema: {
      creator: z.string().optional().describe('Filter by model creator (e.g., "OpenAI", "Anthropic", "Google")'),
      sort_by: z
        .enum([
          'price_input',
          'price_output',
          'price_blended',
          'speed',
          'ttft',
          'intelligence_index',
          'coding_index',
          'math_index',
          'mmlu_pro',
          'gpqa',
          'release_date',
        ])
        .optional()
        .describe('Field to sort by'),
      sort_order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order (default: desc)'),
      limit: z.number().optional().describe('Maximum number of results to return'),
    },
  },
  async ({ creator, sort_by, sort_order, limit }) => {
    try {
      let models = await api.fetchModels();

      // Filter by creator if specified
      if (creator) {
        const creatorLower = creator.toLowerCase();
        models = models.filter((m) => m.creator.name.toLowerCase().includes(creatorLower));
      }

      // Sort if specified
      if (sort_by) {
        models = sortModels(models, sort_by, sort_order || 'desc');
      }

      // Limit results if specified
      if (limit && limit > 0) {
        models = models.slice(0, limit);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(models, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error fetching models: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register get_model tool
server.registerTool(
  'get_model',
  {
    title: 'Get Model Details',
    description:
      'Get detailed information about a specific LLM model including pricing (input/output/blended per 1M tokens), speed metrics (tokens/sec, TTFT), and benchmark scores (Intelligence Index, Coding Index, MMLU-Pro, GPQA, etc.).',
    inputSchema: {
      model: z.string().describe('Model name or slug (e.g., "claude-4-5-sonnet", "gpt-4o")'),
    },
  },
  async ({ model }) => {
    try {
      const models = await api.fetchModels();
      const searchLower = model.toLowerCase();

      // Find by exact slug match first, then by name contains
      const found =
        models.find((m) => m.slug.toLowerCase() === searchLower) ||
        models.find((m) => m.slug.toLowerCase().includes(searchLower)) ||
        models.find((m) => m.name.toLowerCase().includes(searchLower));

      if (!found) {
        // Get similar models for suggestions
        const similar = models
          .filter(
            (m) =>
              m.slug.toLowerCase().includes(searchLower.slice(0, 3)) ||
              m.name.toLowerCase().includes(searchLower.slice(0, 3))
          )
          .slice(0, 5)
          .map((m) => m.slug);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Model "${model}" not found.${similar.length > 0 ? ` Did you mean: ${similar.join(', ')}?` : ''}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(found, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error fetching model: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
