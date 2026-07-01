export declare const PARSE_ERROR_CODE = -32700;
export declare const PARSE_ERROR_MESSAGE = "Parse error";
export declare const INVALID_PARAMS_CODE = -32602;
export declare const INVALID_PARAMS_MESSAGE = "Invalid params";
export declare const METHOD_NOT_FOUND_CODE = -32601;
export declare const METHOD_NOT_FOUND_MESSAGE = "Method not found";
export declare const INTERNAL_ERROR_CODE = -32603;
export declare const INTERNAL_ERROR_MESSAGE = "Internal error";
export type JSONRPCID = string | number | null;
export type DecodedMessage = {
    readonly kind: 'request';
    readonly method: string;
    readonly id: JSONRPCID;
    readonly params: unknown;
} | {
    readonly kind: 'notification';
    readonly method: string;
    readonly params: unknown;
};
export declare function decodeProtocolMessage(message: string): DecodedMessage | undefined;
export declare function encodeJSONRPCResult(id: JSONRPCID, result: unknown): string;
export declare function encodeJSONRPCError(id: JSONRPCID, code: number, message: string): string;
