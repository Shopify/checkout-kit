#!/usr/bin/env node
import {CheckoutErrorCode} from '../src/errors.ts';
// Used in the Swift and Kotlin integration tests to cross reference the error code parity
// react-native should be a superset of the native codes

process.stdout.write(`${JSON.stringify(Object.values(CheckoutErrorCode))}\n`);
