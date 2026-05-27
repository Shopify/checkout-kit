import {
  CheckoutProtocol,
  type Checkout,
  type ErrorResponse,
  type ProtocolHandlers,
} from '../src';
import {decodeProtocolPayload} from '../src/protocol';

const checkoutPayloadMethods = [
  CheckoutProtocol.complete,
  CheckoutProtocol.lineItemsChange,
  CheckoutProtocol.messagesChange,
  CheckoutProtocol.start,
  CheckoutProtocol.totalsChange,
] as const;

describe('CheckoutProtocol', () => {
  describe('runtime values', () => {
    it('exposes all public checkout protocol notification method strings', () => {
      expect(CheckoutProtocol).toEqual({
        complete: 'ec.complete',
        error: 'ec.error',
        lineItemsChange: 'ec.line_items.change',
        messagesChange: 'ec.messages.change',
        start: 'ec.start',
        totalsChange: 'ec.totals.change',
      });
      expect(CheckoutProtocol).not.toHaveProperty('buyerChange');
      expect(CheckoutProtocol).not.toHaveProperty('paymentChange');
    });
  });

  describe('wire payload decoding', () => {
    it('returns undefined for methods without a registered payload decoder', () => {
      expect(decodeProtocolPayload('ec.unknown', {})).toBeUndefined();
      expect(decodeProtocolPayload('ec.buyer.change', {})).toBeUndefined();
      expect(decodeProtocolPayload('ec.payment.change', {})).toBeUndefined();
    });

    it.each(checkoutPayloadMethods)(
      'converts %s checkout schema fields to camelCase while preserving dynamic map keys',
      method => {
        const decoded = decodeProtocolPayload(method, {
          id: 'checkout-123',
          currency: 'USD',
          status: 'incomplete',
          line_items: [],
          totals: [],
          links: [],
          ucp: {
            version: '2026-04-08',
            payment_handlers: {
              loyalty_gold: [
                {
                  id: 'handler-1',
                  version: '2026-04-08',
                  available_instruments: [
                    {
                      type: 'card',
                      constraints: {
                        merchant_defined_key: true,
                      },
                    },
                  ],
                },
              ],
              'com.example.loyalty_gold': [],
            },
          },
        });

        expect(decoded?.lineItems).toEqual([]);
        expect(decoded?.ucp.paymentHandlers).toHaveProperty('loyalty_gold');
        expect(
          Object.prototype.hasOwnProperty.call(
            decoded?.ucp.paymentHandlers,
            'com.example.loyalty_gold',
          ),
        ).toBe(true);
        const loyaltyHandlers = decoded?.ucp.paymentHandlers.loyalty_gold;
        expect(loyaltyHandlers).toBeDefined();
        const loyaltyHandler = loyaltyHandlers?.[0];
        expect(loyaltyHandler?.availableInstruments?.[0]?.constraints).toEqual({
          merchant_defined_key: true,
        });
        expect(loyaltyHandler).not.toHaveProperty('available_instruments');
      },
    );

    it('converts error schema fields to camelCase while preserving dynamic map keys', () => {
      const decoded = decodeProtocolPayload(CheckoutProtocol.error, {
        continue_url: 'https://example.test/recover',
        messages: [
          {
            content: 'Something went wrong',
            content_type: 'plain',
            type: 'error',
          },
        ],
        ucp: {
          version: '2026-04-08',
          status: 'error',
          payment_handlers: {
            'com.example.loyalty_gold': [],
          },
        },
      });

      expect(decoded?.continueUrl).toBe('https://example.test/recover');
      expect(decoded?.messages[0]?.contentType).toBe('plain');
      expect(
        Object.prototype.hasOwnProperty.call(
          decoded?.ucp.paymentHandlers,
          'com.example.loyalty_gold',
        ),
      ).toBe(true);
    });
  });

  describe('ProtocolHandlers typing', () => {
    it('accepts handlers keyed by every public CheckoutProtocol event', () => {
      const handlers: ProtocolHandlers = {
        [CheckoutProtocol.complete]: checkout => {
          expect(typeof checkout.id).toBe('string');
        },
        [CheckoutProtocol.error]: error => {
          expect(error.messages).toBeDefined();
        },
        [CheckoutProtocol.lineItemsChange]: checkout => {
          expect(typeof checkout.id).toBe('string');
        },
        [CheckoutProtocol.messagesChange]: checkout => {
          expect(typeof checkout.id).toBe('string');
        },
        [CheckoutProtocol.start]: checkout => {
          expect(typeof checkout.id).toBe('string');
        },
        [CheckoutProtocol.totalsChange]: checkout => {
          expect(typeof checkout.id).toBe('string');
        },
      };

      expect(typeof handlers[CheckoutProtocol.complete]).toBe('function');
      expect(typeof handlers[CheckoutProtocol.error]).toBe('function');
      expect(typeof handlers[CheckoutProtocol.lineItemsChange]).toBe(
        'function',
      );
      expect(typeof handlers[CheckoutProtocol.messagesChange]).toBe('function');
      expect(typeof handlers[CheckoutProtocol.start]).toBe('function');
      expect(typeof handlers[CheckoutProtocol.totalsChange]).toBe('function');
    });

    it('infers Checkout as the payload type for checkout-state events', () => {
      type HandlerMap = ProtocolHandlers;
      type CheckoutPayloadMethod = (typeof checkoutPayloadMethods)[number];
      type CheckoutPayloadParam<K extends CheckoutPayloadMethod> = Parameters<
        NonNullable<HandlerMap[K]>
      >[0];

      type AllCheckoutPayloads = {
        [K in CheckoutPayloadMethod]: Checkout extends CheckoutPayloadParam<K>
          ? CheckoutPayloadParam<K> extends Checkout
            ? true
            : false
          : false;
      }[CheckoutPayloadMethod];

      const _typeCheck: AllCheckoutPayloads = true;

      expect(_typeCheck).toBe(true);
    });

    it('infers ErrorResponse as the error handler payload type', () => {
      type ErrorHandler = NonNullable<ProtocolHandlers['ec.error']>;
      type ErrorParam = Parameters<ErrorHandler>[0];

      const _typeCheck: ErrorResponse extends ErrorParam ? true : false = true;
      const _reverseCheck: ErrorParam extends ErrorResponse ? true : false =
        true;

      expect(_typeCheck).toBe(true);
      expect(_reverseCheck).toBe(true);
    });

    it('accepts an empty handlers map', () => {
      const empty: ProtocolHandlers = {};
      expect(empty).toEqual({});
    });
  });
});
