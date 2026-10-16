// Uses the protocol package's TypeScript types the way the web component and apps do. It must keep
// type-checking after an additive protocol change.
import type {
  Checkout,
  CheckoutStatus,
  FulfillmentDestination,
  InstrumentsChangeResultUcp,
  Message,
  ReadyResult,
} from '../../languages/typescript/src/index';

export function describeStatus(status: CheckoutStatus): string {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'canceled':
      return 'canceled';
    default:
      return 'open';
  }
}

export function isBlocking(messages: readonly Message[] | undefined): boolean {
  return (messages ?? []).some(message => message.type === 'error' && message.severity === 'unrecoverable');
}

export function firstTitle(checkout: Checkout): string | undefined {
  return checkout.lineItems[0]?.item.title;
}

const ucp: InstrumentsChangeResultUcp = {status: 'success', version: '2026-08-25'};

export const ready: ReadyResult = {ucp, continueUrl: 'https://example.com/checkout'};

export const destination: FulfillmentDestination = {
  id: 'dest-1',
  streetAddress: '1 Main St',
  postalCode: 'K1A 0B1',
  address: {addressCountry: 'CA'},
};
