import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFreeModels, fetchLegacySortValues } from "../src/api";
import type { AAFreeModelRaw } from "../src/types";
import { freeModel, freeResponse, legacyModel } from "./fixtures";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init
  });
}

describe("fetchFreeModels", () => {
  it("fetches every page and transforms the Free response", async () => {
    const first = freeModel("first-model");
    const second = freeModel("second-model", { name: "Second Model" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(freeResponse(1, [first], true)))
      .mockResolvedValueOnce(jsonResponse(freeResponse(2, [second], false, 2)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFreeModels("test-key");

    expect(result.intelligence_index_version).toBe(4.1);
    expect(result.models).toHaveLength(2);
    expect(result.models[0]).toMatchObject({
      id: "first-model-id",
      creator: { id: "creator-id", name: "Example Creator" },
      pricing: {
        input_per_1m: 1,
        output_per_1m: 2,
        cache_hit_per_1m: 0.1,
        cache_write_per_1m: 0.3
      },
      performance: {
        tokens_per_second: 100,
        time_to_first_token_ms: 500,
        time_to_first_answer_token_ms: 1500,
        end_to_end_response_time_ms: 2500
      },
      benchmarks: {
        intelligence_index: 80,
        coding_index: 70,
        agentic_index: 60
      },
      intelligence_index_cost: { total: 20, per_task: 0.2 }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://artificialanalysis.ai/api/v2/language/models/free?page=1",
      { method: "GET", headers: { "x-api-key": "test-key" } }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://artificialanalysis.ai/api/v2/language/models/free?page=2",
      { method: "GET", headers: { "x-api-key": "test-key" } }
    );
  });

  it("preserves null metrics and rejects malformed responses", async () => {
    const raw = freeModel("null-model");
    raw.release_date = null;
    raw.pricing.price_1m_cache_hit_tokens = null;
    raw.performance.median_time_to_first_answer_token_seconds = null;
    raw.evaluations.artificial_analysis_agentic_index = null;
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(freeResponse(1, [raw], false)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFreeModels("test-key");
    expect(result.models[0]).toMatchObject({
      release_date: null,
      pricing: { cache_hit_per_1m: null },
      performance: { time_to_first_answer_token_ms: null },
      benchmarks: { agentic_index: null }
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ tier: "free", data: [] }));
    await expect(fetchFreeModels("test-key")).rejects.toThrow("invalid Free response shape");
  });

  it("preserves a null creator", async () => {
    const raw = freeModel("null-creator");
    raw.model_creator = null;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(freeResponse(1, [raw], false))));

    const result = await fetchFreeModels("test-key");

    expect(result.models[0].creator).toBeNull();
  });

  it("preserves a null Intelligence Index cost object", async () => {
    const raw = freeModel("null-cost");
    raw.artificial_analysis_intelligence_index_cost = null;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(freeResponse(1, [raw], false))));

    const result = await fetchFreeModels("test-key");

    expect(result.models[0].intelligence_index_cost).toBeNull();
  });

  it("preserves a null per-task Intelligence Index cost", async () => {
    const raw = freeModel("null-per-task-cost");
    raw.artificial_analysis_intelligence_index_cost!.cost_per_task = null;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(freeResponse(1, [raw], false))));

    const result = await fetchFreeModels("test-key");

    expect(result.models[0].intelligence_index_cost).toEqual({ total: 20, per_task: null });
  });

  it.each(["creator", "cost"])("rejects malformed nullable %s containers", async (field) => {
    const raw = freeModel(`malformed-${field}`);
    if (field === "creator") {
      raw.model_creator = { id: "creator-id" } as AAFreeModelRaw["model_creator"];
    } else {
      raw.artificial_analysis_intelligence_index_cost = {
        total_cost: "not-a-number",
        cost_per_task: null
      } as unknown as AAFreeModelRaw["artificial_analysis_intelligence_index_cost"];
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(freeResponse(1, [raw], false))));

    await expect(fetchFreeModels("test-key")).rejects.toThrow("invalid Free response shape");
  });

  it("surfaces structured API and rate-limit errors", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(
        { error: "Daily quota exhausted", details: { scope: "organization" } },
        {
          status: 429,
          statusText: "Too Many Requests",
          headers: {
            "Retry-After": "3600",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "1770000000"
          }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFreeModels("test-key")).rejects.toThrow(
      "Artificial Analysis request failed: 429 Too Many Requests Daily quota exhausted {\"scope\":\"organization\"} retry after 3600s rate limit remaining 0/100 rate limit resets at 1770000000"
    );
  });

  it("surfaces invalid-key errors", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ error: "Invalid API key" }, { status: 401, statusText: "Unauthorized" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFreeModels("test-key")).rejects.toThrow(
      "Artificial Analysis request failed: 401 Unauthorized Invalid API key"
    );
  });
});

describe("fetchLegacySortValues", () => {
  it("returns only the requested legacy sort values", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        status: 200,
        prompt_options: { parallel_queries: 1, prompt_length: "medium" },
        data: [
          legacyModel("first-model", { blended: 0.5, math: 90, mmlu: 80, gpqa: 70 }),
          legacyModel("second-model", { blended: 0.2, math: 60, mmlu: 50, gpqa: 40 })
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const values = await fetchLegacySortValues("test-key", "price_blended");

    expect(values).toEqual(
      new Map([
        ["first-model", 0.5],
        ["second-model", 0.2]
      ])
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://artificialanalysis.ai/api/v2/data/llms/models",
      { method: "GET", headers: { "x-api-key": "test-key" } }
    );
  });
});
