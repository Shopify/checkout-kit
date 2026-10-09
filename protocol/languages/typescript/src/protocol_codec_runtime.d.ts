type JSONRecord = Record<string, unknown>;
export type ProtocolValidationReason = 'missing_required' | 'invalid_type';
/** A schema path and reason that can be reported without exposing payload values. */
export declare class ProtocolValidationError extends TypeError {
    readonly modelPath: string;
    readonly reason: ProtocolValidationReason;
    constructor(modelPath: string, reason: ProtocolValidationReason);
}
export declare function decodeProtocolObject(value: unknown, modelName: string): JSONRecord;
/** Decode Kit checkout fields using the generated schema, without protocol metadata. */
export declare function decodeCheckoutSnapshot(value: unknown): JSONRecord;
export declare function encodeProtocolObject(value: unknown, modelName: string): unknown;
export {};
