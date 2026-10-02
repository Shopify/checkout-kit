import {
  CheckoutModel,
  ErrorResponseModel,
  FulfillmentOptionModel,
  ReadyRequestModel,
  WindowOpenRequestModel,
  encodedRenameMap,
  renameFields,
} from './generated/ProtocolRenameMap';
import {decodeRenameMap, type RenameChild} from './protocol_rename_map';

type JSONRecord = Record<string, unknown>;

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

type RenameLookup = Map<string, [string, RenameChild?]>;

const renameMap = decodeRenameMap(encodedRenameMap).map(entries => {
  const decode: RenameLookup = new Map();
  const encode: RenameLookup = new Map();
  for (const [fieldIndex, child] of entries) {
    const protocolName = renameFields[fieldIndex]!;
    const javascriptName = protocolName.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    );
    decode.set(protocolName, [javascriptName, child]);
    encode.set(javascriptName, [protocolName, child]);
  }
  return [decode, encode];
});

const REQUIRED_FIELDS: Record<number, readonly string[]> = {
  [CheckoutModel]: ['currency', 'id', 'line_items', 'links', 'status', 'totals', 'ucp'],
  [ErrorResponseModel]: ['messages', 'ucp'],
  [ReadyRequestModel]: ['delegate'],
  [WindowOpenRequestModel]: ['url'],
};

const REQUIRED_STRING_FIELDS: Record<number, readonly string[]> = {
  [CheckoutModel]: ['currency', 'id'],
  [WindowOpenRequestModel]: ['url'],
};

const NESTED_REQUIRED_STRING_FIELDS: Record<string, readonly string[]> = {
  order: ['id', 'permalink_url'],
  ucp: ['version'],
};

export function decodeProtocolObject(
  value: unknown,
  modelId: number,
  modelName: string,
): JSONRecord {
  const input = requireObject(value, modelName);
  requireFields(input, REQUIRED_FIELDS[modelId] ?? [], modelName);
  requireStringFields(input, REQUIRED_STRING_FIELDS[modelId] ?? [], modelName);
  requireNestedFields(input, modelName);
  return walkObject(input, renameMap[modelId], true, modelId) as JSONRecord;
}

export function encodeProtocolObject(value: unknown, modelId: number): unknown {
  return walkObject(value, renameMap[modelId], false, modelId);
}

function walkObject(
  value: unknown,
  entries: RenameLookup[] | undefined,
  decode: boolean,
  modelId?: number,
): unknown {
  const input =
    decode && modelId === FulfillmentOptionModel
      ? normalizeLegacyFulfillmentOptionDescription(value)
      : value;
  if (!isObjectRecord(input) || (!entries && !decode)) {
    return input;
  }

  const entryBySource = entries?.[decode ? 0 : 1];

  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(input)) {
    // Structured clone preserves undefined-valued own properties whereas JSON
    // omits them. Only normalize objects being walked as protocol models; an
    // unknown extension value is passed through without changing its contents.
    if (decode && item === undefined) {
      continue;
    }
    const entry = entryBySource?.get(key);
    if (entry) {
      output[entry[0]] = walkChild(item, entry[1], decode);
    } else {
      output[key] = item;
    }
  }
  return output;
}

function walkChild(
  value: unknown,
  child: RenameChild | undefined,
  decode: boolean,
): unknown {
  if (!child) {
    return value;
  }

  switch (child[0]) {
    case 0:
      return walkObject(value, renameMap[child[1]], decode, child[1]);
    case 1:
      return Array.isArray(value)
        ? value.map(item => walkChild(item, child[1], decode))
        : value;
    case 2:
      return isObjectRecord(value)
        ? mapValues(value, child[1], decode)
        : value;
    case 3:
      return walkUnion(value, child.slice(1) as RenameChild[], decode);
  }
}

function mapValues(
  value: JSONRecord,
  child: RenameChild,
  decode: boolean,
): JSONRecord {
  const output: JSONRecord = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = walkChild(item, child, decode);
  }
  return output;
}

function walkUnion(
  value: unknown,
  members: RenameChild[],
  decode: boolean,
): unknown {
  if (Array.isArray(value)) {
    const arrayMember = members.find(member => member[0] === 1);
    return arrayMember ? walkChild(value, arrayMember, decode) : value;
  }
  if (isObjectRecord(value)) {
    const objectMember = members.find(
      member => member[0] === 0 || member[0] === 2,
    );
    return objectMember ? walkChild(value, objectMember, decode) : value;
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
