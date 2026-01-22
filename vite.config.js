import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Plugin to inline transpiler code and example.yapl into HTML
const inlineTranspilerPlugin = () => {
  let exampleCode = null;
  
  return {
    name: 'inline-transpiler',
    enforce: 'pre',
    buildStart() {
      // Read example.yapl
      exampleCode = readFileSync(
        resolve('example.yapl'),
        'utf-8'
      ).trim();
    },
    transformIndexHtml(html) {
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
      // Read source HTML to get js-yaml script and styles
      const sourceHtmlPath = resolve('src/ux/index.html');
      if (!existsSync(sourceHtmlPath)) return;
      
      const sourceHtml = readFileSync(sourceHtmlPath, 'utf-8');
      const jsyamlScriptMatch = sourceHtml.match(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/js-yaml@[^"]+"><\/script>/);
      const styleMatch = sourceHtml.match(/<style>([\s\S]*?)<\/style>/);
      
      if (!jsyamlScriptMatch || !styleMatch) return;
      
      // Find HTML file in dist
      const htmlPath = resolve('dist/index.html');
      if (!existsSync(htmlPath)) return;
      
      let html = readFileSync(htmlPath, 'utf-8');
      let modified = false;
      
      // Inline the transpiler module script content directly into HTML
      // This keeps everything in one file while preserving ES module functionality
      const scriptTagMatch = html.match(/<script type="module"[^>]*src="\/assets\/([^"]+\.js)"[^>]*><\/script>/);
      if (scriptTagMatch) {
        const bundledJsFile = scriptTagMatch[1];
        const bundledJsPath = resolve('dist/assets', bundledJsFile);
        
        if (existsSync(bundledJsPath)) {
          let bundledCode = readFileSync(bundledJsPath, 'utf-8');
          
          // Escape </script> tags to prevent premature script closure
          bundledCode = bundledCode.replace(/<\/script>/gi, '<\\/script>');
          
          // Replace the external script tag with an inline module script
          // This preserves ES module functionality while keeping everything in one file
          const inlineScript = `<script type="module">\n${bundledCode}\n</script>`;
          
          html = html.replace(
            /<script type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>/,
            inlineScript
          );
          modified = true;
        }
      }
      
      // Ensure js-yaml script is present
      if (!html.includes('js-yaml@4.1.0')) {
        const titleEndIndex = html.indexOf('</title>');
        if (titleEndIndex !== -1) {
          html = html.slice(0, titleEndIndex + 8) + '\n  ' + jsyamlScriptMatch[0] + html.slice(titleEndIndex + 8);
          modified = true;
        }
      }
      
      // Ensure style tag is present
      if (!html.includes('<style>')) {
        const jsyamlIndex = html.indexOf('js-yaml.min.js');
        if (jsyamlIndex !== -1) {
          const scriptEndIndex = html.indexOf('</script>', jsyamlIndex);
          if (scriptEndIndex !== -1) {
            html = html.slice(0, scriptEndIndex + 9) + '\n  <style>' + styleMatch[1] + '</style>' + html.slice(scriptEndIndex + 9);
            modified = true;
          }
        } else {
          const titleEndIndex = html.indexOf('</title>');
          if (titleEndIndex !== -1) {
            html = html.slice(0, titleEndIndex + 8) + '\n  <style>' + styleMatch[1] + '</style>' + html.slice(titleEndIndex + 8);
            modified = true;
          }
        }
      }
      
      if (modified) {
        writeFileSync(htmlPath, html);
      }
      
      // Clean up assets directory after inlining
      const assetsDir = resolve('dist/assets');
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
        external: ['module'], // Node.js built-in, not needed in browser
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
