import {REQUIRED, SHAPES, type Shape} from './generated/CaseMap';

const snakeToCamel = (key: string): string =>
  key.includes('_') ? key.replace(/_+([a-z0-9])/g, (_, c: string) => c.toUpperCase()) : key;

const camelToSnake = (key: string): string =>
  key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const REVERSE: Record<string, Record<string, Shape>> = {};
for (const [typeName, fields] of Object.entries(SHAPES)) {
  const rev: Record<string, Shape> = {};
  for (const [jsonKey, shape] of Object.entries(fields)) {
    if (shape[0] === 'key') {
      rev[shape[1]] = ['key', jsonKey];
    } else {
      rev[snakeToCamel(jsonKey)] = shape;
    }
  }
  REVERSE[typeName] = rev;
}

function walk(
  value: unknown,
  typeName: string | undefined,
  table: Record<string, Record<string, Shape>>,
  rename: (key: string) => string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, typeName, table, rename));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const shape = typeName ? table[typeName] : undefined;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const entry = shape?.[key];
    if (entry === undefined) {
      out[rename(key)] = walk(val, undefined, table, rename);
      continue;
    }
    switch (entry[0]) {
      case 'map':
        // Free-form dictionary: rename the field, leave its keys verbatim.
        out[rename(key)] = val;
        break;
      case 'key':
        out[entry[1]] = walk(val, undefined, table, rename);
        break;
      case 'ref':
        out[rename(key)] = walk(val, entry[1], table, rename);
        break;
      case 'arr':
        out[rename(key)] = Array.isArray(val)
          ? val.map((item) => walk(item, entry[1], table, rename))
          : walk(val, entry[1], table, rename);
        break;
    }
  }
  return out;
}

function validateRequired(value: unknown, typeName: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid params');
  }
  const reqs = REQUIRED[typeName];
  if (reqs === undefined) return;
  const obj = value as Record<string, unknown>;
  for (const [key, kind] of reqs) {
    if (!(key in obj)) {
      throw new TypeError('Invalid params');
    }
    if (kind === 'string' && typeof obj[key] !== 'string') {
      throw new TypeError('Invalid params');
    }
  }
}

/** Remap snake_case wire payloads to the camelCase shape consumers read. */
export function camelizeKeys<T>(value: unknown, typeName: string): T {
  validateRequired(value, typeName);
  return walk(value, typeName, SHAPES, snakeToCamel) as T;
}

/** Remap camelCase result objects back to the snake_case wire shape. */
export function snakeifyKeys(value: unknown, typeName: string): unknown {
  return walk(value, typeName, REVERSE, camelToSnake);
}
