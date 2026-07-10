import {describe, test, expect} from 'vitest';

import {SPEC_VERSION} from '../src/generated/ProtocolNotifications';
import {windowOpenSuccess, windowOpenRejected} from '../src/window_open';

describe('window.open result factories', () => {
  test('success sets ucp status success and no messages', () => {
    const result = windowOpenSuccess();
    expect(result.ucp.status).toBe('success');
    expect(result.ucp.version).toBe(SPEC_VERSION);
    expect(result.messages).toBeUndefined();
  });

  test('rejected sets ucp status error and one unrecoverable message', () => {
    const result = windowOpenRejected('nope');
    expect(result.ucp.status).toBe('error');
    expect(result.messages).toHaveLength(1);
    expect(result.messages![0]).toMatchObject({
      code: 'window_open_rejected_error',
      content: 'nope',
      severity: 'unrecoverable',
      type: 'error',
    });
  });

  test('rejected falls back to default content', () => {
    expect(windowOpenRejected().messages![0]!.content).toBe(
      'Window open rejected',
    );
  });
});
