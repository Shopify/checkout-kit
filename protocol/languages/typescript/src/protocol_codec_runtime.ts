import {renameMap} from './generated/ProtocolRenameMap';
import type {RenameChild, RenameEntry} from './generated/ProtocolRenameMap';

type JSONRecord = Record<string, unknown>;
type Direction = 'decode' | 'encode';

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
  return walkObject(input, renameMap[modelName], 'decode') as JSONRecord;
}

export function encodeProtocolObject(
  value: unknown,
  modelName: string,
): unknown {
  return walkObject(value, renameMap[modelName], 'encode');
}

function walkObject(
  value: unknown,
  entries: RenameEntry[] | undefined,
  direction: Direction,
): unknown {
  if (!entries || !isObjectRecord(value)) {
    return value;
  }

  const sourceIndex = direction === 'decode' ? 0 : 1;
  const targetIndex = direction === 'decode' ? 1 : 0;

  const entryBySource = new Map<string, RenameEntry>();
  for (const entry of entries) {
    entryBySource.set(entry[sourceIndex], entry);
  }

  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
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
      return walkObject(value, renameMap[child[1]], direction);
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

function isObjectRecord(value: unknown): value is JSONRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireObject(value: unknown, label: string): JSONRecord {
  if (!isObjectRecord(value)) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value;
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
