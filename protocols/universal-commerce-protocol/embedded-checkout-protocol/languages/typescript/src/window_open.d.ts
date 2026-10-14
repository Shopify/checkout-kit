import type { WindowOpenResult } from './generated/Models';
export declare function windowOpenSuccess(version?: string): WindowOpenResult;
export declare function windowOpenRejected(reason?: string, version?: string): WindowOpenResult;
