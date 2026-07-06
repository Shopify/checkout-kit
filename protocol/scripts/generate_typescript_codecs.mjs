#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {EC_METHODS} from './method_catalog.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const protocolRoot = path.resolve(scriptDir, '..');

const outputPath = path.resolve(
  protocolRoot,
  'languages/typescript/src/generated/ProtocolCodecs.ts',
);
const modelsPath = path.resolve(
  protocolRoot,
  'languages/typescript/src/generated/Models.ts',
);

function parseQuicktypeModels() {
  const modelsSource = fs.readFileSync(modelsPath, 'utf8');
  const models = new Map();
  let currentModel;

  for (const line of modelsSource.split('\n')) {
    const modelStart = line.match(/^    "([^"]+)": o\(\[$/);
    if (modelStart !== null) {
      currentModel = {name: modelStart[1], fields: []};
      continue;
    }

    if (currentModel !== undefined && /^    \], /.test(line)) {
      models.set(currentModel.name, currentModel);
      currentModel = undefined;
      continue;
    }

    const field = line.match(
      /^        \{ json: "([^"]+)", js: "([^"]+)", typ: (.*) \},$/,
    );
    if (currentModel !== undefined && field !== null) {
      currentModel.fields.push({
        wireName: field[1],
        jsName: field[2],
        type: field[3],
      });
    }
  }

  if (models.size === 0) {
    throw new Error(
      `No quicktype object metadata found in ${modelsPath}; quicktype output may have changed`,
    );
  }

  return models;
}

function codecModels() {
  const decodeModels = new Set();
  const encodeModels = new Set();

  for (const method of EC_METHODS) {
    if (method.kind === 'notification') {
      decodeModels.add(method.payload);
    } else {
      decodeModels.add(method.payload);
      encodeModels.add(method.result);
    }
  }

  return {
    decodeModels: [...decodeModels].sort(),
    encodeModels: [...encodeModels].sort(),
    allModels: [...new Set([...decodeModels, ...encodeModels])].sort(),
  };
}

function modelFor(models, modelName) {
  const model = models.get(modelName);
  if (model === undefined) {
    throw new Error(`No quicktype model metadata found for ${modelName}`);
  }
  return model;
}

function isOptional(type) {
  return type.startsWith('u(undefined,');
}

function isRequiredString(field) {
  return !isOptional(field.type) && field.type === '""';
}

function isFreeFormMap(field) {
  return /\bm\("(?:any|)"\)/.test(field.type);
}

