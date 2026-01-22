// YAPL Transpiler - Browser version
// Converts YAPL to JavaScript and executes with eval

class YAPLTranspiler {
  constructor() {
    this.functions = {};
    this.globals = {};
    this.params = {};
  }

  // Main entry point
  run(yamlContent) {
    // Use js-yaml from global scope (loaded via CDN)
    // The CDN version exposes it as 'jsyaml' (lowercase)
    const yamlLib = typeof jsyaml !== 'undefined' ? jsyaml : 
                    (typeof jsYAML !== 'undefined' ? jsYAML : null);
    
    if (!yamlLib) {
      throw new Error('js-yaml library not loaded. Make sure it is included via CDN.');
    }
    
    const ast = yamlLib.load(yamlContent);
    
    // Process AST
    const jsCode = this.transpile(ast);
    
    // Execute generated JavaScript
    return this.execute(jsCode);
  }

  // Transpile AST to JavaScript
  transpile(ast) {
    const parts = [];

    // Handle imports (for future expansion)
    if (ast.imports) {
      parts.push(`// Imports: ${ast.imports.join(', ')}`);
    }

    // Transpile globals
    if (ast.globals) {
      parts.push(...ast.globals.map(g => this.transpileGlobal(g)));
    }

    // Transpile functions
    if (ast.functions) {
      parts.push(...ast.functions.map(f => this.transpileFunction(f)));
    }

    // Transpile entry point
    if (ast.entry) {
      parts.push(this.transpileEntry(ast.entry));
    }

    return parts.join('\n\n');
  }

  // Transpile global variable
  transpileGlobal(global) {
    const name = global.name;
    const value = this.transpileExpr(global.value);
    this.globals[name] = true;
    return `let ${name} = ${value};`;
  }

