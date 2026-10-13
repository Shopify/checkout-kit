import {SPEC_VERSION} from './generated/ProtocolNotifications';
import type {WindowOpenResult} from './generated/Models';

export function windowOpenSuccess(
  version: string = SPEC_VERSION,
): WindowOpenResult {
  return {ucp: {status: 'success', version}};
}

export function windowOpenRejected(
  reason?: string,
  version: string = SPEC_VERSION,
): WindowOpenResult {
  return {
    ucp: {status: 'error', version},
    messages: [
      {
        code: 'window_open_rejected_error',
        content: reason ?? 'Window open rejected',
        severity: 'unrecoverable',
        type: 'error',
      },
    ],
  };
}