function isTypedDynamicMap(field) {
  return /\bm\((?:a\()?r\("/.test(field.type);
}

function referencedModels(field) {
  return [...field.type.matchAll(/r\("([^"]+)"\)/g)].map(match => match[1]);
}

function directReferencedModel(field) {
  const required = field.type.match(/^r\("([^"]+)"\)$/);
  if (required !== null) {
    return required[1];
  }

  const optional = field.type.match(/^u\(undefined, r\("([^"]+)"\)\)$/);
  return optional?.[1];
}

function fieldNameVariants(field) {
  return [...new Set([field.wireName, field.jsName])];
}

function collectWireToJsMappings(models) {
  const mappings = new Map();

  for (const model of models.values()) {
    for (const field of model.fields) {
      if (field.wireName !== field.jsName) {
        mappings.set(field.wireName, field.jsName);
      }
    }
  }

  if (mappings.size === 0) {
    throw new Error(
      `No wire-to-JS property mappings found in ${modelsPath}; quicktype output may have changed`,
    );
  }

  return sortedEntries(mappings);
}

function collectFieldSet(models, predicate) {
  const fields = new Set();
  for (const model of models.values()) {
    for (const field of model.fields) {
      if (predicate(field)) {
        for (const name of fieldNameVariants(field)) {
          fields.add(name);
        }
      }
    }
  }
  return [...fields].sort();
}

function collectGuardedObjectFields(models) {
  const occurrences = new Map();

  for (const model of models.values()) {
    for (const field of model.fields) {
      for (const name of fieldNameVariants(field)) {
        const entry = occurrences.get(name) ?? {
          hasFreeFormMap: false,
          referencedModels: new Set(),
        };
        entry.hasFreeFormMap ||= isFreeFormMap(field);
        for (const referencedModel of referencedModels(field)) {
          entry.referencedModels.add(referencedModel);
        }
        occurrences.set(name, entry);
      }
    }
  }

  const guardedFields = new Map();
  for (const [fieldName, occurrence] of occurrences) {
    if (!occurrence.hasFreeFormMap || occurrence.referencedModels.size === 0) {
      continue;
    }

    const guardNames = new Set();
    for (const referencedModel of occurrence.referencedModels) {
      const model = models.get(referencedModel);
      for (const field of model?.fields ?? []) {
        for (const name of fieldNameVariants(field)) {
          guardNames.add(name);
        }
      }
    }

    if (guardNames.size > 0) {
      guardedFields.set(fieldName, [...guardNames].sort());
    }
  }

  return sortedEntries(guardedFields);
}

function collectRequiredFieldsByModel(models, modelNames) {
  const required = new Map();

  for (const modelName of modelNames) {
    const fields = modelFor(models, modelName).fields
      .filter(field => !isOptional(field.type))
      .map(field => field.wireName)
      .sort();
    if (fields.length > 0) {
      required.set(modelName, fields);
    }
  }

  return sortedEntries(required);
}

function collectRequiredStringFieldsByModel(models, modelNames) {
  const required = new Map();

  for (const modelName of modelNames) {
    const fields = modelFor(models, modelName).fields
      .filter(isRequiredString)
      .map(field => field.wireName)
      .sort();
    if (fields.length > 0) {
      required.set(modelName, fields);
    }
  }

  return sortedEntries(required);
}

function collectNestedRequiredFieldsByField(models, modelNames) {
  const nested = new Map();

  for (const modelName of modelNames) {
    for (const field of modelFor(models, modelName).fields) {
      const referencedModel = directReferencedModel(field);
      if (referencedModel === undefined || !models.has(referencedModel)) {
        continue;
      }

      const requiredFields = modelFor(models, referencedModel).fields
        .filter(nestedField => !isOptional(nestedField.type))
        .map(nestedField => nestedField.wireName)
        .sort();
      if (requiredFields.length === 0) {
        continue;
      }

      for (const name of fieldNameVariants(field)) {
        nested.set(
          name,
          intersectSorted(nested.get(name) ?? requiredFields, requiredFields),
        );
      }
    }
  }

  return sortedEntries(
    new Map([...nested].filter(([, fields]) => fields.length > 0)),
  );
}

function intersectSorted(left, right) {
  const rightSet = new Set(right);
  return left.filter(value => rightSet.has(value)).sort();
}

function sortedEntries(map) {
  return [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function renderMetadata(metadata) {
  return `const CODEC_METADATA = {
  wireToJs: ${renderRecord(metadata.wireToJs)},
  freeFormMapFields: ${renderStringArray(metadata.freeFormMapFields)},
  typedDynamicMapFields: ${renderStringArray(metadata.typedDynamicMapFields)},
  guardedObjectFields: ${renderRecordOfArrays(metadata.guardedObjectFields)},
  requiredFieldsByModel: ${renderRecordOfArrays(metadata.requiredFieldsByModel)},
  requiredStringFieldsByModel: ${renderRecordOfArrays(metadata.requiredStringFieldsByModel)},
  nestedRequiredFieldsByField: ${renderRecordOfArrays(metadata.nestedRequiredFieldsByField)},
} as const satisfies ProtocolCodecMetadata;`;
}

function renderRecord(entries) {
  if (entries.length === 0) {
    return '{}';
  }

  return `{
${entries.map(([key, value]) => `    ${propertyKey(key)}: ${stringLiteral(value)},`).join('\n')}
  }`;
}

function renderRecordOfArrays(entries) {
  if (entries.length === 0) {
    return '{}';
  }

  return `{
${entries
  .map(([key, values]) => `    ${propertyKey(key)}: ${renderStringArray(values)},`)
  .join('\n')}
  }`;
}

function renderStringArray(values) {
  return `[${values.map(stringLiteral).join(', ')}]`;
}

function propertyKey(value) {
  return /^[$A-Z_a-z][$\w]*$/.test(value) ? value : stringLiteral(value);
}

function stringLiteral(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function renderDecodeFunction(modelName) {
  return `export function decode${modelName}(value: unknown): ${modelName} {
  return decodeProtocolObject(
    value,
    CODEC_METADATA,
    '${modelName}',
    '${modelName}',
  ) as unknown as ${modelName};
}`;
}

function renderEncodeFunction(modelName) {
  return `export function encode${modelName}(value: ${modelName}): unknown {
  return encodeProtocolObject(value, CODEC_METADATA);
}`;
}

function renderModule() {
  const models = parseQuicktypeModels();
  const {decodeModels, encodeModels, allModels} = codecModels();
  const metadata = {
    wireToJs: collectWireToJsMappings(models),
    freeFormMapFields: collectFieldSet(models, isFreeFormMap),
    typedDynamicMapFields: collectFieldSet(models, isTypedDynamicMap),
    guardedObjectFields: collectGuardedObjectFields(models),
    requiredFieldsByModel: collectRequiredFieldsByModel(models, decodeModels),
    requiredStringFieldsByModel: collectRequiredStringFieldsByModel(
      models,
      decodeModels,
    ),
    nestedRequiredFieldsByField: collectNestedRequiredFieldsByField(
      models,
      decodeModels,
    ),
  };

  return `// This file is generated by protocol/scripts/generate_typescript_codecs.mjs.
// Do not edit directly.

import {
  decodeProtocolObject,
  encodeProtocolObject,
  type ProtocolCodecMetadata,
} from '../protocol_codec_runtime';
import type {
  ${allModels.join(',\n  ')},
} from './Models';

${renderMetadata(metadata)}

${decodeModels.map(renderDecodeFunction).join('\n\n')}

${encodeModels.map(renderEncodeFunction).join('\n\n')}
`;
}

function main() {
  const generated = renderModule();
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, generated);
  console.log(`Generated ${outputPath}`);
}

main();
