export declare const PARSE_ERROR_CODE = -32700;
export declare const PARSE_ERROR_MESSAGE = "Parse error";
export declare const INVALID_PARAMS_CODE = -32602;
export declare const INVALID_PARAMS_MESSAGE = "Invalid params";
export type JSONRPCID = string | number | null;
export interface JSONRPCMessage {
    readonly jsonrpc: string;
    readonly method: string;
    readonly id: JSONRPCID | undefined;
    readonly params: unknown;
}
export declare function decodeProtocolMessage(message: string): JSONRPCMessage | undefined;
export declare function isRequest(message: JSONRPCMessage): boolean;
export declare function encodeJSONRPCResult(id: JSONRPCID, result: unknown): string;
export declare function encodeJSONRPCError(id: JSONRPCID, code: number, message: string): string;
