// Entry point for loading YAPLTranspiler in the browser
// This file will be bundled by Vite and inlined into the HTML
import YAPLTranspiler from '../transpiler.js';

// Assign to window so it's globally accessible
// @ts-ignore - window is a browser global, available at runtime
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.YAPLTranspiler = YAPLTranspiler;
}

