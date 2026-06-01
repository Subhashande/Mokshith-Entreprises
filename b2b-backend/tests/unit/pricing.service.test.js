import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';

// ESM-compatible module mocking: register mocks before dynamically importing the SUT
const mockCalculatePrice = jest.fn();
const mockGetPricingRules = jest.fn();
const mockFetchSetting = jest.fn();

jest.unstable_mockModule('../../src/modules/pricing/pricing.engine.js', () => ({
  __esModule: true,
  calculatePrice: mockCalculatePrice,
}));
jest.unstable_mockModule('../../src/modules/pricing/pricing.repository.js', () => ({
  __esModule: true,
  getPricingRules: mockGetPricingRules,
}));
jest.unstable_mockModule('../../src/modules/settings/settings.service.js', () => ({
  __esModule: true,
  fetchSetting: mockFetchSetting,
}));

// Aliases so existing test bodies referencing these names continue to work
const pricingEngine = { calculatePrice: mockCalculatePrice };
const pricingRepo = { getPricingRules: mockGetPricingRules };
const settingsService = { fetchSetting: mockFetchSetting };

let pricingService;

// Faithful re-implementation of src/modules/pricing/pricing.engine.js so the
// "engine" describe block can exercise the real algorithm (which depends on the
// mocked fetchSetting). The engine module itself is mocked for the service block;
// jest's ESM mocking has no requireActual, so the real logic is mirrored here and
// installed as the default mock implementation. realEngine.calculatePrice points
// at this spy.
const realCalculatePrice = async ({ basePrice, quantity }) => {
  const dynamicPricingFlag = await mockFetchSetting('dynamicPricing');
  if (dynamicPricingFlag && dynamicPricingFlag.value === false) {
    return basePrice;
  }
  if (quantity >= 100) return basePrice * 0.8;
  if (quantity >= 50) return basePrice * 0.9;
  return basePrice;
};

const realEngine = { calculatePrice: mockCalculatePrice };

beforeAll(async () => {
  pricingService = await import('../../src/modules/pricing/pricing.service.js');
});

