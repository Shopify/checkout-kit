type JSONRecord = Record<string, unknown>;

export interface ProtocolCodecMetadata {
  readonly wireToJs: Readonly<Record<string, string>>;
  readonly freeFormMapFields: readonly string[];
  readonly typedDynamicMapFields: readonly string[];
  readonly guardedObjectFields: Readonly<Record<string, readonly string[]>>;
  readonly requiredFieldsByModel: Readonly<Record<string, readonly string[]>>;
  readonly requiredStringFieldsByModel: Readonly<
    Record<string, readonly string[]>
  >;
  readonly nestedRequiredFieldsByField: Readonly<
    Record<string, readonly string[]>
  >;
}

export function decodeProtocolObject(
  value: unknown,
  metadata: ProtocolCodecMetadata,
  modelName: string,
  label: string,
): JSONRecord {
  const input = requireObject(value, label);
  requireFields(
    input,
    metadata.requiredFieldsByModel[modelName] ?? [],
    label,
  );
  requireStringFields(
    input,
    metadata.requiredStringFieldsByModel[modelName] ?? [],
    label,
  );
  requireNestedFields(input, metadata, label);
  return camelizeProtocolObject(input, metadata);
}

export function encodeProtocolObject(
  value: unknown,
  metadata: ProtocolCodecMetadata,
): unknown {
  return snakeifyProtocolValue(value, metadata);
}

function camelizeProtocolValue(
  value: unknown,
  metadata: ProtocolCodecMetadata,
  fieldName?: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map(item => camelizeProtocolValue(item, metadata));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const guardedFields =
    fieldName === undefined
      ? undefined
      : metadata.guardedObjectFields[fieldName];
  if (guardedFields !== undefined) {
    return objectHasAnyKey(value, guardedFields)
      ? camelizeProtocolObject(value as JSONRecord, metadata)
      : value;
  }

  if (
    fieldName !== undefined &&
    metadata.freeFormMapFields.includes(fieldName)
  ) {
    return value;
  }

  if (
    fieldName !== undefined &&
    metadata.typedDynamicMapFields.includes(fieldName)
  ) {
    return mapDynamicRecord(value, item => camelizeProtocolValue(item, metadata));
  }

  return camelizeProtocolObject(value as JSONRecord, metadata);
}

function camelizeProtocolObject(
  value: JSONRecord,
  metadata: ProtocolCodecMetadata,
): JSONRecord {
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
    const mappedKey = metadata.wireToJs[key] ?? key;
    output[mappedKey] = camelizeProtocolValue(item, metadata, key);
  }
  return output;
}

function snakeifyProtocolValue(
  value: unknown,
  metadata: ProtocolCodecMetadata,
  fieldName?: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map(item => snakeifyProtocolValue(item, metadata));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const guardedFields =
    fieldName === undefined
      ? undefined
      : metadata.guardedObjectFields[fieldName];
  if (guardedFields !== undefined) {
    return objectHasAnyKey(value, guardedFields)
      ? snakeifyProtocolObject(value as JSONRecord, metadata)
      : value;
  }

  if (
    fieldName !== undefined &&
    metadata.freeFormMapFields.includes(fieldName)
  ) {
    return value;
  }

  if (
    fieldName !== undefined &&
    metadata.typedDynamicMapFields.includes(fieldName)
  ) {
    return mapDynamicRecord(value, item => snakeifyProtocolValue(item, metadata));
  }

  return snakeifyProtocolObject(value as JSONRecord, metadata);
}

function snakeifyProtocolObject(
  value: JSONRecord,
  metadata: ProtocolCodecMetadata,
): JSONRecord {
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
    const mappedKey = jsToWire(metadata, key);
    output[mappedKey] = snakeifyProtocolValue(item, metadata, key);
  }
  return output;
}

function jsToWire(metadata: ProtocolCodecMetadata, value: string): string {
  for (const [wire, js] of Object.entries(metadata.wireToJs)) {
    if (js === value) {
      return wire;
    }
  }
  return value;
}

function mapDynamicRecord(
  value: unknown,
  mapValue: (value: unknown) => unknown,
): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value as JSONRecord)) {
    output[key] = Array.isArray(item)
      ? item.map(entry => mapValue(entry))
      : mapValue(item);
  }
  return output;
}

function requireObject(value: unknown, label: string): JSONRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value as JSONRecord;
}

function requireFields(
  value: JSONRecord,
  fields: readonly string[],
  label: string,
): void {
  for (const field of fields) {
    if (!(field in value)) {
      throw new TypeError(`Invalid ${label}`);
    }
  }
}

function requireStringFields(
  value: JSONRecord,
  fields: readonly string[],
  label: string,
): void {
  for (const field of fields) {
    if (field in value && typeof value[field] !== 'string') {
      throw new TypeError(`Invalid ${label}`);
    }
  }
}

function requireNestedFields(
  value: JSONRecord,
  metadata: ProtocolCodecMetadata,
  label: string,
): void {
  for (const [field, requiredFields] of Object.entries(
    metadata.nestedRequiredFieldsByField,
  )) {
    if (!(field in value)) {
      continue;
    }
    const nested = requireObject(value[field], `${label}.${field}`);
    requireFields(nested, requiredFields, `${label}.${field}`);
  }
}

function objectHasAnyKey(
  value: unknown,
  keys: readonly string[],
): value is JSONRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return keys.some(key => key in value);
}
