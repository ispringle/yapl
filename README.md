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

- `functions`: List of function definitions
- `globals`: List of global variable declarations
- `entry`: Main execution point (list of steps)
- `imports`: List of external file paths (optional, for future expansion)

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
    - [console.log, i]
    - [setVariable, i, ['+', i, 1]]
```

**Let binding:**
```yaml
let:
  name: x
  value: 42
```

### JavaScript Integration

Any identifier that isn't a YAPL function or global is treated as a JavaScript global. This means you can use:

- `console.log`
- `Math.max`
- `Date.now`
- `Array.from`
- Any other JavaScript global

Example:
```yaml
entry:
  - [console.log, "Hello from JavaScript!"]
  - [Math.max, 1, 2, 3, 4, 5]
  - [Date.now]
```

## Examples

See `example.yapl` for a complete example with Fibonacci, factorial, and JavaScript integration.

