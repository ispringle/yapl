#!/usr/bin/env node

import fs from 'fs';
import YAPLTranspiler from './transpiler.js';

/**
 * CLI entry point for YAPL interpreter.
 * Usage: node cli.js <file.yapl>
 */
if (process.argv.length < 3) {
  console.error('Usage: node cli.js <file.yapl>');
  process.exit(1);
}

const filename = process.argv[2];
const content = fs.readFileSync(filename, 'utf8');

try {
  const transpiler = new YAPLTranspiler();
  const result = transpiler.run(content);
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
