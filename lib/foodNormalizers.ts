// Pure normalization helpers for the two food-lookup sources. Imported by both
// `supabase/functions/food-lookup/index.ts` (via a relative path so Deno can
// resolve it) and by Jest tests under `__tests__/lib/`.
//
// Keep this file free of Node and Deno globals. No `process`, no `Deno`, no
// `fetch` calls, no platform imports. Pure functions only.

export type FoodLookupSource = 'usda' | 'off';

export interface NormalizedFood {
  source: FoodLookupSource;
  sourceId: string;
  name: string;
  brand: string | null;
  servingSize: string | null;
  kcalPerServing: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  imageUrl: string | null;
}

// ---------- USDA FoodData Central ----------

export interface UsdaNutrient {
  nutrientId: number;
  value: number;
  unitName?: string;
}

export interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  dataType?: string;
  foodNutrients?: UsdaNutrient[];
  labelNutrients?: {
    calories?: { value?: number };
    protein?: { value?: number };
    carbohydrates?: { value?: number };
    fat?: { value?: number };
  };
}

export const USDA_NUTRIENT = {
  KCAL: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
} as const;

function getNutrient(food: UsdaFood, id: number): number | null {
  const n = food.foodNutrients?.find((x) => x.nutrientId === id);
  return n && Number.isFinite(n.value) ? n.value : null;
}

function pickLabel(
  food: UsdaFood,
  key: 'protein' | 'carbohydrates' | 'fat',
  fallbackId: number
): number | null {
  const isBranded = food.dataType === 'Branded';
  const labelValue = food.labelNutrients?.[key]?.value;
  if (isBranded && typeof labelValue === 'number' && Number.isFinite(labelValue)) {
    return labelValue;
  }
  return getNutrient(food, fallbackId);
}

export function normalizeUsda(food: UsdaFood): NormalizedFood | null {
  // Branded foods report per-serving nutrition under `labelNutrients`. Foundation
  // / SR Legacy report per-100g under `foodNutrients`. Prefer label data when
  // present so the kcal we show matches what's on the package.
  const isBranded = food.dataType === 'Branded';

  const labelKcal = food.labelNutrients?.calories?.value;
  const kcalFromNutrients = getNutrient(food, USDA_NUTRIENT.KCAL);
  const kcal =
    isBranded && typeof labelKcal === 'number' && Number.isFinite(labelKcal)
      ? labelKcal
      : kcalFromNutrients;

  if (kcal == null || !Number.isFinite(kcal) || kcal <= 0) return null;

  const protein = pickLabel(food, 'protein', USDA_NUTRIENT.PROTEIN);
  const carbs = pickLabel(food, 'carbohydrates', USDA_NUTRIENT.CARBS);
  const fat = pickLabel(food, 'fat', USDA_NUTRIENT.FAT);

  let servingSize: string | null = null;
  if (food.servingSize && food.servingSizeUnit) {
    servingSize = `${food.servingSize} ${food.servingSizeUnit}`;
  } else if (!isBranded) {
    servingSize = '100 g';
  }

  return {
    source: 'usda',
    sourceId: String(food.fdcId),
    name: food.description,
    brand: food.brandName ?? food.brandOwner ?? null,
    servingSize,
    kcalPerServing: Math.round(kcal),
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    imageUrl: null,
  };
}

// ---------- Open Food Facts ----------

export interface OffNutriments {
  'energy-kcal_serving'?: number;
  'energy-kcal_100g'?: number;
  proteins_serving?: number;
  proteins_100g?: number;
  carbohydrates_serving?: number;
  carbohydrates_100g?: number;
  fat_serving?: number;
  fat_100g?: number;
}

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OffNutriments;
}

export interface OffProductResponse {
  status?: number;
  code?: string;
  product?: OffProduct;
}

function pickNumber(...candidates: (number | undefined)[]): number | null {
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  return null;
}

export function normalizeOff(
  body: OffProductResponse,
  barcode: string
): NormalizedFood | null {
  if (body.status !== 1 || !body.product) return null;
  const p = body.product;
  const n = p.nutriments ?? {};

  // Prefer per-serving values when OFF has them; fall back to per-100g.
  const kcal = pickNumber(n['energy-kcal_serving'], n['energy-kcal_100g']);
  if (kcal == null || kcal <= 0) return null;

  const protein = pickNumber(n.proteins_serving, n.proteins_100g);
  const carbs = pickNumber(n.carbohydrates_serving, n.carbohydrates_100g);
  const fat = pickNumber(n.fat_serving, n.fat_100g);

  // If we fell back to _100g everywhere, be honest about it in the serving label.
  const usingPer100g =
    n['energy-kcal_serving'] == null && n['energy-kcal_100g'] != null;
  const servingSize = usingPer100g
    ? '100 g'
    : p.serving_size && p.serving_size.trim() !== ''
      ? p.serving_size.trim()
      : null;

  const name =
    p.product_name_en?.trim() || p.product_name?.trim() || 'Unnamed product';

  return {
    source: 'off',
    sourceId: p.code ?? barcode,
    name,
    brand: p.brands?.split(',')[0]?.trim() || null,
    servingSize,
    kcalPerServing: Math.round(kcal),
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    imageUrl: p.image_front_url ?? p.image_url ?? null,
  };
}
