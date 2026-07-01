import {
  createStorefrontApiUrl,
  normalizeStorefrontDomain,
} from '../storefrontUrl';

describe('storefrontUrl', () => {
  describe('normalizeStorefrontDomain', () => {
    it('keeps a bare storefront domain unchanged', () => {
      expect(normalizeStorefrontDomain('shop.example.myshopify.com')).toBe(
        'shop.example.myshopify.com',
      );
    });

    it('removes an HTTPS scheme from the storefront domain', () => {
      expect(normalizeStorefrontDomain('https://shop.example.myshopify.com')).toBe(
        'shop.example.myshopify.com',
      );
    });

    it('removes trailing slashes from the storefront domain', () => {
      expect(normalizeStorefrontDomain('https://shop.example.myshopify.com/')).toBe(
        'shop.example.myshopify.com',
      );
    });
  });

  describe('createStorefrontApiUrl', () => {
    it('adds HTTPS to a bare storefront domain', () => {
      expect(
        createStorefrontApiUrl('shop.example.myshopify.com', '2026-04'),
      ).toBe('https://shop.example.myshopify.com/api/2026-04/graphql.json');
    });

    it('does not add HTTPS when the storefront domain already includes it', () => {
      expect(
        createStorefrontApiUrl('https://shop.example.myshopify.com', '2026-04'),
      ).toBe('https://shop.example.myshopify.com/api/2026-04/graphql.json');
    });
  });
});
