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

import path from 'path';

const filename = process.argv[2];
const content = fs.readFileSync(filename, 'utf8');
const baseDir = path.dirname(path.resolve(filename));

try {
  const transpiler = new YAPLTranspiler(baseDir);
  const result = await transpiler.run(content);
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
