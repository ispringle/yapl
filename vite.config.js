import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Plugin to inline transpiler code and example.yapl into HTML
const inlineTranspilerPlugin = () => {
  let transpilerCode = null;
  let exampleCode = null;
  
  return {
    name: 'inline-transpiler',
    enforce: 'pre',
    buildStart() {
      // Read the transpiler-browser.js source once at build start
      const transpilerSource = readFileSync(
        resolve('src/ux/transpiler-browser.js'),
        'utf-8'
      );
      
      // Remove the export statement
      transpilerCode = transpilerSource
        .replace(/export default YAPLTranspiler;?\s*$/, '')
        .trim();
      
      // Read example.yapl
      exampleCode = readFileSync(
        resolve('example.yapl'),
        'utf-8'
      ).trim();
    },
    transformIndexHtml(html) {
      // Replace the transpiler-loader script with inline code
      const inlineScript = `<script>\n${transpilerCode}\nwindow.YAPLTranspiler = YAPLTranspiler;\n</script>`;
      
      // Try multiple patterns - Vite might transform the script tag
      // Pattern 1: Original script tag with id
      html = html.replace(
        /<script type="module"[^>]*id="transpiler-loader"[^>]*>[\s\S]*?<\/script>/,
        inlineScript
      );
      
      // Pattern 2: Module script that imports YAPLTranspiler
      html = html.replace(
        /<script type="module"[^>]*>[\s\S]*?import[\s\S]*?YAPLTranspiler[\s\S]*?<\/script>/,
        inlineScript
      );
      
      // Pattern 3: Module script with src pointing to bundled transpiler
      html = html.replace(
        /<script type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>/,
        inlineScript
      );
      
      // Replace example.yapl placeholder with actual content
      // Escape backticks and backslashes for template literal
      const escapedExampleCode = exampleCode
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\${/g, '\\${');
      
      html = html.replace(
        /const defaultCode = `<!-- EXAMPLE_PLACEHOLDER -->`;/,
        `const defaultCode = \`${escapedExampleCode}\`;`
      );
      
      return html;
    },
    writeBundle(options, bundle) {
    // Find HTML files on disk and remove bundled JS references
    const buildDir = options.dir || 'dist';
    const findHtmlFiles = (dir) => {
      if (!existsSync(dir)) return [];
      const htmlFiles = [];
      try {
        const files = readdirSync(dir);
        for (const file of files) {
          const fullPath = resolve(dir, file);
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            htmlFiles.push(...findHtmlFiles(fullPath));
          } else if (file.endsWith('.html')) {
            htmlFiles.push(fullPath);
          }
        }
      } catch (e) {
        // Ignore errors
      }
      return htmlFiles;
    };
    
    const htmlFiles = findHtmlFiles(resolve(buildDir));
    
    // Also check dist root explicitly
    for (const checkDir of ['dist']) {
      const checkPath = resolve(checkDir);
      if (existsSync(checkPath)) {
        const found = findHtmlFiles(checkPath);
        htmlFiles.push(...found.filter(f => !htmlFiles.includes(f)));
      }
    }
    
    // Process each HTML file - add inline transpiler if missing, remove bundled JS
    const inlineScript = `<script>\n${transpilerCode}\nwindow.YAPLTranspiler = YAPLTranspiler;\n</script>`;
    
    // Escape example code for template literal
    const escapedExampleCode = exampleCode
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');
    
    for (const htmlPath of htmlFiles) {
      if (!existsSync(htmlPath)) continue;
      
      let html = readFileSync(htmlPath, 'utf-8');
      let modified = false;
      
      // Check if transpiler is already inlined
      const hasTranspiler = html.includes('class YAPLTranspiler') || html.includes('window.YAPLTranspiler = YAPLTranspiler');
      
      if (!hasTranspiler) {
        // Find where to insert - before the first <script> tag that's not the CDN one
        const scriptMatch = html.match(/<script[^>]*>(?![\s\S]*js-yaml)/);
        if (scriptMatch && scriptMatch.index !== undefined) {
          html = html.slice(0, scriptMatch.index) + inlineScript + '\n  ' + html.slice(scriptMatch.index);
          modified = true;
        } else {
          // Insert before </body>
          html = html.replace('</body>', inlineScript + '\n</body>');
          modified = true;
        }
      }
      
      // Replace example.yapl placeholder with actual content
      if (html.includes('<!-- EXAMPLE_PLACEHOLDER -->')) {
        html = html.replace(
          /const defaultCode = `<!-- EXAMPLE_PLACEHOLDER -->`;/,
          `const defaultCode = \`${escapedExampleCode}\`;`
        );
        modified = true;
      }
      
      // Remove the bundled module script tag (Vite bundles the import)
      const beforeRemove = html;
      html = html.replace(
        /<script type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>/g,
        ''
      );
      if (html !== beforeRemove) modified = true;
      
      if (modified) {
        writeFileSync(htmlPath, html);
      }
    }
    
    // Clean up the assets directory since we inlined everything
    const assetsDir = resolve(buildDir, 'assets');
    if (existsSync(assetsDir)) {
      rmSync(assetsDir, { recursive: true, force: true });
    }
    },
  };
};

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';
  const buildTarget = process.env.BUILD_TARGET;
  
  // Library build config - outputs to dist/index.js
  if (command === 'build' && buildTarget === 'library') {
    return {
      build: {
        lib: {
          entry: resolve('src/transpiler.js'),
          name: 'YAPLTranspiler',
          fileName: 'index',
          formats: ['es'],
        },
        outDir: 'dist',
        emptyOutDir: false, // Don't empty, UX build might have run first
        rollupOptions: {
          external: ['js-yaml'],
          output: {
            globals: {
              'js-yaml': 'yaml',
            },
          },
        },
      },
    };
  }
  
  // UX build config
  return {
    root: isDev ? 'src/ux' : 'src/ux',
    publicDir: false,
    base: '/',
    build: {
      outDir: resolve('dist'),  // Use absolute path so it's relative to project root, not vite root
      emptyOutDir: buildTarget !== 'library', // Only empty if not building library
      rollupOptions: {
        input: resolve('src/ux/index.html'),
        output: {
          // Ensure HTML goes to the right place
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },
    plugins: [inlineTranspilerPlugin()],
    preview: {
      port: 4173,
      open: true,
    },
    server: {
      port: 5173,
      open: true,
      hmr: {
        overlay: true,
      },
    },
    test: {
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
  };
});
