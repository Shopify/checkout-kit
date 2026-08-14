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
  private tail: Promise<void> = Promise.resolve();

  constructor(private target: E2ECommandTarget) {}

  setTarget(target: E2ECommandTarget) {
    this.target = target;
  }

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

    const target = this.target;
    await this.enqueue(() => this.perform(link, target));

    return true;
  }

  private async enqueue(command: () => Promise<void>) {
    const task = this.tail.then(command);
    this.tail = task.catch(() => undefined);
    await task;
  }

  private async perform(link: E2EControlLink, target: E2ECommandTarget) {
    try {
      switch (link.command) {
        case 'reset':
          await target.resetCart();
          break;
        case 'cart':
          await this.seedCart(link, target);
          break;
        case 'signIn':
          throw new Error('signIn is not implemented yet');
      }
    } catch (error) {
      await target.report(message(error));
    }
  }

  private async seedCart(
    command: E2ECartCommand,
    target: E2ECommandTarget,
  ) {
    if (command.buyerIdentityMode) {
      await target.selectBuyerIdentityMode(command.buyerIdentityMode);
    }

    await target.resetCart();

    const variantId =
      command.variantId ?? (await target.variantId(command.productIndex ?? 0));

    await target.addCartLine(variantId, command.quantity);
    await target.showCart();
  }
}
