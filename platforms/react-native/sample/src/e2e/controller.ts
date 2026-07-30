import type {BuyerIdentityMode} from '../auth/types';
import {
  parseControlLink,
  type E2ECartCommand,
  type E2EControlLink,
} from './controlLink';

export interface E2ECommandTarget {
  selectBuyerIdentityMode(mode: BuyerIdentityMode): Promise<void>;
  resetCart(): Promise<void>;
  variantId(productIndex: number): Promise<string>;
  addCartLine(variantId: string, quantity: number): Promise<void>;
  showCart(): Promise<void>;
  report(failure: string): Promise<void>;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export class E2EController {
  constructor(private readonly target: E2ECommandTarget) {}

  async handle(url: string): Promise<boolean> {
    let link: E2EControlLink | null;

    try {
      link = parseControlLink(url);
    } catch (error) {
      await this.target.report(message(error));
      return true;
    }

    if (!link) {
      return false;
    }

    await this.perform(link);

    return true;
  }

  private async perform(link: E2EControlLink) {
    try {
      switch (link.command) {
        case 'reset':
          await this.target.resetCart();
          break;
        case 'cart':
          await this.seedCart(link);
          break;
        case 'signIn':
          throw new Error('signIn is not implemented yet');
      }
    } catch (error) {
      await this.target.report(message(error));
    }
  }

  private async seedCart(command: E2ECartCommand) {
    if (command.buyerIdentityMode) {
      await this.target.selectBuyerIdentityMode(command.buyerIdentityMode);
    }

    await this.target.resetCart();

    const variantId =
      command.variantId ??
      (await this.target.variantId(command.productIndex ?? 0));

    await this.target.addCartLine(variantId, command.quantity);
    await this.target.showCart();
  }
}
