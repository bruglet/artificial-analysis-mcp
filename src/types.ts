export interface AAPagination {
  page: number;
  page_size: number;
  total_pages: number;
  has_more: boolean;
}

export interface AAFreeApiResponse {
  tier: string;
  intelligence_index_version: number;
  pagination: AAPagination;
  data: AAFreeModelRaw[];
}

export interface AAFreeModelRaw {
  id: string;
  name: string;
  slug: string;
  release_date: string | null;
  model_creator: {
    id: string;
    name: string;
  } | null;
  evaluations: {
    artificial_analysis_intelligence_index: number | null;
    artificial_analysis_coding_index: number | null;
    artificial_analysis_agentic_index: number | null;
  };
  artificial_analysis_intelligence_index_cost: {
    total_cost: number | null;
    cost_per_task: {
      total_cost: number | null;
    } | null;
  } | null;
  pricing: {
    price_1m_input_tokens: number | null;
    price_1m_output_tokens: number | null;
    price_1m_cache_hit_tokens: number | null;
    price_1m_cache_write_tokens: number | null;
  };
  performance: {
    median_output_tokens_per_second: number | null;
    median_time_to_first_token_seconds: number | null;
    median_time_to_first_answer_token_seconds: number | null;
    median_end_to_end_response_time_seconds: number | null;
  };
}

export interface AAApiResponse {
  status: number;
  prompt_options: {
    parallel_queries: number;
    prompt_length: number | string;
  };
  data: AAModelRaw[];
}

export interface AAModelRaw {
  id: string;
  name: string;
  slug: string;
  release_date: string | null;
  model_creator: {
    id: string;
    name: string;
    slug: string;
  };
  evaluations: {
    artificial_analysis_intelligence_index: number | null;
    artificial_analysis_coding_index: number | null;
    artificial_analysis_math_index: number | null;
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
  pricing: {
    price_1m_blended_3_to_1: number | null;
    price_1m_input_tokens: number | null;
    price_1m_output_tokens: number | null;
  };
  median_output_tokens_per_second: number | null;
  median_time_to_first_token_seconds: number | null;
  median_time_to_first_answer_token: number | null;
}

export interface Model {
  id: string;
  name: string;
  slug: string;
  release_date: string | null;
  creator: {
    id: string;
    name: string;
  } | null;
  pricing: {
    input_per_1m: number | null;
    output_per_1m: number | null;
    cache_hit_per_1m: number | null;
    cache_write_per_1m: number | null;
  };
  performance: {
    tokens_per_second: number | null;
    time_to_first_token_ms: number | null;
    time_to_first_answer_token_ms: number | null;
    end_to_end_response_time_ms: number | null;
  };
  benchmarks: {
    intelligence_index: number | null;
    coding_index: number | null;
    agentic_index: number | null;
  };
  intelligence_index_cost: {
    total: number | null;
    per_task: number | null;
  } | null;
}

export interface ModelsResponse {
  intelligence_index_version: number;
  models: Model[];
  warning?: string;
}

export type FreeSortField =
  | "price_input"
  | "price_output"
  | "speed"
  | "ttft"
  | "intelligence_index"
  | "coding_index"
  | "agentic_index"
  | "release_date";

export type LegacySortField = "price_blended" | "math_index" | "mmlu_pro" | "gpqa";

export type SortField = FreeSortField | LegacySortField;

export type SortOrder = "asc" | "desc";
