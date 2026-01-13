import type { AAApiResponse, AAModelRaw, Model } from './types.js';

const API_BASE_URL = 'https://artificialanalysis.ai/api/v2/data/llms/models';

export class ArtificialAnalysisAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchModels(): Promise<Model[]> {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AAApiResponse;

    if (data.status !== 200) {
      throw new Error(`API returned error status: ${data.status}`);
    }

    return data.data.map(transformModel);
  }
}

function transformModel(raw: AAModelRaw): Model {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    release_date: raw.release_date,
    creator: {
      name: raw.model_creator.name,
      slug: raw.model_creator.slug,
    },
    pricing: {
      input_per_1m: raw.pricing.price_1m_input_tokens,
      output_per_1m: raw.pricing.price_1m_output_tokens,
      blended_per_1m: raw.pricing.price_1m_blended_3_to_1,
    },
    speed: {
      tokens_per_second: raw.median_output_tokens_per_second,
      time_to_first_token_ms: raw.median_time_to_first_token_seconds
        ? raw.median_time_to_first_token_seconds * 1000
        : null,
    },
    benchmarks: {
      intelligence_index: raw.evaluations.artificial_analysis_intelligence_index,
      coding_index: raw.evaluations.artificial_analysis_coding_index,
      math_index: raw.evaluations.artificial_analysis_math_index,
      mmlu_pro: raw.evaluations.mmlu_pro,
      gpqa: raw.evaluations.gpqa,
      hle: raw.evaluations.hle,
      livecodebench: raw.evaluations.livecodebench,
      scicode: raw.evaluations.scicode,
      math_500: raw.evaluations.math_500,
      aime: raw.evaluations.aime,
      aime_25: raw.evaluations.aime_25,
      ifbench: raw.evaluations.ifbench,
      lcr: raw.evaluations.lcr,
      terminalbench_hard: raw.evaluations.terminalbench_hard,
      tau2: raw.evaluations.tau2,
    },
  };
}
