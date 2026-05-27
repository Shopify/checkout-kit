import {
  CheckoutProtocol,
  type Checkout,
  type ProtocolHandlers,
} from '../src';
import {decodeProtocolPayload} from '../src/protocol';

describe('CheckoutProtocol', () => {
  describe('runtime values', () => {
    it('exposes ec.start as the literal method string', () => {
      expect(CheckoutProtocol.start).toBe('ec.start');
    });
  });

  describe('wire payload decoding', () => {
    it('returns undefined for methods without a registered payload decoder', () => {
      expect(decodeProtocolPayload('ec.unknown', {})).toBeUndefined();
    });

    it('converts schema fields to camelCase while preserving dynamic map keys', () => {
      const decoded = decodeProtocolPayload(CheckoutProtocol.start, {
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
    });
  });

  describe('ProtocolHandlers typing', () => {
    it('accepts a handler keyed by CheckoutProtocol.start', () => {
      const handlers: ProtocolHandlers = {
        [CheckoutProtocol.start]: chk => {
          expect(typeof chk.id).toBe('string');
        },
      };

      expect(typeof handlers[CheckoutProtocol.start]).toBe('function');
    });

    it('infers Checkout as the start handler payload type', () => {
      type StartHandler = NonNullable<ProtocolHandlers['ec.start']>;
      type StartParam = Parameters<StartHandler>[0];

      const _typeCheck: Checkout extends StartParam ? true : false = true;
      const _reverseCheck: StartParam extends Checkout ? true : false = true;

      expect(_typeCheck).toBe(true);
      expect(_reverseCheck).toBe(true);
    });

    it('accepts an empty handlers map', () => {
      const empty: ProtocolHandlers = {};
      expect(empty).toEqual({});
    });
  });
});
