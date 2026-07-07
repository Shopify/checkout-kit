type JSONRecord = Record<string, unknown>;

const FREE_FORM_FIELDS = new Set([
  'attribution',
  'constraints',
  'display',
  'port',
  'signals',
]);

const DYNAMIC_RECORD_FIELDS = new Set([
  'capabilities',
  'paymentHandlers',
  'payment_handlers',
  'services',
]);

const REQUIRED_FIELDS: Record<string, readonly string[]> = {
  Checkout: ['currency', 'id', 'line_items', 'links', 'status', 'totals', 'ucp'],
  ErrorResponse: ['messages', 'ucp'],
  ReadyRequest: ['delegate'],
  WindowOpenRequest: ['url'],
};

const REQUIRED_STRING_FIELDS: Record<string, readonly string[]> = {
  Checkout: ['currency', 'id'],
  WindowOpenRequest: ['url'],
};

const NESTED_REQUIRED_FIELDS: Record<string, readonly string[]> = {
  order: ['id', 'permalink_url'],
  ucp: ['version'],
};

export function decodeProtocolObject(
  value: unknown,
  modelName: string,
): JSONRecord {
  const input = requireObject(value, modelName);
  requireFields(input, REQUIRED_FIELDS[modelName] ?? [], modelName);
  requireStringFields(input, REQUIRED_STRING_FIELDS[modelName] ?? [], modelName);
  requireNestedFields(input, modelName);
  return camelizeProtocolObject(input);
}

export function encodeProtocolObject(value: unknown): unknown {
  return snakeifyProtocolValue(value);
}

function camelizeProtocolValue(value: unknown, fieldName?: string): unknown {
  if (Array.isArray(value)) {
    return value.map(item => camelizeProtocolValue(item));
  }
  if (!isObjectRecord(value)) {
    return value;
  }

  if (fieldName === 'config') {
    return isEmbeddedConfig(value) ? camelizeProtocolObject(value) : value;
  }
  if (fieldName !== undefined && FREE_FORM_FIELDS.has(fieldName)) {
    return value;
  }
  if (fieldName !== undefined && DYNAMIC_RECORD_FIELDS.has(fieldName)) {
    return mapDynamicRecord(value, item => camelizeProtocolValue(item));
  }

  return camelizeProtocolObject(value);
}

function camelizeProtocolObject(value: JSONRecord): JSONRecord {
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
    const mappedKey = snakeToCamel(key);
    output[mappedKey] = camelizeProtocolValue(item, key);
  }
  return output;
}

function snakeifyProtocolValue(value: unknown, fieldName?: string): unknown {
  if (Array.isArray(value)) {
    return value.map(item => snakeifyProtocolValue(item));
  }
  if (!isObjectRecord(value)) {
    return value;
  }

  if (fieldName === 'config') {
    return isEmbeddedConfig(value) ? snakeifyProtocolObject(value) : value;
  }
  if (fieldName !== undefined && FREE_FORM_FIELDS.has(fieldName)) {
    return value;
  }
  if (fieldName !== undefined && DYNAMIC_RECORD_FIELDS.has(fieldName)) {
    return mapDynamicRecord(value, item => snakeifyProtocolValue(item));
  }

  return snakeifyProtocolObject(value);
}

function snakeifyProtocolObject(value: JSONRecord): JSONRecord {
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
    const mappedKey = camelToSnake(key);
    output[mappedKey] = snakeifyProtocolValue(item, key);
  }
  return output;
}

function mapDynamicRecord(
  value: JSONRecord,
  mapValue: (value: unknown) => unknown,
): JSONRecord {
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = Array.isArray(item)
      ? item.map(entry => mapValue(entry))
      : mapValue(item);
  }
  return output;
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_match, character: string) =>
    character.toUpperCase(),
  );
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, character => `_${character.toLowerCase()}`);
}

function isEmbeddedConfig(value: JSONRecord): boolean {
  return 'colorScheme' in value || 'color_scheme' in value || 'delegate' in value;
}

function requireObject(value: unknown, label: string): JSONRecord {
  if (!isObjectRecord(value)) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value;
}

function isObjectRecord(value: unknown): value is JSONRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

function requireNestedFields(value: JSONRecord, label: string): void {
  for (const [field, requiredFields] of Object.entries(NESTED_REQUIRED_FIELDS)) {
    if (!(field in value)) {
      continue;
    }
    const nested = requireObject(value[field], `${label}.${field}`);
    requireFields(nested, requiredFields, `${label}.${field}`);
  }
}
