# YAPL - Yet Another Programming Language

YAPL is a programming language whose structure is valid YAML. It transpiles to JavaScript and executes using `eval`, giving you access to the entire JavaScript ecosystem.

## Installation

```bash
npm install
```

## Usage

### Command Line

```bash
npm run example
# or
node src/cli.js example.yapl
```

### Browser

Open `src/ux/index.html` in your browser to use the interactive YAPL editor. The browser version includes:
- Split-pane editor and output
- Real-time code execution
- Console output capture
- Example code loader

Simply open `src/ux/index.html` in any modern web browser - no build step required!

### Development

Start the Vite dev server (serves `src/ux/index.html`):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run build
npm run preview
```

### Testing

Run tests with Vitest:

```bash
# Watch mode
npm test

# Run once
npm run test:run

# With coverage
npm run test:coverage
```

### Type Checking

Type-check the JavaScript code using TypeScript (via JSDoc):

```bash
npm run typecheck
```

## Syntax

### Top-level Structure

- `imports`: List of ES6 import definitions (optional)
- `require`: List of CommonJS require definitions (optional)
- `functions`: List of function definitions
- `globals`: List of global variable declarations
- `main`: Main execution point (list of steps)

### Function Definition

```yaml
functions:
  - name: myFunction
    params: [x, y]
    body:
      - ['+', x, y]
```

### Data Types

- Numbers: `42`, `3.14`
- Strings: `"hello"`, `'world'`
- Booleans: `true`, `false`
- Arrays: `[1, 2, 3]`
- Null: `null`

### Operators

- Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`, `!`
- Type checking: `typeof`, `instanceof`

### Function Calls

```yaml
[functionName, arg1, arg2]
```

### Special Forms

**If statement:**
```yaml
if:
  cond: ['<', x, 10]
  then: "small"
  else: "large"
```

**While loop:**
```yaml
while:
  cond: ['<', i, 10]
  body:
    - [.console.log, i]
    - [setVariable, i, ['+', i, 1]]
```

**Let binding:**
```yaml
let:
  name: x
  value: 42
```

### JavaScript Integration

To access JavaScript identifiers (like `Math.PI`, `console.log`, etc.), use a **dot prefix** (`.`) to explicitly mark them as JavaScript identifiers:

- `.Math.PI` → JavaScript's `Math.PI`
- `.console.log` → JavaScript's `console.log`
- `.true`, `.false`, `.undefined` → JavaScript primitives
- `.NaN`, `.Infinity` → JavaScript constants

**Why the dot prefix?**
- Strings without dots are treated as string literals (e.g., `"Math.PI"` → string literal)
- Dot-prefixed identifiers are treated as JavaScript identifiers (e.g., `.Math.PI` → JavaScript constant)
- YAPL functions/globals take precedence and don't need the dot prefix

Example:
```yaml
main:
  - [.console.log, "Hello from JavaScript!"]
  - [.Math.max, 1, 2, 3, 4, 5]
  - .Math.PI  # Returns 3.141592653589793
  - .Date.now
```

### Imports and Requires

YAPL supports both ES6 imports and CommonJS requires with a structured format similar to functions.

**ES6 Imports:**
```yaml
imports:
  - from: 'fs'
    default: fs
  - from: 'fs/promises'
    named: [readFile, writeFile]
  - from: 'path'
    alias: path  # Creates: import * as path from 'path'
  - from: 'os'
    default: os
    named: [platform]  # Can combine default and named
```

**CommonJS Requires:**
```yaml
require:
  - module: 'fs'
    default: fs
  - module: 'util'
    named: [promisify, inspect]
  - module: 'path'
    alias: path  # Creates: const path = require('path')
```

**Import/Require Options:**
- `from` / `module`: The module path to import/require
- `default`: Default import name (e.g., `fs` for `import fs from 'fs'`)
- `named`: Array of named imports (e.g., `[readFile, writeFile]` for `import { readFile, writeFile }`)
- `alias`: Namespace alias (e.g., `path` for `import * as path from 'path'`)

### Importing YAPL Files

You can import or require other YAPL files (`.yapl` extension). YAPL files export all their functions and globals:

**Example - `math.yapl`:**
```yaml
functions:
  - name: add
    params: [a, b]
    body:
      - ['+', a, b]

globals:
  - name: pi
    value: 3.14159
```

**Example - `main.yapl`:**
```yaml
require:
  - module: './math.yapl'
    named: [add, pi]

main:
  - [add, pi, 2]
```

**Or using ES6 imports:**
```yaml
imports:
  - from: './math.yapl'
    named: [add, pi]

main:
  - [add, pi, 2]
```

**Note:** YAPL file imports require Node.js environment and work best when using the CLI tool. The imported YAPL file's `main` section is not executed when imported - only its functions and globals are made available.

## Examples

See `example.yapl` for a complete example with Fibonacci, factorial, and JavaScript integration.

