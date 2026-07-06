type JSONRecord = Record<string, unknown>;
export interface ProtocolCodecMetadata {
    readonly wireToJs: Readonly<Record<string, string>>;
    readonly freeFormMapFields: readonly string[];
    readonly typedDynamicMapFields: readonly string[];
    readonly guardedObjectFields: Readonly<Record<string, readonly string[]>>;
    readonly requiredFieldsByModel: Readonly<Record<string, readonly string[]>>;
    readonly requiredStringFieldsByModel: Readonly<Record<string, readonly string[]>>;
    readonly nestedRequiredFieldsByField: Readonly<Record<string, readonly string[]>>;
}
export declare function decodeProtocolObject(value: unknown, metadata: ProtocolCodecMetadata, modelName: string, label: string): JSONRecord;
export declare function encodeProtocolObject(value: unknown, metadata: ProtocolCodecMetadata): unknown;
export {};
