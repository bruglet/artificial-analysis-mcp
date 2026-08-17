import type {
  AAApiResponse,
  AAFreeApiResponse,
  AAFreeModelRaw,
  AAModelRaw,
  Model,
  ModelsResponse,
  LegacySortField
} from "./types";

const FREE_API_BASE_URL = "https://artificialanalysis.ai/api/v2/language/models/free";
const LEGACY_API_URL = "https://artificialanalysis.ai/api/v2/data/llms/models";

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isFreeModel(value: unknown): value is AAFreeModelRaw {
  if (!isRecord(value)) return false;

  const creator = value.model_creator;
  const evaluations = value.evaluations;
  const cost = value.artificial_analysis_intelligence_index_cost;
  const costPerTask = isRecord(cost) ? cost.cost_per_task : undefined;
  const pricing = value.pricing;
  const performance = value.performance;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.release_date) &&
    (creator === null ||
      (isRecord(creator) &&
        typeof creator.id === "string" &&
        typeof creator.name === "string")) &&
    isRecord(evaluations) &&
    isNullableNumber(evaluations.artificial_analysis_intelligence_index) &&
    isNullableNumber(evaluations.artificial_analysis_coding_index) &&
    isNullableNumber(evaluations.artificial_analysis_agentic_index) &&
    (cost === null ||
      (isRecord(cost) &&
        isNullableNumber(cost.total_cost) &&
        (costPerTask === null ||
          (isRecord(costPerTask) && isNullableNumber(costPerTask.total_cost))))) &&
    isRecord(pricing) &&
    isNullableNumber(pricing.price_1m_input_tokens) &&
    isNullableNumber(pricing.price_1m_output_tokens) &&
    isNullableNumber(pricing.price_1m_cache_hit_tokens) &&
    isNullableNumber(pricing.price_1m_cache_write_tokens) &&
    isRecord(performance) &&
    isNullableNumber(performance.median_output_tokens_per_second) &&
    isNullableNumber(performance.median_time_to_first_token_seconds) &&
    isNullableNumber(performance.median_time_to_first_answer_token_seconds) &&
    isNullableNumber(performance.median_end_to_end_response_time_seconds)
  );
}

function parseFreeResponse(value: unknown): AAFreeApiResponse {
  if (!isRecord(value)) {
    throw new Error("Artificial Analysis returned an invalid response object");
  }

  const pagination = value.pagination;
  const data = value.data;

  if (
    typeof value.tier !== "string" ||
    typeof value.intelligence_index_version !== "number" ||
    !isRecord(pagination) ||
    !Number.isInteger(pagination.page) ||
    !Number.isInteger(pagination.page_size) ||
    !Number.isInteger(pagination.total_pages) ||
    typeof pagination.has_more !== "boolean" ||
    !Array.isArray(data) ||
    !data.every(isFreeModel)
  ) {
    throw new Error("Artificial Analysis returned an invalid Free response shape");
  }

  return value as unknown as AAFreeApiResponse;
}

function isLegacyModel(value: unknown): value is AAModelRaw {
  if (!isRecord(value)) return false;

  const creator = value.model_creator;
  const evaluations = value.evaluations;
  const pricing = value.pricing;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.release_date) &&
    isRecord(creator) &&
    typeof creator.id === "string" &&
    typeof creator.name === "string" &&
    typeof creator.slug === "string" &&
    isRecord(evaluations) &&
    Object.keys(evaluations).every((key) => isNullableNumber(evaluations[key])) &&
    isRecord(pricing) &&
    isNullableNumber(pricing.price_1m_blended_3_to_1) &&
    isNullableNumber(pricing.price_1m_input_tokens) &&
    isNullableNumber(pricing.price_1m_output_tokens) &&
    isNullableNumber(value.median_output_tokens_per_second) &&
    isNullableNumber(value.median_time_to_first_token_seconds) &&
    isNullableNumber(value.median_time_to_first_answer_token)
  );
}

function parseLegacyResponse(value: unknown): AAApiResponse {
  if (!isRecord(value)) {
    throw new Error("Artificial Analysis returned an invalid legacy response object");
  }

  const promptOptions = value.prompt_options;
  const data = value.data;
  if (
    value.status !== 200 ||
    !isRecord(promptOptions) ||
    typeof promptOptions.parallel_queries !== "number" ||
    (typeof promptOptions.prompt_length !== "number" &&
      typeof promptOptions.prompt_length !== "string") ||
    !Array.isArray(data) ||
    !data.every(isLegacyModel)
  ) {
    throw new Error("Artificial Analysis returned an invalid legacy response shape");
  }

  return value as unknown as AAApiResponse;
}

