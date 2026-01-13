// Raw API response types from Artificial Analysis
export interface AAApiResponse {
  status: number;
  prompt_options: {
    parallel_queries: number;
    prompt_length: number;
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

// Transformed model type for our API
export interface Model {
  id: string;
  name: string;
  slug: string;
  release_date: string | null;
  creator: {
    name: string;
    slug: string;
  };
  pricing: {
    input_per_1m: number | null;
    output_per_1m: number | null;
    blended_per_1m: number | null;
  };
  speed: {
    tokens_per_second: number | null;
    time_to_first_token_ms: number | null;
  };
  benchmarks: {
    intelligence_index: number | null;
    coding_index: number | null;
    math_index: number | null;
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

// Sort field mapping
export type SortField =
  | 'price_input'
  | 'price_output'
  | 'price_blended'
  | 'speed'
  | 'ttft'
  | 'intelligence_index'
  | 'coding_index'
  | 'math_index'
  | 'mmlu_pro'
  | 'gpqa'
  | 'release_date';

export type SortOrder = 'asc' | 'desc';
