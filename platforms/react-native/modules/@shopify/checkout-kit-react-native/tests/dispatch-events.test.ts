import {
  __resetDispatchEventParityForTests,
  DispatchEventParityError,
  isSdkLifecycleEventType,
  SDK_LIFECYCLE_EVENT_TYPES,
  verifyDispatchEventParity,
} from '../src/dispatch-events';

describe('SDK lifecycle event dispatch contract', () => {
  beforeEach(() => {
    __resetDispatchEventParityForTests();
  });

  it('recognizes only the lifecycle event types the SDK dispatches', () => {
    for (const type of SDK_LIFECYCLE_EVENT_TYPES) {
      expect(isSdkLifecycleEventType(type)).toBe(true);
    }
    expect(isSdkLifecycleEventType('ec.start')).toBe(false);
    expect(isSdkLifecycleEventType('unknown')).toBe(false);
  });

  it('accepts native event types in a different order and verifies once', () => {
    verifyDispatchEventParity(['geolocationRequest', 'close', 'fail']);

    expect(() => verifyDispatchEventParity(['close'])).not.toThrow();
  });

  it('rejects a native module that does not report its lifecycle event list', () => {
    expect(() => verifyDispatchEventParity(undefined)).toThrow(
      DispatchEventParityError,
    );
    expect(() => verifyDispatchEventParity(undefined)).toThrow(
      'did not report a `dispatchEventTypes` array',
    );
  });

  it('reports event types missing from either side of the dispatch contract', () => {
    expect(() => verifyDispatchEventParity(['close', 'nativeOnly'])).toThrow(
      'events missing from js:     nativeOnly',
    );
    expect(() => verifyDispatchEventParity(['close', 'nativeOnly'])).toThrow(
      'events missing from native: fail, geolocationRequest',
    );
  });
});
