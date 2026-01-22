// YAPL Transpiler - Converts YAPL to JavaScript and executes with eval

// Import for Node.js - this import statement will be removed when inlining for browser
// @ts-ignore - Browser build will replace this
import yamlModule from 'js-yaml';

/**
 * @typedef {Object} JsYamlLib
 * @property {function(string): *} load
 */

/**
 * Gets the YAML parser library, supporting both Node.js and browser environments.
 * @returns {JsYamlLib} The YAML parser library
 */
function getYamlLib() {
  // Try imported module first (Node.js)
  if (typeof yamlModule !== 'undefined' && yamlModule) {
    return yamlModule;
  }
  // Otherwise, try global jsyaml (browser CDN)
  // @ts-ignore - Global variable from CDN
  if (typeof jsyaml !== 'undefined') {
    // @ts-ignore
    return jsyaml;
  }
  // @ts-ignore - Global variable from CDN (alternative name)
  if (typeof jsYAML !== 'undefined') {
    // @ts-ignore
    return jsYAML;
  }
  throw new Error('js-yaml library not loaded. Make sure it is included via CDN in browser or installed as a dependency in Node.js.');
}

/**
 * @typedef {Object} ImportDef
 * @property {string} from - Module path to import from
 * @property {string} [default] - Default import name (e.g., "fs" for `import fs from 'fs'`)
 * @property {string[]} [named] - Named imports (e.g., ["readFile", "writeFile"] for `import { readFile, writeFile } from 'fs'`)
 * @property {string} [alias] - Namespace import alias (e.g., "path" for `import * as path from 'path'`)
 */

/**
 * @typedef {Object} RequireDef
 * @property {string} module - Module path to require
 * @property {string} [default] - Default require name (e.g., "fs" for `const fs = require('fs')`)
 * @property {string[]} [named] - Named destructured imports (e.g., ["readFile"] for `const { readFile } = require('fs')`)
 * @property {string} [alias] - Namespace require alias (e.g., "path" for `const path = require('path')`)
 */

/**
 * @typedef {Object} YAPLAST
 * @property {ImportDef[]} [imports] - List of ES6 import definitions
 * @property {RequireDef[]} [require] - List of CommonJS require definitions
 * @property {GlobalDef[]} [globals] - List of global variable definitions
 * @property {FunctionDef[]} [functions] - List of function definitions
 * @property {Expr | Expr[]} [main] - Main entry point expression(s)
 */

/**
 * @typedef {Object} GlobalDef
 * @property {string} name - Variable name
 * @property {Expr} value - Initial value expression
 */

/**
 * @typedef {Object} FunctionDef
 * @property {string} name - Function name
 * @property {string[]} params - Parameter names
 * @property {Expr | Expr[]} body - Function body expression(s)
 */

/**
 * @typedef {Object} IfExpr
 * @property {Expr} cond - Condition expression
 * @property {Expr} then - Then branch expression
 * @property {Expr} [else] - Else branch expression (optional)
 */

/**
 * @typedef {Object} WhileExpr
 * @property {Expr} cond - Condition expression
 * @property {Expr | Expr[]} body - Loop body expression(s)
 */

/**
 * @typedef {Object} LetExpr
 * @property {string} name - Variable name
 * @property {Expr} value - Initial value expression
 */

/**
 * @typedef {Object} LetExprArray
 * @property {LetExpr[]} bindings - Array of let bindings
 */

/**
 * @typedef {string | number | boolean | null | any[] | ObjectExpr} Expr
 * Note: Using any[] instead of Expr[] to avoid circular reference warning
 */

/**
 * @typedef {IfForm | WhileForm | LetForm | ReturnForm | Record<string, any>} ObjectExpr
 */

/**
 * @typedef {Object} IfForm
 * @property {IfExpr} if
 */

/**
 * @typedef {Object} WhileForm
 * @property {WhileExpr} while
 */

/**
 * @typedef {Object} LetForm
 * @property {LetExpr | LetExpr[]} let
 */

/**
 * @typedef {Object} ReturnForm
 * @property {Expr} return
 */

/**
 * Transpiler that converts YAPL (YAML-based programming language) to JavaScript.
 */
class YAPLTranspiler {
  /**
   * Creates a new YAPL transpiler instance.
   * @param {string} [baseDir] - Base directory for resolving relative YAPL file imports
   */
  constructor(baseDir = '.') {
    /** @type {Record<string, boolean>} */
    this.functions = {};
    /** @type {Record<string, boolean>} */
    this.globals = {};
    /** @type {Record<string, boolean>} */
    this.params = {};
    /** @type {string} */
    this.baseDir = baseDir;
    /** @type {Map<string, string>} */
    this.importedModules = new Map();
  }