  // Transpile function definition
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
          const code = this.transpileExpr(stmt);
          // Last statement is return value
          return i === body.length - 1 ? `return ${code};` : `${code};`;
        });
        bodyCode = statements.join('\n  ');
      }
    } else {
      bodyCode = `return ${this.transpileExpr(body)};`;
    }

    // Restore previous params state
    this.params = oldParams;

    return `function ${name}(${params.join(', ')}) {\n  ${bodyCode}\n}`;
  }

  // Transpile entry point
  transpileEntry(entry) {
    if (!Array.isArray(entry)) {
      return `(${this.transpileExpr(entry)})();`;
    }

    const results = entry.map(expr => this.transpileExpr(expr));
    if (results.length === 0) {
      return `(() => { return null; })();`;
    }
    const statements = results.map((r, i) => 
      i === 0 ? `let _ = ${r};` : `_ = ${r};`
    );
    return `(() => {\n  ${statements.join('\n  ')}\n  return _;\n})();`;
  }

  // Transpile expression to JavaScript
  transpileExpr(expr) {
    // Handle null/undefined
    if (expr === null || expr === undefined) {
      return 'null';
    }

    // Handle arrays (expressions)
    if (Array.isArray(expr)) {
      return this.transpileArrayExpr(expr);
    }

    // Handle objects (special forms)
    if (typeof expr === 'object') {
      return this.transpileObjectExpr(expr);
    }

    // Handle variable/function reference (string) - check BEFORE primitives
    // because identifiers are also strings, but shouldn't be JSON.stringify'd
    if (typeof expr === 'string') {
      // Treat as identifier if it's registered as a function, global, or parameter
      // This prevents string literals like "YAPL" from being treated as identifiers
      if (this.functions[expr] || this.globals[expr] || this.params[expr]) {
        return this.transpileIdentifier(expr);
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

  // Transpile identifier (variable, function, or JS global)
  transpileIdentifier(name) {
    // If it's a YAPL function or global, use it directly
    if (this.functions[name] || this.globals[name]) {
      return name;
    }
    
    // Otherwise, it's a JavaScript global - use it directly
    // JavaScript will resolve it at runtime
    return name;
  }

  // Transpile array expression
  transpileArrayExpr(expr) {
    if (expr.length === 0) {
      return '[]';
    }

    const [first, ...rest] = expr;

    // Check if first element is an operator
    if (typeof first === 'string' && this.isOperator(first)) {
      return this.transpileOperator(first, rest);
    }

    // Check if first element is property access operator
    if (first === '.') {
      return this.transpilePropertyAccess(rest);
    }

    // Function call - first element is function name
    const funcName = this.transpileIdentifier(first);
    const args = rest.map(arg => this.transpileExpr(arg));
    return `${funcName}(${args.join(', ')})`;
  }

  // Transpile object expression (special forms)
  transpileObjectExpr(expr) {
    // if statement
    if (expr.if) {
      const cond = this.transpileExpr(expr.if.cond);
      const thenExpr = this.transpileExpr(expr.if.then);
      const elseExpr = expr.if.else !== undefined 
        ? this.transpileExpr(expr.if.else)
        : 'null';
      return `(${cond} ? ${thenExpr} : ${elseExpr})`;
    }

    // while loop
    if (expr.while) {
      const cond = this.transpileExpr(expr.while.cond);
      const body = Array.isArray(expr.while.body)
        ? expr.while.body.map(s => this.transpileExpr(s)).join(';\n    ')
        : this.transpileExpr(expr.while.body);
      return `(() => {\n    while (${cond}) {\n      ${body};\n    }\n  })()`;
    }

    // let binding
    if (expr.let) {
      return this.transpileLet(expr.let);
    }

    // return statement
    if (expr.return !== undefined) {
      return this.transpileExpr(expr.return);
    }

    // Object literal
    const entries = Object.entries(expr).map(([k, v]) => {
      return `${k}: ${this.transpileExpr(v)}`;
    });
    return `{${entries.join(', ')}}`;
  }

  // Transpile let binding
  transpileLet(letExpr) {
    if (typeof letExpr === 'object' && letExpr.name) {
      // Single binding
      const name = letExpr.name;
      const value = this.transpileExpr(letExpr.value);
      return `(() => { let ${name} = ${value}; return ${name}; })()`;
    } else if (Array.isArray(letExpr)) {
      // Multiple bindings
      const bindings = letExpr.map(b => {
        const name = b.name;
        const value = this.transpileExpr(b.value);
        return `let ${name} = ${value};`;
      }).join('\n    ');
      return `(() => {\n    ${bindings}\n  })()`;
    }
    throw new Error(`Invalid let form: ${JSON.stringify(letExpr)}`);
  }

  // Transpile operator
  transpileOperator(op, args) {
    const jsArgs = args.map(arg => this.transpileExpr(arg));

    switch (op) {
      // Arithmetic
      case '+':
        return args.length === 1 ? `+${jsArgs[0]}` : `(${jsArgs.join(' + ')})`;
      case '-':
        return args.length === 1 ? `-${jsArgs[0]}` : `(${jsArgs.join(' - ')})`;
      case '*':
        return `(${jsArgs.join(' * ')})`;
      case '/':
        return `(${jsArgs.join(' / ')})`;
      case '%':
        return `(${jsArgs[0]} % ${jsArgs[1]})`;
      case '**':
        return `(${jsArgs[0]} ** ${jsArgs[1]})`;

      // Comparison
      case '==':
        return `(${jsArgs[0]} === ${jsArgs[1]})`;
      case '!=':
        return `(${jsArgs[0]} !== ${jsArgs[1]})`;
      case '<':
        return `(${jsArgs[0]} < ${jsArgs[1]})`;
      case '>':
        return `(${jsArgs[0]} > ${jsArgs[1]})`;
      case '<=':
        return `(${jsArgs[0]} <= ${jsArgs[1]})`;
      case '>=':
        return `(${jsArgs[0]} >= ${jsArgs[1]})`;

      // Logical
      case '&&':
        return `(${jsArgs.join(' && ')})`;
      case '||':
        return `(${jsArgs.join(' || ')})`;
      case '!':
        return `(!${jsArgs[0]})`;

      // Type checking
      case 'typeof':
        return `(typeof ${jsArgs[0]})`;
      case 'instanceof':
        return `(${jsArgs[0]} instanceof ${jsArgs[1]})`;

      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  // Transpile property access
  transpilePropertyAccess(args) {
    if (args.length < 2) {
      throw new Error('Property access requires at least object and property');
    }

    const obj = this.transpileExpr(args[0]);
    const prop = args[1];
    
    // If property is a string, use dot notation or bracket notation
    if (typeof prop === 'string' && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
      // Valid identifier, use dot notation
      if (args.length === 2) {
        return `${obj}.${prop}`;
      } else {
        // Method call
        const methodArgs = args.slice(2).map(arg => this.transpileExpr(arg));
        return `${obj}.${prop}(${methodArgs.join(', ')})`;
      }
    } else {
      // Use bracket notation
      const propExpr = this.transpileExpr(prop);
      if (args.length === 2) {
        return `${obj}[${propExpr}]`;
      } else {
        const methodArgs = args.slice(2).map(arg => this.transpileExpr(arg));
        return `${obj}[${propExpr}](${methodArgs.join(', ')})`;
      }
    }
  }

  // Check if string is an operator
  isOperator(str) {
    const operators = ['+', '-', '*', '/', '%', '**',
                      '==', '!=', '<', '>', '<=', '>=',
                      '&&', '||', '!',
                      'typeof', 'instanceof', '.'];
    return operators.includes(str);
  }

  // Check if value is primitive
  isPrimitive(value) {
    return typeof value === 'number' ||
           typeof value === 'string' ||
           typeof value === 'boolean';
  }

  // Execute generated JavaScript with eval
  execute(jsCode) {
    try {
      return eval(jsCode);
    } catch (error) {
      console.error('Generated JavaScript:', jsCode);
      throw error;
    }
  }
}