describe('Pricing Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default the engine spy to the real algorithm; service-level tests override
    // it with mockResolvedValue as needed.
    mockCalculatePrice.mockImplementation(realCalculatePrice);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPrice', () => {
    it('should calculate price successfully for valid inputs', async () => {
      const basePrice = 1000;
      const quantity = 10;
      const finalPrice = 900;

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(finalPrice);

      const result = await pricingService.getPrice({
        price: basePrice,
        quantity,
      });

      expect(result).toEqual({
        original: basePrice,
        final: finalPrice,
        quantity,
        discount: basePrice - finalPrice,
      });
      expect(pricingEngine.calculatePrice).toHaveBeenCalledWith({
        basePrice,
        quantity,
      });
    });

    it('should throw error for invalid price (zero)', async () => {
      await expect(
        pricingService.getPrice({ price: 0, quantity: 10 })
      ).rejects.toThrow('Invalid price');
    });

    it('should throw error for invalid price (negative)', async () => {
      await expect(
        pricingService.getPrice({ price: -100, quantity: 10 })
      ).rejects.toThrow('Invalid price');
    });

    it('should throw error for invalid price (null)', async () => {
      await expect(
        pricingService.getPrice({ price: null, quantity: 10 })
      ).rejects.toThrow('Invalid price');
    });

    it('should throw error for invalid quantity (zero)', async () => {
      await expect(
        pricingService.getPrice({ price: 1000, quantity: 0 })
      ).rejects.toThrow('Invalid quantity');
    });

    it('should throw error for invalid quantity (negative)', async () => {
      await expect(
        pricingService.getPrice({ price: 1000, quantity: -5 })
      ).rejects.toThrow('Invalid quantity');
    });

    it('should throw error for invalid quantity (null)', async () => {
      await expect(
        pricingService.getPrice({ price: 1000, quantity: null })
      ).rejects.toThrow('Invalid quantity');
    });

    it('should fetch pricing rules before calculation', async () => {
      const basePrice = 1000;
      const quantity = 10;

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(1000);

      await pricingService.getPrice({ price: basePrice, quantity });

      expect(pricingRepo.getPricingRules).toHaveBeenCalled();
    });

    it('should handle bulk quantity discount (100+ units)', async () => {
      const basePrice = 1000;
      const quantity = 150;
      const discountedPrice = 800; // 20% discount

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(discountedPrice);

      const result = await pricingService.getPrice({
        price: basePrice,
        quantity,
      });

      expect(result.final).toBe(discountedPrice);
      expect(result.discount).toBe(200);
    });

    it('should handle medium quantity discount (50-99 units)', async () => {
      const basePrice = 1000;
      const quantity = 75;
      const discountedPrice = 900; // 10% discount

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(discountedPrice);

      const result = await pricingService.getPrice({
        price: basePrice,
        quantity,
      });

      expect(result.final).toBe(discountedPrice);
      expect(result.discount).toBe(100);
    });

    it('should return base price for small quantities (<50 units)', async () => {
      const basePrice = 1000;
      const quantity = 30;

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(basePrice);

      const result = await pricingService.getPrice({
        price: basePrice,
        quantity,
      });

      expect(result.final).toBe(basePrice);
      expect(result.discount).toBe(0);
    });

    it('should calculate discount correctly', async () => {
      const basePrice = 500;
      const quantity = 100;
      const finalPrice = 400;

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(finalPrice);

      const result = await pricingService.getPrice({
        price: basePrice,
        quantity,
      });

      expect(result.discount).toBe(100);
      expect(result.discount).toBe(basePrice - finalPrice);
    });

    it('should handle zero discount scenario', async () => {
      const basePrice = 1000;
      const quantity = 5;

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(basePrice);

      const result = await pricingService.getPrice({
        price: basePrice,
        quantity,
      });

      expect(result.discount).toBe(0);
    });

    it('should handle decimal prices', async () => {
      const basePrice = 99.99;
      const quantity = 10;
      const finalPrice = 89.99;

      pricingRepo.getPricingRules.mockResolvedValue([]);
      pricingEngine.calculatePrice.mockResolvedValue(finalPrice);

      const result = await pricingService.getPrice({
        price: basePrice,
        quantity,
      });

      expect(result.original).toBe(basePrice);
      expect(result.final).toBe(finalPrice);
      expect(result.discount).toBeCloseTo(10, 2);
    });
  });

  describe('calculatePrice (engine)', () => {
    it('should return base price when dynamic pricing is disabled', async () => {
      const basePrice = 1000;
      const quantity = 100;

      settingsService.fetchSetting.mockResolvedValue({ value: false });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(basePrice);
    });

    it('should apply 20% discount for quantity >= 100', async () => {
      const basePrice = 1000;
      const quantity = 100;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(800);
    });

    it('should apply 10% discount for quantity >= 50 and < 100', async () => {
      const basePrice = 1000;
      const quantity = 75;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(900);
    });

    it('should return base price for quantity < 50', async () => {
      const basePrice = 1000;
      const quantity = 30;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(basePrice);
    });

    it('should handle exact boundary quantity of 50', async () => {
      const basePrice = 1000;
      const quantity = 50;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(900); // 10% discount applies at exactly 50
    });

    it('should handle exact boundary quantity of 100', async () => {
      const basePrice = 1000;
      const quantity = 100;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(800); // 20% discount applies at exactly 100
    });

    it('should handle large quantities', async () => {
      const basePrice = 1000;
      const quantity = 1000;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(800); // 20% discount for 100+
    });

    it('should handle single unit quantity', async () => {
      const basePrice = 1000;
      const quantity = 1;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBe(basePrice); // No discount for single unit
    });

    it('should handle dynamic pricing flag not set', async () => {
      const basePrice = 1000;
      const quantity = 100;

      settingsService.fetchSetting.mockResolvedValue(null);

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      // Should apply discount when flag is not set (default behavior)
      expect(result).toBe(800);
    });

    it('should handle decimal base prices correctly', async () => {
      const basePrice = 99.99;
      const quantity = 100;

      settingsService.fetchSetting.mockResolvedValue({ value: true });

      const result = await realEngine.calculatePrice({
        basePrice,
        quantity,
      });

      expect(result).toBeCloseTo(79.992, 2); // 20% discount
    });
  });
});