  /**
   * Main entry point: parses YAML content and executes the transpiled JavaScript.
   * @param {string} yamlContent - YAML string containing YAPL code
   * @returns {Promise<*>} The result of executing the transpiled code
   */
  async run(yamlContent) {
    const yamlLib = getYamlLib();
    /** @type {YAPLAST} */
    const ast = yamlLib.load(yamlContent);
    
    // Process AST
    const jsCode = await this.transpile(ast);
    
    // Execute generated JavaScript
    return this.execute(jsCode);
  }

  /**
   * Transpiles a YAPL AST to JavaScript code.
   * @param {YAPLAST} ast - The parsed YAPL AST
   * @returns {Promise<string>} Generated JavaScript code
   */
  async transpile(ast) {
    /** @type {string[]} */
    const parts = [];
    /** @type {string[]} */
    const yaplModules = [];

    // First pass: collect YAPL file imports/requires and transpile them
    if (ast.imports && Array.isArray(ast.imports)) {
      for (const importDef of ast.imports) {
        if (typeof importDef === 'object' && importDef.from && importDef.from.endsWith('.yapl')) {
          const moduleCode = await this.loadYAPLModule(importDef.from);
          yaplModules.push(moduleCode);
        }
      }
    }

    if (ast.require && Array.isArray(ast.require)) {
      for (const requireDef of ast.require) {
        if (typeof requireDef === 'object' && requireDef.module && requireDef.module.endsWith('.yapl')) {
          const moduleCode = await this.loadYAPLModule(requireDef.module);
          yaplModules.push(moduleCode);
        }
      }
    }

    // Add YAPL modules first (they need to be inlined before imports)
    if (yaplModules.length > 0) {
      parts.push('// Inlined YAPL modules');
      parts.push(...yaplModules);
      parts.push('');
    }

    // Handle ES6 imports - must be at the top
    if (ast.imports && Array.isArray(ast.imports)) {
      for (const importDef of ast.imports) {
        const importCode = await this.transpileImport(importDef);
        if (importCode) {
          parts.push(importCode);
        }
      }
      // Add blank line after imports
      if (ast.imports.length > 0) {
        parts.push('');
      }
    }

    // Handle CommonJS require statements - typically at the top after imports
    if (ast.require && Array.isArray(ast.require)) {
      for (const requireDef of ast.require) {
        const requireCode = await this.transpileRequire(requireDef);
        if (requireCode) {
          parts.push(requireCode);
        }
      }
      // Add blank line after requires
      if (ast.require.length > 0) {
        parts.push('');
      }
    }

    // Transpile globals
    const globals = [];
    if (ast.globals) {
      globals.push(...ast.globals.map(g => this.transpileGlobal(g)));
    }

    // Transpile functions
    const functions = [];
    if (ast.functions) {
      functions.push(...ast.functions.map(f => this.transpileFunction(f)));
    }

    // Transpile main entry point
    let entryCode = '';
    if (ast.main) {
      entryCode = this.transpileEntryBody(ast.main);
    }

    // Build code without outer IIFE wrapper - globals and functions at top level
    // Add globals at top level
    if (globals.length > 0) {
      parts.push(...globals);
    }
    
    // Add functions at top level
    if (functions.length > 0) {
      parts.push(...functions);
    }
    
    // Define main function and call it
    if (entryCode) {
      // Remove indentation from entry code since it's no longer nested
      const unindentedEntry = entryCode.split('\n').map(line => line.replace(/^  /, '')).join('\n');
      parts.push(`function main() {\n${unindentedEntry}\n}`);
    } else {
      parts.push('function main() {\n  return null;\n}');
    }
    
    // Call the main function
    parts.push('main()');

    return parts.join('\n');
  }

