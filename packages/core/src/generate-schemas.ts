/**
 * Generate JSON Schema files from Zod schemas.
 *
 * Output:
 *   schemas/policy.schema.json      — for *.policy.hb.yaml files
 *   schemas/operation.schema.json   — for *.operation.hb.yaml files
 *   schemas/system.schema.json      — for system.hb.yaml files
 *
 * These can be used by VS Code YAML extension for validation and autocomplete.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  PolicySchema,
  OperationSchema,
  SystemFileSchema,
} from './schemas.js';

const outDir = resolve(process.cwd(), 'schemas');
mkdirSync(outDir, { recursive: true });

const policyJsonSchema = zodToJsonSchema(PolicySchema, {
  name: 'HerbrandPolicy',
  $refStrategy: 'none',
});

const operationJsonSchema = zodToJsonSchema(OperationSchema, {
  name: 'HerbrandOperation',
  $refStrategy: 'none',
});

const systemJsonSchema = zodToJsonSchema(SystemFileSchema, {
  name: 'HerbrandSystem',
  $refStrategy: 'none',
});

writeFileSync(resolve(outDir, 'policy.schema.json'), JSON.stringify(policyJsonSchema, null, 2));
writeFileSync(resolve(outDir, 'operation.schema.json'), JSON.stringify(operationJsonSchema, null, 2));
writeFileSync(resolve(outDir, 'system.schema.json'), JSON.stringify(systemJsonSchema, null, 2));

console.log(`Written to ${outDir}/`);
console.log('  policy.schema.json');
console.log('  operation.schema.json');
console.log('  system.schema.json');
