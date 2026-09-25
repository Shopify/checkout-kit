type JSONRecord = Record<string, unknown>;
export declare function decodeProtocolObject(value: unknown, modelName: string): JSONRecord;
/** Decode Kit checkout fields using the generated schema, without protocol metadata. */
export declare function decodeCheckoutSnapshot(value: unknown): JSONRecord;
export declare function encodeProtocolObject(value: unknown, modelName: string): unknown;
export {};
