#!/usr/bin/env node
// Writes covered-types.json and COVERED_TYPES.md: the protocol types inside Checkout Kit's
// compatibility promise. Run after updating Checkout Kit's API baselines or regenerating models.

import {writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildInventory, loadInventoryInputs, renderMarkdown} from "./coverage_inventory.mjs";

const PROTOCOL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AREA_ROOT = path.resolve(PROTOCOL_DIR, "../../..");

const inventory = buildInventory(loadInventoryInputs(AREA_ROOT));
writeFileSync(path.join(PROTOCOL_DIR, "covered-types.json"), `${JSON.stringify(inventory, null, 2)}\n`);
writeFileSync(path.join(PROTOCOL_DIR, "COVERED_TYPES.md"), renderMarkdown(inventory));
console.log(`Wrote ${inventory.types.length} covered protocol types`);