  /**
   * Loads and transpiles a YAPL file as a module.
   * @param {string} filePath - Path to the YAPL file
   * @returns {Promise<string>} JavaScript code that exports the module's functions and globals
   * @throws {Error} If the file cannot be loaded or parsed
   */
  async loadYAPLModule(filePath) {
    // Check if we've already loaded this module
    if (this.importedModules.has(filePath)) {
      const cached = this.importedModules.get(filePath);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Try to load fs and path modules (Node.js only)
    // Check if we're in Node.js environment
    // @ts-ignore - process is available in Node.js
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
      throw new Error('YAPL file imports require Node.js environment');
    }

    let fs, path;
    try {
      // Try CommonJS require first (works in CommonJS)
      // @ts-ignore - require is available in CommonJS or via createRequire
      if (typeof require !== 'undefined') {
        // @ts-ignore - Dynamic require for Node.js
        fs = require('fs');
        // @ts-ignore - Dynamic require for Node.js
        path = require('path');
      } else {
        // ES module context - try to use createRequire
        // @ts-ignore
        const module = await import('module');
        // @ts-ignore
        const requireFn = module.createRequire(import.meta?.url || 'file://' + process.cwd());
        fs = requireFn('fs');
        path = requireFn('path');
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      throw new Error(`YAPL file imports require Node.js environment (fs and path modules). ${errorMsg}`);
    }

    // Resolve the file path
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(this.baseDir, filePath);

    // Read and parse the YAPL file
    let yamlContent;
    try {
      yamlContent = fs.readFileSync(resolvedPath, 'utf8');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      throw new Error(`Cannot read YAPL file: ${filePath} (resolved to: ${resolvedPath}) - ${errorMsg}`);
    }

    const yamlLib = getYamlLib();
    /** @type {YAPLAST} */
    let importedAST;
    try {
      importedAST = yamlLib.load(yamlContent);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      throw new Error(`Cannot parse YAPL file: ${filePath} - ${errorMsg}`);
    }

    // Transpile the imported module (without main execution)
    const moduleCode = await this.transpileModule(importedAST, path.dirname(resolvedPath));
    
    // Cache the module
    this.importedModules.set(filePath, moduleCode);
    
    return moduleCode;
  }

  /**
   * Transpiles a YAPL AST as a module (exports functions and globals, but doesn't execute main).
   * @param {YAPLAST} ast - The parsed YAPL AST
   * @param {string} [moduleBaseDir] - Base directory for resolving relative imports in this module
   * @returns {Promise<string>} JavaScript code that exports the module's functions and globals
   */
  async transpileModule(ast, moduleBaseDir = '.') {
    /** @type {string[]} */
    const parts = [];
    const oldBaseDir = this.baseDir;
    this.baseDir = moduleBaseDir;

    // Handle imports in the module (but skip .yapl files to avoid circular dependencies)
    if (ast.imports && Array.isArray(ast.imports)) {
      for (const importDef of ast.imports) {
        if (typeof importDef === 'object' && importDef.from && !importDef.from.endsWith('.yapl')) {
          const importCode = await this.transpileImport(importDef);
          if (importCode) {
            parts.push(importCode);
          }
        }
      }
      if (ast.imports.some(i => typeof i === 'object' && i.from && !i.from.endsWith('.yapl'))) {
        parts.push('');
      }
    }

    // Handle requires in the module (but skip .yapl files)
    if (ast.require && Array.isArray(ast.require)) {
      for (const requireDef of ast.require) {
        if (typeof requireDef === 'object' && requireDef.module && !requireDef.module.endsWith('.yapl')) {
          const requireCode = await this.transpileRequire(requireDef);
          if (requireCode) {
            parts.push(requireCode);
          }
        }
      }
      if (ast.require.some(r => typeof r === 'object' && r.module && !r.module.endsWith('.yapl'))) {
        parts.push('');
      }
    }

    // Transpile globals
    const globals = [];
    if (ast.globals) {
      globals.push(...ast.globals.map(g => this.transpileGlobal(g)));
    }

    // Transpile functions
    const functions = [];
    if (ast.functions) {
      functions.push(...ast.functions.map(f => this.transpileFunction(f)));
    }

    // Add globals and functions
    if (globals.length > 0) {
      parts.push(...globals);
    }
    if (functions.length > 0) {
      parts.push(...functions);
    }

    // Note: We don't export here - the functions/globals are inlined and available in scope
    // The importing code will reference them directly

    this.baseDir = oldBaseDir;
    return parts.join('\n');
  }

  /**
   * Transpiles an ES6 import definition.
   * @param {ImportDef} importDef - Import definition
   * @returns {Promise<string>} JavaScript ES6 import statement or module code
   * @throws {Error} If the import definition is invalid
   */
  async transpileImport(importDef) {
    if (typeof importDef === 'string') {
      // Backward compatibility: if it's a string, use it as-is
      return importDef;
    }

    if (!importDef.from) {
      throw new Error('Import definition must have a "from" property');
    }

    const from = importDef.from;

    // Check if this is a YAPL file import
    if (from.endsWith('.yapl')) {
      // YAPL modules are already inlined above, so we just need to reference the exports
      // The module code has already been added, so we return an empty string here
      // The actual imports will be handled by the inlined module exports
      // Note: For ES6 imports of YAPL files, the functions/globals are already in scope
      // from the inlined module, so we don't need to generate an import statement
      return '';
    }

    // Regular JavaScript import
    const parts = [];

    // Handle default import
    if (importDef.default) {
      parts.push(importDef.default);
    }

    // Handle named imports
    if (importDef.named && Array.isArray(importDef.named) && importDef.named.length > 0) {
      const namedImports = importDef.named.join(', ');
      if (parts.length > 0) {
        parts.push(`{ ${namedImports} }`);
      } else {
        parts.push(`{ ${namedImports} }`);
      }
    }

    // Handle namespace alias (import * as alias)
    if (importDef.alias) {
      if (parts.length > 0) {
        throw new Error('Cannot mix default/named imports with alias in the same import statement');
      }
      parts.push(`* as ${importDef.alias}`);
    }

    if (parts.length === 0) {
      throw new Error('Import definition must have at least one of: default, named, or alias');
    }

    return `import ${parts.join(', ')} from '${from}';`;
  }

  /**
   * Transpiles a CommonJS require definition.
   * @param {RequireDef} requireDef - Require definition
   * @returns {Promise<string>} JavaScript CommonJS require statement
   * @throws {Error} If the require definition is invalid
   */
  async transpileRequire(requireDef) {
    if (typeof requireDef === 'string') {
      // Backward compatibility: if it's a string, use it as-is
      return requireDef;
    }

    if (!requireDef.module) {
      throw new Error('Require definition must have a "module" property');
    }

    const module = requireDef.module;

    // Check if this is a YAPL file require
    if (module.endsWith('.yapl')) {
      // YAPL modules are already inlined above, so the functions/globals are already in scope
      // We just need to create references to them (no need to redeclare)
      const yamlLib = getYamlLib();
      let fs, path;
      try {
        // @ts-ignore - require is available in CommonJS or via createRequire
        if (typeof require !== 'undefined') {
          // @ts-ignore
          fs = require('fs');
          // @ts-ignore
          path = require('path');
        } else {
          // @ts-ignore
          const module = await import('module');
          // @ts-ignore
          const requireFn = module.createRequire(import.meta?.url || 'file://' + process.cwd());
          fs = requireFn('fs');
          path = requireFn('path');
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        throw new Error(`YAPL file requires need Node.js environment. ${errorMsg}`);
      }

      const resolvedPath = path.isAbsolute(module) 
        ? module 
        : path.resolve(this.baseDir, module);
      const yamlContent = fs.readFileSync(resolvedPath, 'utf8');
      const importedAST = yamlLib.load(yamlContent);

      // Get list of exported names
      /** @type {string[]} */
      const exportedNames = [];
      if (importedAST.globals) {
        importedAST.globals.forEach((/** @type {GlobalDef} */ g) => {
          exportedNames.push(g.name);
        });
      }
      if (importedAST.functions) {
        importedAST.functions.forEach((/** @type {FunctionDef} */ f) => {
          exportedNames.push(f.name);
        });
      }

      // Generate require statement - functions/globals are already in scope from inlined module
      // So we just create references (no const declarations for named imports)
      if (requireDef.default) {
        // Default export: create an object with all exports
        return `const ${requireDef.default} = { ${exportedNames.map(k => `${k}`).join(', ')} };`;
      }
      if (requireDef.named && Array.isArray(requireDef.named) && requireDef.named.length > 0) {
        // Named imports: they're already in scope, so we don't need to declare them
        // Just return empty string - the names are already available
        return '';
      }
      if (requireDef.alias) {
        // Alias: create an object with all exports
        return `const ${requireDef.alias} = { ${exportedNames.map(k => `${k}`).join(', ')} };`;
      }
      throw new Error('YAPL require must specify at least one of: default, named, or alias');
    }

    // Regular JavaScript require
    const requireExpr = `require('${module}')`;

    // Handle default require
    if (requireDef.default) {
      return `const ${requireDef.default} = ${requireExpr};`;
    }

    // Handle named destructured imports
    if (requireDef.named && Array.isArray(requireDef.named) && requireDef.named.length > 0) {
      const namedImports = requireDef.named.join(', ');
      return `const { ${namedImports} } = ${requireExpr};`;
    }

    // Handle namespace alias
    if (requireDef.alias) {
      return `const ${requireDef.alias} = ${requireExpr};`;
    }

    throw new Error('Require definition must have at least one of: default, named, or alias');
  }

  /**
   * Transpiles a global variable definition.
   * @param {GlobalDef} global - Global variable definition
   * @returns {string} JavaScript code for the global variable
   */
  transpileGlobal(global) {
    const name = global.name;
    const value = this.transpileExpr(global.value, 0);
    this.globals[name] = true;
    return `let ${name} = ${value};`;
  }

  /**
   * Transpiles a function definition.
   * @param {FunctionDef} func - Function definition
   * @returns {string} JavaScript code for the function
   */
  transpileFunction(func) {
    const name = func.name;
    const params = func.params || [];
    const body = func.body || [];
    
    this.functions[name] = true;

    // Track parameters so they're treated as identifiers in the function body
    const oldParams = { ...this.params };
    params.forEach(param => {
      this.params[param] = true;
    });

    // Handle body - could be single expression or list
    let bodyCode;
    if (Array.isArray(body)) {
      if (body.length === 0) {
        bodyCode = 'return null;';
      } else {
        const statements = body.map((stmt, i) => {
          const code = this.transpileExpr(stmt, 0);
          // Last statement is return value
          return i === body.length - 1 ? `return ${code};` : `${code};`;
        });
        bodyCode = this.indent(statements.join('\n'), 2);
      }
    } else {
      bodyCode = `return ${this.transpileExpr(body, 0)};`;
    }

    // Restore previous params state
    this.params = oldParams;

    return `function ${name}(${params.join(', ')}) {\n${bodyCode}\n}`;
  }

  /**
   * Transpiles the entry point expression(s) body (without IIFE wrapper).
   * @param {Expr | Expr[]} entry - Entry point expression or array of expressions
   * @returns {string} JavaScript code for the entry point body
   */
  transpileEntryBody(entry) {
    if (!Array.isArray(entry)) {
      return this.indent(`return ${this.transpileExpr(entry, 0)};`, 2);
    }

    if (entry.length === 0) {
      return this.indent('return null;', 2);
    }
    if (entry.length === 1) {
      return this.indent(`return ${this.transpileExpr(entry[0], 0)};`, 2);
    }

    // Handle let bindings specially - they need to be in the outer scope
    // But preserve execution order - process in sequence
    const orderedStatements = [];
    const declaredVars = new Set();
    
    for (const expr of entry) {
      // Check if this is a let binding
      if (typeof expr === 'object' && expr.let) {
        const letExpr = expr.let;
        if (typeof letExpr === 'object' && letExpr.name) {
          // Single let binding - declare in outer scope
          const name = letExpr.name;
          const value = this.transpileExpr(letExpr.value, 0);
          orderedStatements.push({ type: 'let', name, value: `let ${name} = ${value};` });
          // Track it as a parameter so it's treated as an identifier
          this.params[name] = true;
          declaredVars.add(name);
        } else if (Array.isArray(letExpr)) {
          // Multiple let bindings
          letExpr.forEach(b => {
            const name = b.name;
            const value = this.transpileExpr(b.value, 0);
            orderedStatements.push({ type: 'let', name, value: `let ${name} = ${value};` });
            this.params[name] = true;
            declaredVars.add(name);
          });
        }
      } else {
        // Regular expression
        const code = this.transpileExpr(expr, 0);
        orderedStatements.push({ type: 'expr', value: `${code};` });
      }
    }

    // Build the code preserving order
    if (orderedStatements.length === 0) {
      return this.indent('return null;', 2);
    }
    
    const statements = orderedStatements.map(s => s.value);
    const lastStmt = statements[statements.length - 1];
    
    // If last statement is a let binding, we need to return the variable
    const lastOrdered = orderedStatements[orderedStatements.length - 1];
    if (lastOrdered.type === 'let') {
      statements[statements.length - 1] = lastStmt.replace(';', '');
      statements.push(`return ${lastOrdered.name};`);
    } else {
      // Remove semicolon from last statement and make it a return
      statements[statements.length - 1] = `return ${lastStmt.replace(';', '')};`;
    }
    
    return this.indent(statements.join('\n'), 2);
  }

  /**
   * Checks if a string is a JavaScript identifier prefixed with a dot (e.g., ".Math.PI", ".true").
   * The dot prefix explicitly marks JavaScript identifiers, allowing strings with periods to work.
   * @param {string} str - String to check
   * @returns {string|null} The identifier without the dot prefix, or null if not a dot-prefixed identifier
   */
  getJavaScriptIdentifier(str) {
    // If string starts with a dot, treat the rest as a JavaScript identifier
    if (str.startsWith('.')) {
      const identifier = str.slice(1);
      // Validate that the rest is a valid JavaScript identifier
      const identifierPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/;
      if (identifierPattern.test(identifier)) {
        return identifier;
      }
    }
    return null;
  }

  /**
   * Transpiles an expression to JavaScript code.
   * @param {Expr} expr - Expression to transpile
   * @param {number} precedence - Current operator precedence (higher = tighter binding)
   * @returns {string} JavaScript code
   * @throws {Error} If the expression cannot be transpiled
   */
  transpileExpr(expr, precedence = 0) {
    // Handle null/undefined
    if (expr === null || expr === undefined) {
      return 'null';
    }

    // Handle arrays (expressions)
    if (Array.isArray(expr)) {
      return this.transpileArrayExpr(expr, precedence);
    }

    // Handle objects (special forms)
    if (typeof expr === 'object') {
      return this.transpileObjectExpr(expr, precedence);
    }

    // Handle variable/function reference (string) - check BEFORE primitives
    // because identifiers are also strings, but shouldn't be JSON.stringify'd
    if (typeof expr === 'string') {
      // Treat as identifier if it's registered as a function, global, or parameter
      if (this.functions[expr] || this.globals[expr] || this.params[expr]) {
        return this.transpileIdentifier(expr);
      }
      // Check if it's a dot-prefixed JavaScript identifier (e.g., ".Math.PI", ".true")
      // The dot prefix explicitly marks JavaScript identifiers
      const jsIdentifier = this.getJavaScriptIdentifier(expr);
      if (jsIdentifier !== null) {
        return this.transpileIdentifier(jsIdentifier);
      }
      // Otherwise treat as string literal
      return JSON.stringify(expr);
    }

    // Handle primitives (numbers, booleans)
    if (this.isPrimitive(expr)) {
      return JSON.stringify(expr);
    }

    throw new Error(`Cannot transpile: ${JSON.stringify(expr)}`);
  }

  /**
   * Transpiles an identifier (variable, function, or JavaScript global).
   * @param {string} name - Identifier name
   * @returns {string} JavaScript identifier
   */
  transpileIdentifier(name) {
    // If it's a YAPL function or global, use it directly
    if (this.functions[name] || this.globals[name]) {
      return name;
    }
    
    // Otherwise, it's a JavaScript global - use it directly
    // JavaScript will resolve it at runtime
    return name;
  }

  /**
   * Transpiles an array expression (function call, operator, or array literal).
   * @param {Expr[]} expr - Array expression
   * @param {number} precedence - Current operator precedence
   * @returns {string} JavaScript code
   */
  transpileArrayExpr(expr, precedence = 0) {
    if (expr.length === 0) {
      return '[]';
    }

    const [first, ...rest] = expr;

    // Check if first element is an operator
    if (typeof first === 'string' && this.isOperator(first)) {
      return this.transpileOperator(first, rest, precedence);
    }

    // Check if first element is property access operator
    if (first === '.') {
      return this.transpilePropertyAccess(rest, precedence);
    }

    // Function call - first element is function name
    // @ts-ignore - first is checked to be string before this point
    const firstStr = /** @type {string} */ (first);
    // Check if it's a dot-prefixed JavaScript identifier and strip the dot
    const jsIdentifier = this.getJavaScriptIdentifier(firstStr);
    const funcName = this.transpileIdentifier(jsIdentifier !== null ? jsIdentifier : firstStr);
    // Arguments don't need parentheses unless they contain operators with lower precedence
    const args = rest.map(arg => this.transpileExpr(arg, 0));
    return this.maybeParenthesize(`${funcName}(${args.join(', ')})`, precedence, 20);

    // Array literal would be handled by checking if first is not a string
    // But we're treating all arrays as function calls if first is identifier
  }

  /**
   * Transpiles an object expression (special forms or object literal).
   * @param {ObjectExpr} expr - Object expression
   * @param {number} precedence - Current operator precedence
   * @returns {string} JavaScript code
   */
  transpileObjectExpr(expr, precedence = 0) {
    // if statement
    // @ts-ignore - Type guard for IfForm
    if (expr.if) {
      // @ts-ignore
      const ifExpr = expr.if;
      const cond = this.transpileExpr(ifExpr.cond, 0);
      const thenExpr = this.transpileExpr(ifExpr.then, 0);
      const elseExpr = ifExpr.else !== undefined 
        ? this.transpileExpr(ifExpr.else, 0)
        : 'null';
      return this.maybeParenthesize(`${cond} ? ${thenExpr} : ${elseExpr}`, precedence, 3);
    }

    // while loop
    // @ts-ignore - Type guard for WhileForm
    if (expr.while) {
      // @ts-ignore
      const whileExpr = expr.while;
      const cond = this.transpileExpr(whileExpr.cond, 0);
      const body = Array.isArray(whileExpr.body)
        ? whileExpr.body.map((/** @type {Expr} */ s) => this.transpileExpr(s, 0)).join(';\n      ')
        : this.transpileExpr(whileExpr.body, 0);
      const bodyIndented = this.indent(body, 6);
      return `(() => {\n    while (${cond}) {\n      ${bodyIndented};\n    }\n  })()`;
    }

    // let binding
    // @ts-ignore - Type guard for LetForm
    if (expr.let) {
      // @ts-ignore
      return this.transpileLet(expr.let, precedence);
    }

    // return statement
    // @ts-ignore - Type guard for ReturnForm
    if (expr.return !== undefined) {
      // @ts-ignore
      return this.transpileExpr(expr.return, 0);
    }

    // Object literal
    const entries = Object.entries(expr).map(([k, v]) => {
      return `${k}: ${this.transpileExpr(v, 0)}`;
    });
    return `{${entries.join(', ')}}`;
  }

  /**
   * Transpiles a let binding expression.
   * @param {LetExpr | LetExpr[]} letExpr - Let binding(s)
   * @param {number} precedence - Current operator precedence
   * @returns {string} JavaScript code
   * @throws {Error} If the let form is invalid
   */
  transpileLet(letExpr, precedence = 0) {
    if (typeof letExpr === 'object' && letExpr !== null && !Array.isArray(letExpr) && letExpr.name) {
      // Single binding
      /** @type {LetExpr} */
      const singleLet = letExpr;
      const name = singleLet.name;
      const value = this.transpileExpr(singleLet.value, 0);
      return this.maybeParenthesize(`(() => {\n    let ${name} = ${value};\n    return ${name};\n  })()`, precedence, 0);
    } else if (Array.isArray(letExpr)) {
      // Multiple bindings
      const bindings = letExpr.map(b => {
        const name = b.name;
        const value = this.transpileExpr(b.value, 0);
        return `let ${name} = ${value};`;
      }).join('\n    ');
      return this.maybeParenthesize(`(() => {\n    ${bindings}\n  })()`, precedence, 0);
    }
    throw new Error(`Invalid let form: ${JSON.stringify(letExpr)}`);
  }

  /**
   * Transpiles an operator expression.
   * @param {string} op - Operator name
   * @param {Expr[]} args - Operator arguments
   * @param {number} precedence - Current operator precedence
   * @returns {string} JavaScript code
   * @throws {Error} If the operator is unknown
   */
  transpileOperator(op, args, precedence = 0) {
    // Operator precedence levels (higher = tighter binding)
    /** @type {Record<string, number>} */
    const PREC = {
      '||': 1,
      '&&': 2,
      '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3,
      '+': 4, '-': 4,
      '*': 5, '/': 5, '%': 5,
      '**': 6,
      '!': 7, 'typeof': 7, 'instanceof': 7,
      'unary+': 7, 'unary-': 7
    };

    const opPrec = PREC[op] || 0;
    
    switch (op) {
      // Arithmetic
      case '+':
        if (args.length === 1) {
          const arg = this.transpileExpr(args[0], opPrec);
          return this.maybeParenthesize(`+${arg}`, precedence, opPrec);
        }
        // Check if this is string concatenation - use template literals if possible
        const addArgs = args.map((arg, i) => {
          return this.transpileExpr(arg, opPrec);
        });
        // Try to convert string concatenation to template literals
        const templateResult = this.convertStringConcatToTemplate(addArgs);
        if (templateResult) {
          return this.maybeParenthesize(templateResult, precedence, opPrec);
        }
        // Otherwise use regular addition
        const result = addArgs.join(' + ');
        return this.maybeParenthesize(result, precedence, opPrec);
      case '-':
        if (args.length === 1) {
          const arg = this.transpileExpr(args[0], opPrec);
          return this.maybeParenthesize(`-${arg}`, precedence, opPrec);
        }
        const subArgs = args.map((arg, i) => {
          const prec = i === 0 ? opPrec : opPrec;
          return this.transpileExpr(arg, prec);
        });
        return this.maybeParenthesize(subArgs.join(' - '), precedence, opPrec);
      case '*':
        const mulArgs = args.map((arg, i) => {
          const prec = i === 0 ? opPrec : opPrec;
          return this.transpileExpr(arg, prec);
        });
        return this.maybeParenthesize(mulArgs.join(' * '), precedence, opPrec);
      case '/':
        const divArgs = args.map((arg, i) => {
          const prec = i === 0 ? opPrec : opPrec;
          return this.transpileExpr(arg, prec);
        });
        return this.maybeParenthesize(divArgs.join(' / '), precedence, opPrec);
      case '%':
        const modArgs = args.map((arg, i) => {
          const prec = i === 0 ? opPrec : opPrec;
          return this.transpileExpr(arg, prec);
        });
        return this.maybeParenthesize(`${modArgs[0]} % ${modArgs[1]}`, precedence, opPrec);
      case '**':
        const powArgs = args.map((arg, i) => {
          const prec = i === 0 ? opPrec : opPrec;
          return this.transpileExpr(arg, prec);
        });
        return this.maybeParenthesize(`${powArgs[0]} ** ${powArgs[1]}`, precedence, opPrec);

      // Comparison
      case '==':
        const eqArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(`${eqArgs[0]} === ${eqArgs[1]}`, precedence, opPrec);
      case '!=':
        const neArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(`${neArgs[0]} !== ${neArgs[1]}`, precedence, opPrec);
      case '<':
        const ltArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(`${ltArgs[0]} < ${ltArgs[1]}`, precedence, opPrec);
      case '>':
        const gtArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(`${gtArgs[0]} > ${gtArgs[1]}`, precedence, opPrec);
      case '<=':
        const leArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(`${leArgs[0]} <= ${leArgs[1]}`, precedence, opPrec);
      case '>=':
        const geArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(`${geArgs[0]} >= ${geArgs[1]}`, precedence, opPrec);

      // Logical
      case '&&':
        const andArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(andArgs.join(' && '), precedence, opPrec);
      case '||':
        const orArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(orArgs.join(' || '), precedence, opPrec);
      case '!':
        const notArg = this.transpileExpr(args[0], opPrec);
        return this.maybeParenthesize(`!${notArg}`, precedence, opPrec);

      // Type checking
      case 'typeof':
        const typeofArg = this.transpileExpr(args[0], opPrec);
        return this.maybeParenthesize(`typeof ${typeofArg}`, precedence, opPrec);
      case 'instanceof':
        const instArgs = args.map((arg, i) => this.transpileExpr(arg, opPrec));
        return this.maybeParenthesize(`${instArgs[0]} instanceof ${instArgs[1]}`, precedence, opPrec);

      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  /**
   * Transpiles a property access expression.
   * @param {Expr[]} args - Arguments: [object, property, ...methodArgs]
   * @param {number} precedence - Current operator precedence
   * @returns {string} JavaScript code
   * @throws {Error} If insufficient arguments are provided
   */
  transpilePropertyAccess(args, precedence = 0) {
    if (args.length < 2) {
      throw new Error('Property access requires at least object and property');
    }

    const obj = this.transpileExpr(args[0], 20); // High precedence for property access
    const prop = args[1];
    
    // If property is a string, use dot notation or bracket notation
    if (typeof prop === 'string' && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
      // Valid identifier, use dot notation
      if (args.length === 2) {
        return this.maybeParenthesize(`${obj}.${prop}`, precedence, 20);
      } else {
        // Method call
        const methodArgs = args.slice(2).map(arg => this.transpileExpr(arg, 20));
        return this.maybeParenthesize(`${obj}.${prop}(${methodArgs.join(', ')})`, precedence, 20);
      }
    } else {
      // Use bracket notation
      const propExpr = this.transpileExpr(prop, 20);
      if (args.length === 2) {
        return this.maybeParenthesize(`${obj}[${propExpr}]`, precedence, 20);
      } else {
        const methodArgs = args.slice(2).map(arg => this.transpileExpr(arg, 20));
        return this.maybeParenthesize(`${obj}[${propExpr}](${methodArgs.join(', ')})`, precedence, 20);
      }
    }
  }

  /**
   * Checks if a string is a recognized operator.
   * @param {string} str - String to check
   * @returns {boolean} True if the string is an operator
   */
  isOperator(str) {
    const operators = ['+', '-', '*', '/', '%', '**',
                      '==', '!=', '<', '>', '<=', '>=',
                      '&&', '||', '!',
                      'typeof', 'instanceof', '.'];
    return operators.includes(str);
  }

  /**
   * Checks if a value is a JavaScript primitive type.
   * @param {*} value - Value to check
   * @returns {boolean} True if the value is a primitive
   */
  isPrimitive(value) {
    return typeof value === 'number' ||
           typeof value === 'string' ||
           typeof value === 'boolean';
  }

  /**
   * Adds parentheses if needed based on operator precedence.
   * @param {string} code - Code to potentially wrap
   * @param {number} outerPrec - Outer operator precedence
   * @param {number} innerPrec - Inner operator precedence
   * @returns {string} Code with parentheses if needed
   */
  maybeParenthesize(code, outerPrec, innerPrec) {
    if (outerPrec > innerPrec) {
      return `(${code})`;
    }
    return code;
  }

  /**
   * Indents a multi-line string by the specified number of spaces.
   * @param {string} text - Text to indent
   * @param {number} spaces - Number of spaces to indent
   * @returns {string} Indented text
   */
  indent(text, spaces) {
    const indentStr = ' '.repeat(spaces);
    return text.split('\n').map(line => indentStr + line).join('\n');
  }

  /**
   * Converts string concatenation expressions to template literals when possible.
   * @param {string[]} parts - Array of transpiled expression parts
   * @returns {string|null} Template literal string or null if conversion not possible
   */
  convertStringConcatToTemplate(parts) {
    if (parts.length === 0) return null;
    
    // Check if any part is a string literal (starts and ends with quotes)
    const hasStringLiteral = parts.some(part => {
      const trimmed = part.trim();
      return (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
             (trimmed.startsWith("'") && trimmed.endsWith("'"));
    });
    
    if (!hasStringLiteral) return null;
    
    // Build template literal parts
    const templateParts = [];
    let currentString = '';
    
    for (const part of parts) {
      const trimmed = part.trim();
      const isStringLiteral = (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                              (trimmed.startsWith("'") && trimmed.endsWith("'"));
      
      if (isStringLiteral) {
        // Extract string content (remove quotes)
        const content = trimmed.slice(1, -1);
        currentString += content;
      } else {
        // If we have accumulated string content, add it as text
        if (currentString) {
          templateParts.push({ type: 'text', content: currentString });
          currentString = '';
        }
        // Add expression
        templateParts.push({ type: 'expr', content: part });
      }
    }
    
    // Add any remaining string content
    if (currentString) {
      templateParts.push({ type: 'text', content: currentString });
    }
    
    // If we only have text parts, it's just a string literal
    if (templateParts.every(p => p.type === 'text')) {
      return JSON.stringify(templateParts.map(p => p.content).join(''));
    }
    
    // Build template literal
    const template = templateParts.map(p => {
      if (p.type === 'text') {
        // Escape backticks and ${ in text
        return p.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
      } else {
        return `\${${p.content}}`;
      }
    }).join('');
    
    return `\`${template}\``;
  }

  /**
   * Executes generated JavaScript code using eval.
   * @param {string} jsCode - JavaScript code to execute
   * @returns {*} The result of executing the code
   * @throws {Error} If execution fails
   */
  execute(jsCode) {
    try {
      return eval(jsCode);
    } catch (error) {
      // @ts-ignore - console is available in both Node.js and browser environments
      console.error('Generated JavaScript:');
      // @ts-ignore
      console.error(jsCode);
      throw error;
    }
  }
}

export default YAPLTranspiler;
