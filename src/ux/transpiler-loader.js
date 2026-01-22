// Entry point for loading YAPLTranspiler in the browser
// This file will be bundled by Vite and inlined into the HTML
import YAPLTranspiler from '../transpiler.js';

// Assign to window so it's globally accessible
// Use a pattern that works even when inlined (not relying on module exports)
(function() {
  // Store the class in a way that survives bundling
  const TranspilerClass = YAPLTranspiler;
  window.YAPLTranspiler = TranspilerClass;
  
  // Also try to assign it directly in case the variable name changes
  if (typeof YAPLTranspiler !== 'undefined') {
    window.YAPLTranspiler = YAPLTranspiler;
  }
})();

