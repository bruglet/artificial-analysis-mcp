import type { FreeSortField, LegacySortField, Model, SortField, SortOrder } from "./types";

export function isLegacySortField(field: SortField | undefined): field is LegacySortField {
  return field === "price_blended" || field === "math_index" || field === "mmlu_pro" || field === "gpqa";
}

export function findModel(models: Model[], query: string): Model | undefined {
  const normalizedQuery = query.toLowerCase();
  return (
    models.find((model) => model.slug.toLowerCase() === normalizedQuery) ??
    models.find((model) => model.slug.toLowerCase().includes(normalizedQuery)) ??
    models.find((model) => model.name.toLowerCase().includes(normalizedQuery))
  );
}

export function suggestModelSlugs(models: Model[], query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const prefix = normalizedQuery.slice(0, 3);
  return models
    .filter(
      (model) =>
        model.slug.toLowerCase().includes(prefix) ||
        model.name.toLowerCase().includes(prefix)
    )
    .slice(0, 5)
    .map((model) => model.slug);
}

export function filterModelsByCreator(models: Model[], creator: string): Model[] {
  const normalizedCreator = creator.toLowerCase();
  return models.filter((model) => model.creator?.name.toLowerCase().includes(normalizedCreator));
}

function getSortValue(
  model: Model,
  field: FreeSortField | LegacySortField,
  legacyValues?: ReadonlyMap<string, number | null>
): number | string | null {
  switch (field) {
    case "price_input":
      return model.pricing.input_per_1m;
    case "price_output":
      return model.pricing.output_per_1m;
    case "speed":
      return model.performance.tokens_per_second;
    case "ttft":
      return model.performance.time_to_first_token_ms;
    case "intelligence_index":
      return model.benchmarks.intelligence_index;
    case "coding_index":
      return model.benchmarks.coding_index;
    case "agentic_index":
      return model.benchmarks.agentic_index;
    case "release_date":
      return model.release_date;
    case "price_blended":
    case "math_index":
    case "mmlu_pro":
    case "gpqa":
      return legacyValues?.get(model.slug) ?? null;
  }
}

export function sortModels(
  models: Model[],
  field: SortField,
  order: SortOrder,
  legacyValues?: ReadonlyMap<string, number | null>
): Model[] {
  return [...models].sort((a, b) => {
    const aValue = getSortValue(a, field, legacyValues);
    const bValue = getSortValue(b, field, legacyValues);

    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    const comparison =
      typeof aValue === "string" && typeof bValue === "string"
        ? aValue.localeCompare(bValue)
        : (aValue as number) - (bValue as number);

    return order === "asc" ? comparison : -comparison;
  });
}

export async function sortWithLegacyFallback(
  models: Model[],
  field: LegacySortField,
  order: SortOrder,
  fetchValues: () => Promise<ReadonlyMap<string, number | null>>
): Promise<{ models: Model[]; warning?: string }> {
  try {
    const legacyValues = await fetchValues();
    return { models: sortModels(models, field, order, legacyValues) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown legacy API error";
    return {
      models,
      warning: `Legacy sort "${field}" was not applied; returning Free results in API order. ${message}`
    };
  }
}
