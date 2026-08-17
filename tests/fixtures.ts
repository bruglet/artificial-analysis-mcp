import type { AAFreeModelRaw, AAModelRaw, Model } from "../src/types";

export function freeModel(
  slug: string,
  overrides: Partial<Pick<AAFreeModelRaw, "name" | "release_date">> = {}
): AAFreeModelRaw {
  return {
    id: `${slug}-id`,
    name: overrides.name ?? slug,
    slug,
    release_date: overrides.release_date ?? "2025-01-01",
    model_creator: {
      id: "creator-id",
      name: "Example Creator"
    },
    evaluations: {
      artificial_analysis_intelligence_index: 80,
      artificial_analysis_coding_index: 70,
      artificial_analysis_agentic_index: 60
    },
    artificial_analysis_intelligence_index_cost: {
      total_cost: 20,
      cost_per_task: {
        total_cost: 0.2
      }
    },
    pricing: {
      price_1m_input_tokens: 1,
      price_1m_output_tokens: 2,
      price_1m_cache_hit_tokens: 0.1,
      price_1m_cache_write_tokens: 0.3
    },
    performance: {
      median_output_tokens_per_second: 100,
      median_time_to_first_token_seconds: 0.5,
      median_time_to_first_answer_token_seconds: 1.5,
      median_end_to_end_response_time_seconds: 2.5
    }
  };
}

export function freeResponse(
  page: number,
  data: AAFreeModelRaw[],
  hasMore: boolean,
  totalPages: number = hasMore ? 2 : 1
) {
  return {
    tier: "free",
    intelligence_index_version: 4.1,
    pagination: {
      page,
      page_size: data.length,
      total_pages: totalPages,
      has_more: hasMore
    },
    data
  };
}

export function legacyModel(
  slug: string,
  values: { blended: number | null; math: number | null; mmlu: number | null; gpqa: number | null }
): AAModelRaw {
  return {
    id: `${slug}-id`,
    name: slug,
    slug,
    release_date: "2025-01-01",
    model_creator: {
      id: "creator-id",
      name: "Example Creator",
      slug: "example-creator"
    },
    evaluations: {
      artificial_analysis_intelligence_index: 80,
      artificial_analysis_coding_index: 70,
      artificial_analysis_math_index: values.math,
      mmlu_pro: values.mmlu,
      gpqa: values.gpqa,
      hle: null,
      livecodebench: null,
      scicode: null,
      math_500: null,
      aime: null,
      aime_25: null,
      ifbench: null,
      lcr: null,
      terminalbench_hard: null,
      tau2: null
    },
    pricing: {
      price_1m_blended_3_to_1: values.blended,
      price_1m_input_tokens: 1,
      price_1m_output_tokens: 2
    },
    median_output_tokens_per_second: 100,
    median_time_to_first_token_seconds: 0.5,
    median_time_to_first_answer_token: 1.5
  };
}

export function model(slug: string, values: Partial<Model["pricing"] & Model["benchmarks"]> = {}): Model {
  return {
    id: `${slug}-id`,
    name: slug,
    slug,
    release_date: "2025-01-01",
    creator: {
      id: "creator-id",
      name: "Example Creator"
    },
    pricing: {
      input_per_1m: values.input_per_1m ?? 1,
      output_per_1m: values.output_per_1m ?? 2,
      cache_hit_per_1m: values.cache_hit_per_1m ?? 0.1,
      cache_write_per_1m: values.cache_write_per_1m ?? 0.3
    },
    performance: {
      tokens_per_second: 100,
      time_to_first_token_ms: 500,
      time_to_first_answer_token_ms: 1500,
      end_to_end_response_time_ms: 2500
    },
    benchmarks: {
      intelligence_index: values.intelligence_index ?? 80,
      coding_index: values.coding_index ?? 70,
      agentic_index: values.agentic_index ?? 60
    },
    intelligence_index_cost: {
      total: 20,
      per_task: 0.2
    }
  };
}
