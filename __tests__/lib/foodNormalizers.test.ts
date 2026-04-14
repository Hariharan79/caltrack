import {
  normalizeUsda,
  normalizeOff,
  type UsdaFood,
  type OffProductResponse,
} from '@/lib/foodNormalizers';

describe('normalizeUsda', () => {
  describe('Branded foods', () => {
    const BRANDED: UsdaFood = {
      fdcId: 12345,
      description: 'Greek Yogurt, Plain',
      brandName: 'Chobani',
      brandOwner: 'Chobani LLC',
      dataType: 'Branded',
      servingSize: 170,
      servingSizeUnit: 'g',
      foodNutrients: [
        { nutrientId: 1008, value: 59 }, // kcal per 100g
        { nutrientId: 1003, value: 10 }, // protein per 100g
        { nutrientId: 1005, value: 3.6 }, // carbs per 100g
        { nutrientId: 1004, value: 0 }, // fat per 100g
      ],
      labelNutrients: {
        calories: { value: 100 },
        protein: { value: 17 },
        carbohydrates: { value: 6 },
        fat: { value: 0 },
      },
    };

    it('prefers labelNutrients (per-serving) over foodNutrients (per-100g)', () => {
      const result = normalizeUsda(BRANDED)!;
      expect(result.kcalPerServing).toBe(100);
      expect(result.proteinG).toBe(17);
      expect(result.carbsG).toBe(6);
      expect(result.fatG).toBe(0);
    });

    it('uses brandName as the brand and falls back to brandOwner', () => {
      expect(normalizeUsda(BRANDED)!.brand).toBe('Chobani');
      expect(
        normalizeUsda({ ...BRANDED, brandName: undefined })!.brand
      ).toBe('Chobani LLC');
    });

    it('formats serving size from servingSize + servingSizeUnit', () => {
      expect(normalizeUsda(BRANDED)!.servingSize).toBe('170 g');
    });

    it('falls back to foodNutrients kcal when label kcal is missing', () => {
      const noLabelKcal: UsdaFood = {
        ...BRANDED,
        labelNutrients: { protein: { value: 17 } },
      };
      expect(normalizeUsda(noLabelKcal)!.kcalPerServing).toBe(59);
    });
  });

  describe('Foundation foods', () => {
    const FOUNDATION: UsdaFood = {
      fdcId: 9999,
      description: 'Chicken, broilers or fryers, breast, raw',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientId: 1008, value: 165 },
        { nutrientId: 1003, value: 31 },
        { nutrientId: 1005, value: 0 },
        { nutrientId: 1004, value: 3.6 },
      ],
    };

    it('uses foodNutrients values directly', () => {
      const result = normalizeUsda(FOUNDATION)!;
      expect(result.kcalPerServing).toBe(165);
      expect(result.proteinG).toBe(31);
      expect(result.carbsG).toBe(0);
      expect(result.fatG).toBe(3.6);
    });

    it('defaults serving size to "100 g" when none is provided', () => {
      expect(normalizeUsda(FOUNDATION)!.servingSize).toBe('100 g');
    });

    it('reports null brand for unbranded foods', () => {
      expect(normalizeUsda(FOUNDATION)!.brand).toBeNull();
    });
  });

  describe('rejection cases', () => {
    it('returns null when kcal is missing', () => {
      expect(
        normalizeUsda({
          fdcId: 1,
          description: 'Mystery',
          dataType: 'Foundation',
          foodNutrients: [],
        })
      ).toBeNull();
    });

    it('returns null when kcal is zero', () => {
      expect(
        normalizeUsda({
          fdcId: 1,
          description: 'Water',
          dataType: 'Foundation',
          foodNutrients: [{ nutrientId: 1008, value: 0 }],
        })
      ).toBeNull();
    });

    it('returns null when kcal is negative (corrupt data)', () => {
      expect(
        normalizeUsda({
          fdcId: 1,
          description: 'Bad',
          dataType: 'Foundation',
          foodNutrients: [{ nutrientId: 1008, value: -5 }],
        })
      ).toBeNull();
    });
  });

  it('rounds kcal to the nearest whole calorie', () => {
    const food: UsdaFood = {
      fdcId: 1,
      description: 'Apple',
      dataType: 'Foundation',
      foodNutrients: [{ nutrientId: 1008, value: 52.4 }],
    };
    expect(normalizeUsda(food)!.kcalPerServing).toBe(52);
  });
});

