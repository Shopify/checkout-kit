import {E2EController, type E2ECommandTarget} from '../controller';
import type {BuyerIdentityMode} from '../../auth/types';

class E2ECommandTargetSpy implements E2ECommandTarget {
  calls: string[] = [];
  variantIdError: Error | null = null;
  addCartLineError: Error | null = null;

  async selectBuyerIdentityMode(mode: BuyerIdentityMode) {
    this.calls.push(`selectBuyerIdentityMode(${mode})`);
  }

  async resetCart() {
    this.calls.push('resetCart');
  }

  async variantId(productIndex: number) {
    this.calls.push(`variantId(atProductIndex: ${productIndex})`);

    if (this.variantIdError) {
      throw this.variantIdError;
    }

    return `variant-${productIndex}`;
  }

  async presentSignIn() {
    this.calls.push('presentSignIn');
  }

  async addCartLine(variantId: string, quantity: number) {
    this.calls.push(`addCartLine(${variantId}, ${quantity})`);

    if (this.addCartLineError) {
      throw this.addCartLineError;
    }
  }

  async showCart() {
    this.calls.push('showCart');
  }

  async report(failure: string) {
    this.calls.push(`report(${failure})`);
  }
}

function handle(path: string, target: E2ECommandTargetSpy) {
  return new E2EController(target).handle(
    `com.shopify.checkoutkit.reactnativedemo://e2e${path}`,
  );
}

describe('E2EController', () => {
  it('ignores links that are not control links', async () => {
    const target = new E2ECommandTargetSpy();

    const handled = await new E2EController(target).handle(
      'https://example.com/cart',
    );

    expect(handled).toBe(false);
    expect(target.calls).toEqual([]);
  });

  it('reports a parse failure', async () => {
    const target = new E2ECommandTargetSpy();

    const handled = await handle('/teleport', target);

    expect(handled).toBe(true);
    expect(target.calls).toEqual(['report(Unsupported e2e command)']);
  });

  it('resets the cart', async () => {
    const target = new E2ECommandTargetSpy();

    const handled = await handle('/reset', target);

    expect(handled).toBe(true);
    expect(target.calls).toEqual(['resetCart']);
  });

  it('seeds the cart from a variant id', async () => {
    const target = new E2ECommandTargetSpy();

    await handle(
      '/cart?variantId=gid://shopify/ProductVariant/1&quantity=3&buyerIdentityMode=hardcoded',
      target,
    );

    expect(target.calls).toEqual([
      'selectBuyerIdentityMode(hardcoded)',
      'resetCart',
      'addCartLine(gid://shopify/ProductVariant/1, 3)',
      'showCart',
    ]);
  });

  it('seeds the cart from a product index', async () => {
    const target = new E2ECommandTargetSpy();

    await handle('/cart?productIndex=2', target);

    expect(target.calls).toEqual([
      'resetCart',
      'variantId(atProductIndex: 2)',
      'addCartLine(variant-2, 1)',
      'showCart',
    ]);
  });

  it('selects the buyer identity mode before seeding because selecting it resets the cart', async () => {
    const target = new E2ECommandTargetSpy();

    await handle('/cart?productIndex=0&buyerIdentityMode=guest', target);

    expect(target.calls[0]).toBe('selectBuyerIdentityMode(guest)');
  });

  it('reports a seed failure and does not show the cart', async () => {
    const target = new E2ECommandTargetSpy();
    target.variantIdError = new Error('No product at index 9');

    await handle('/cart?productIndex=9', target);

    expect(target.calls).toEqual([
      'resetCart',
      'variantId(atProductIndex: 9)',
      'report(No product at index 9)',
    ]);
  });

  it('presents sign in', async () => {
    const target = new E2ECommandTargetSpy();

    await handle('/signIn', target);

    expect(target.calls).toEqual(['presentSignIn']);
  });
});
