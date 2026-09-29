import {renameMap} from './generated/ProtocolRenameMap';
import type {RenameChild, RenameEntry} from './generated/ProtocolRenameMap';

type JSONRecord = Record<string, unknown>;
type Direction = 'decode' | 'encode';

export type ProtocolValidationReason = 'missing_required' | 'invalid_type';

/** A schema path and reason that can be reported without exposing payload values. */
export class ProtocolValidationError extends TypeError {
  readonly modelPath: string;
  readonly reason: ProtocolValidationReason;

  constructor(modelPath: string, reason: ProtocolValidationReason) {
    // The generated decoders supply model names and the checks below supply
    // schema fields. Keep even direct calls with arbitrary names safe to log.
    const safePath = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/.test(
      modelPath,
    )
      ? modelPath
      : 'ProtocolObject';
    super(`Invalid ${safePath}`);
    this.name = 'ProtocolValidationError';
    this.modelPath = safePath;
    this.reason = reason;
  }
}

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

const NESTED_REQUIRED_STRING_FIELDS: Record<string, readonly string[]> = {
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
  return walkObject(input, renameMap[modelName], 'decode', modelName) as JSONRecord;
}

export function encodeProtocolObject(
  value: unknown,
  modelName: string,
): unknown {
  return walkObject(value, renameMap[modelName], 'encode', modelName);
}

function walkObject(
  value: unknown,
  entries: RenameEntry[] | undefined,
  direction: Direction,
  modelName?: string,
): unknown {
  const input =
    direction === 'decode' && modelName === 'FulfillmentOption'
      ? normalizeLegacyFulfillmentOptionDescription(value)
      : value;
  if (!isObjectRecord(input) || (!entries && direction === 'encode')) {
    return input;
  }

  const sourceIndex = direction === 'decode' ? 0 : 1;
  const targetIndex = direction === 'decode' ? 1 : 0;

  const entryBySource = new Map<string, RenameEntry>();
  for (const entry of entries ?? []) {
    entryBySource.set(entry[sourceIndex], entry);
  }

  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(input)) {
    // Structured clone preserves undefined-valued own properties whereas JSON
    // omits them. Only normalize objects being walked as protocol models; an
    // unknown extension value is passed through without changing its contents.
    if (direction === 'decode' && item === undefined) {
      continue;
    }
    const entry = entryBySource.get(key);
    if (entry) {
      output[entry[targetIndex]] = walkChild(item, entry[2], direction);
    } else {
      output[key] = item;
    }
  }
  return output;
}

function walkChild(
  value: unknown,
  child: RenameChild | undefined,
  direction: Direction,
): unknown {
  if (!child) {
    return value;
  }

  switch (child[0]) {
    case 'r':
      return walkObject(value, renameMap[child[1]], direction, child[1]);
    case 'a':
      return Array.isArray(value)
        ? value.map(item => walkChild(item, child[1], direction))
        : value;
    case 'm':
      return isObjectRecord(value)
        ? mapValues(value, child[1], direction)
        : value;
    case 'u':
      return walkUnion(value, child.slice(1) as RenameChild[], direction);
  }
}

function mapValues(
  value: JSONRecord,
  child: RenameChild,
  direction: Direction,
): JSONRecord {
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = walkChild(item, child, direction);
  }
  return output;
}

function walkUnion(
  value: unknown,
  members: RenameChild[],
  direction: Direction,
): unknown {
  if (Array.isArray(value)) {
    const arrayMember = members.find(member => member[0] === 'a');
    return arrayMember ? walkChild(value, arrayMember, direction) : value;
  }
  if (isObjectRecord(value)) {
    const objectMember = members.find(
      member => member[0] === 'r' || member[0] === 'm',
    );
    return objectMember ? walkChild(value, objectMember, direction) : value;
  }
  return value;
}

function normalizeLegacyFulfillmentOptionDescription(value: unknown): unknown {
  if (!isObjectRecord(value) || typeof value.description !== 'string') {
    return value;
  }
  return {...value, description: {plain: value.description}};
}

function isObjectRecord(value: unknown): value is JSONRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireObject(value: unknown, label: string): JSONRecord {
  if (!isObjectRecord(value)) {
    throw new ProtocolValidationError(label, 'invalid_type');
  }
  return value;
}

function hasOwnField(value: JSONRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function requireFields(
  value: JSONRecord,
  fields: readonly string[],
  label: string,
): void {
  for (const field of fields) {
    if (!hasOwnField(value, field) || value[field] === undefined) {
      throw new ProtocolValidationError(`${label}.${field}`, 'missing_required');
    }
  }
}

function requireStringFields(
  value: JSONRecord,
  fields: readonly string[],
  label: string,
): void {
  for (const field of fields) {
    if (
      hasOwnField(value, field) &&
      value[field] !== undefined &&
      typeof value[field] !== 'string'
    ) {
      throw new ProtocolValidationError(`${label}.${field}`, 'invalid_type');
    }
  }
}

function requireNestedFields(value: JSONRecord, label: string): void {
  for (const [field, requiredStringFields] of Object.entries(
    NESTED_REQUIRED_STRING_FIELDS,
  )) {
    if (!hasOwnField(value, field) || value[field] === undefined) {
      continue;
    }
    const nested = requireObject(value[field], `${label}.${field}`);
    requireFields(nested, requiredStringFields, `${label}.${field}`);
    requireStringFields(nested, requiredStringFields, `${label}.${field}`);
  }
}