function formatApiError(response: Response, payload: unknown): string {
  const parts = [`Artificial Analysis request failed: ${response.status}`];
  if (response.statusText) parts.push(response.statusText);

  if (isRecord(payload) && typeof payload.error === "string") {
    parts.push(payload.error);
    if (payload.details !== undefined) {
      parts.push(typeof payload.details === "string" ? payload.details : JSON.stringify(payload.details));
    }
  }

  const retryAfter = response.headers.get("Retry-After");
  const rateLimit = response.headers.get("X-RateLimit-Limit");
  const rateRemaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  if (retryAfter) parts.push(`retry after ${retryAfter}s`);
  if (rateLimit || rateRemaining) {
    parts.push(`rate limit remaining ${rateRemaining ?? "unknown"}/${rateLimit ?? "unknown"}`);
  }
  if (reset) parts.push(`rate limit resets at ${reset}`);

  return parts.join(" ");
}

async function fetchJson(url: string, apiKey: string): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": apiKey
    }
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    throw new Error(formatApiError(response, payload));
  }

  return payload;
}

function secondsToMilliseconds(value: number | null): number | null {
  return value === null ? null : value * 1000;
}

function transformFreeModel(raw: AAFreeModelRaw): Model {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    release_date: raw.release_date,
    creator: raw.model_creator
      ? {
          id: raw.model_creator.id,
          name: raw.model_creator.name
        }
      : null,
    pricing: {
      input_per_1m: raw.pricing.price_1m_input_tokens,
      output_per_1m: raw.pricing.price_1m_output_tokens,
      cache_hit_per_1m: raw.pricing.price_1m_cache_hit_tokens,
      cache_write_per_1m: raw.pricing.price_1m_cache_write_tokens
    },
    performance: {
      tokens_per_second: raw.performance.median_output_tokens_per_second,
      time_to_first_token_ms: secondsToMilliseconds(raw.performance.median_time_to_first_token_seconds),
      time_to_first_answer_token_ms: secondsToMilliseconds(
        raw.performance.median_time_to_first_answer_token_seconds
      ),
      end_to_end_response_time_ms: secondsToMilliseconds(
        raw.performance.median_end_to_end_response_time_seconds
      )
    },
    benchmarks: {
      intelligence_index: raw.evaluations.artificial_analysis_intelligence_index,
      coding_index: raw.evaluations.artificial_analysis_coding_index,
      agentic_index: raw.evaluations.artificial_analysis_agentic_index
    },
    intelligence_index_cost: raw.artificial_analysis_intelligence_index_cost
      ? {
          total: raw.artificial_analysis_intelligence_index_cost.total_cost,
          per_task: raw.artificial_analysis_intelligence_index_cost.cost_per_task?.total_cost ?? null
        }
      : null
  };
}

export async function fetchFreeModels(apiKey: string): Promise<ModelsResponse> {
  const models: Model[] = [];
  let page = 1;
  let intelligenceIndexVersion: number | undefined;

  while (true) {
    const payload = await fetchJson(`${FREE_API_BASE_URL}?page=${page}`, apiKey);
    const response = parseFreeResponse(payload);

    if (intelligenceIndexVersion === undefined) {
      intelligenceIndexVersion = response.intelligence_index_version;
    } else if (intelligenceIndexVersion !== response.intelligence_index_version) {
      throw new Error("Artificial Analysis changed the Intelligence Index version between pages");
    }

    models.push(...response.data.map(transformFreeModel));

    if (!response.pagination.has_more) break;
    if (response.pagination.page >= response.pagination.total_pages) {
      throw new Error("Artificial Analysis returned inconsistent pagination metadata");
    }
    page = response.pagination.page + 1;
  }

  if (intelligenceIndexVersion === undefined) {
    throw new Error("Artificial Analysis returned no Free model pages");
  }

  return {
    intelligence_index_version: intelligenceIndexVersion,
    models
  };
}

function getLegacySortValue(raw: AAModelRaw, field: LegacySortField): number | null {
  switch (field) {
    case "price_blended":
      return raw.pricing.price_1m_blended_3_to_1;
    case "math_index":
      return raw.evaluations.artificial_analysis_math_index;
    case "mmlu_pro":
      return raw.evaluations.mmlu_pro;
    case "gpqa":
      return raw.evaluations.gpqa;
  }
}

export async function fetchLegacySortValues(
  apiKey: string,
  field: LegacySortField
): Promise<Map<string, number | null>> {
  const response = parseLegacyResponse(await fetchJson(LEGACY_API_URL, apiKey));
  return new Map(response.data.map((model) => [model.slug, getLegacySortValue(model, field)]));
}

export const API_URLS = {
  free: FREE_API_BASE_URL,
  legacy: LEGACY_API_URL
} as const;