describe('normalizeOff', () => {
  const FULL_PRODUCT: OffProductResponse = {
    status: 1,
    code: '737628064502',
    product: {
      code: '737628064502',
      product_name: 'Thai peanut noodle kit',
      product_name_en: 'Thai peanut noodle kit',
      brands: 'Simply Asia, House Foods',
      image_front_url: 'https://example.com/front.jpg',
      image_url: 'https://example.com/url.jpg',
      serving_size: '85 g',
      serving_quantity: 85,
      nutriments: {
        'energy-kcal_serving': 320,
        'energy-kcal_100g': 376,
        proteins_serving: 8,
        proteins_100g: 9.4,
        carbohydrates_serving: 60,
        carbohydrates_100g: 70.6,
        fat_serving: 5,
        fat_100g: 5.9,
      },
    },
  };

  it('returns null when status is 0 (product not found)', () => {
    expect(normalizeOff({ status: 0 }, '0000')).toBeNull();
  });

  it('returns null when product is missing', () => {
    expect(normalizeOff({ status: 1 }, '0000')).toBeNull();
  });

  it('uses per-serving nutriments when available', () => {
    const result = normalizeOff(FULL_PRODUCT, '737628064502')!;
    expect(result.kcalPerServing).toBe(320);
    expect(result.proteinG).toBe(8);
    expect(result.carbsG).toBe(60);
    expect(result.fatG).toBe(5);
    expect(result.servingSize).toBe('85 g');
  });

  it('falls back to per-100g and labels the serving accordingly', () => {
    const product: OffProductResponse = {
      status: 1,
      product: {
        code: '111',
        product_name: 'Plain something',
        nutriments: {
          'energy-kcal_100g': 250,
          proteins_100g: 12,
          carbohydrates_100g: 30,
          fat_100g: 8,
        },
      },
    };
    const result = normalizeOff(product, '111')!;
    expect(result.kcalPerServing).toBe(250);
    expect(result.servingSize).toBe('100 g');
  });

  it('takes the first brand when brands is a comma-separated list', () => {
    expect(normalizeOff(FULL_PRODUCT, '737628064502')!.brand).toBe(
      'Simply Asia'
    );
  });

  it('returns null brand when brands is missing or empty', () => {
    const product: OffProductResponse = {
      status: 1,
      product: {
        code: '1',
        product_name: 'Generic',
        nutriments: { 'energy-kcal_serving': 100 },
      },
    };
    expect(normalizeOff(product, '1')!.brand).toBeNull();
  });

  it('prefers product_name_en over product_name', () => {
    const product: OffProductResponse = {
      status: 1,
      product: {
        code: '1',
        product_name: 'Pâtes',
        product_name_en: 'Pasta',
        nutriments: { 'energy-kcal_serving': 200 },
      },
    };
    expect(normalizeOff(product, '1')!.name).toBe('Pasta');
  });

  it('falls back to "Unnamed product" when no name fields are present', () => {
    const product: OffProductResponse = {
      status: 1,
      product: {
        code: '1',
        nutriments: { 'energy-kcal_serving': 100 },
      },
    };
    expect(normalizeOff(product, '1')!.name).toBe('Unnamed product');
  });

  it('returns null when kcal is missing entirely', () => {
    const product: OffProductResponse = {
      status: 1,
      product: {
        code: '1',
        product_name: 'Air',
        nutriments: {},
      },
    };
    expect(normalizeOff(product, '1')).toBeNull();
  });

  it('returns null when kcal is zero or negative', () => {
    expect(
      normalizeOff(
        {
          status: 1,
          product: {
            code: '1',
            product_name: 'Water',
            nutriments: { 'energy-kcal_serving': 0 },
          },
        },
        '1'
      )
    ).toBeNull();
  });

  it('uses the barcode arg as sourceId when product.code is missing', () => {
    const product: OffProductResponse = {
      status: 1,
      product: {
        product_name: 'No code',
        nutriments: { 'energy-kcal_serving': 100 },
      },
    };
    expect(normalizeOff(product, 'fallback-bc')!.sourceId).toBe('fallback-bc');
  });

  it('prefers image_front_url over image_url', () => {
    expect(normalizeOff(FULL_PRODUCT, '737628064502')!.imageUrl).toBe(
      'https://example.com/front.jpg'
    );
  });

  it('rounds kcal to a whole number', () => {
    const product: OffProductResponse = {
      status: 1,
      product: {
        code: '1',
        product_name: 'Chocolate',
        nutriments: { 'energy-kcal_serving': 547.6 },
      },
    };
    expect(normalizeOff(product, '1')!.kcalPerServing).toBe(548);
  });
});
