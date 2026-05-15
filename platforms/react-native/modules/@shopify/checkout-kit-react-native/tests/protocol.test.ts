import {CheckoutProtocol, type ProtocolHandlers} from '../src';
import type {Checkout} from '@shopify/checkout-kit-protocol';

describe('CheckoutProtocol', () => {
  describe('runtime values', () => {
    it('exposes ec.start as the literal method string', () => {
      expect(CheckoutProtocol.start).toBe('ec.start');
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
