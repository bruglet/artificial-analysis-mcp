import { describe, expect, it } from "vitest";
import {
  findModel,
  filterModelsByCreator,
  isLegacySortField,
  sortModels,
  sortWithLegacyFallback,
  suggestModelSlugs
} from "../src/model-tools";
import type { FreeSortField } from "../src/types";
import { model } from "./fixtures";

describe("model sorting", () => {
  const models = [
    model("expensive", {
      input_per_1m: 2,
      output_per_1m: 4,
      intelligence_index: 90,
      coding_index: 80,
      agentic_index: 70
    }),
    model("cheap", {
      input_per_1m: 1,
      output_per_1m: 2,
      intelligence_index: 70,
      coding_index: 60,
      agentic_index: 50
    })
  ];

  it.each<FreeSortField>([
    "price_input",
    "price_output",
    "speed",
    "ttft",
    "intelligence_index",
    "coding_index",
    "agentic_index",
    "release_date"
  ])("supports the Free sort %s", (field) => {
    const sorted = sortModels(models, field, "asc");
    expect(sorted).toHaveLength(2);
  });

  it("sorts legacy values while retaining Free models", () => {
    const sorted = sortModels(
      models,
      "price_blended",
      "asc",
      new Map([
        ["expensive", 0.8],
        ["cheap", 0.2]
      ])
    );

    expect(sorted.map((item) => item.slug)).toEqual(["cheap", "expensive"]);
    expect(sorted[0]).not.toHaveProperty("pricing.blended_per_1m");
  });

  it("identifies only the four legacy sort inputs", () => {
    expect(isLegacySortField("price_blended")).toBe(true);
    expect(isLegacySortField("math_index")).toBe(true);
    expect(isLegacySortField("mmlu_pro")).toBe(true);
    expect(isLegacySortField("gpqa")).toBe(true);
    expect(isLegacySortField("agentic_index")).toBe(false);
  });

  it("keeps Free results when the legacy sort fails", async () => {
    const result = await sortWithLegacyFallback(models, "gpqa", "desc", async () => {
      throw new Error("legacy endpoint unavailable");
    });

    expect(result.models).toBe(models);
    expect(result.warning).toContain('Legacy sort "gpqa" was not applied');
    expect(result.warning).toContain("legacy endpoint unavailable");
  });

  it("finds exact, partial, and suggested model matches", () => {
    const candidates = [model("gpt-4o"), model("claude-3-7-sonnet")];

    expect(findModel(candidates, "GPT-4O")?.slug).toBe("gpt-4o");
    expect(findModel(candidates, "claude")?.slug).toBe("claude-3-7-sonnet");
    expect(findModel(candidates, "missing")).toBeUndefined();
    expect(suggestModelSlugs(candidates, "gpt")).toEqual(["gpt-4o"]);
  });

  it("filters creators without failing on models with no creator", () => {
    const candidates = [model("with-creator"), { ...model("without-creator"), creator: null }];

    expect(filterModelsByCreator(candidates, "example creator").map((item) => item.slug)).toEqual([
      "with-creator"
    ]);
    expect(filterModelsByCreator(candidates, "missing")).toEqual([]);
  });
});
