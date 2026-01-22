import { describe, it, expect, beforeEach } from 'vitest';
import YAPLTranspiler from '../src/transpiler.js';

describe('YAPLTranspiler', () => {
  let transpiler;

  beforeEach(() => {
    transpiler = new YAPLTranspiler();
  });

  describe('Basic arithmetic', () => {
    it('should handle addition', () => {
      const code = `
main:
  - ['+', 2, 3]
`;
      const result = transpiler.run(code);
      expect(result).toBe(5);
    });

    it('should handle subtraction', () => {
      const code = `
main:
  - ['-', 10, 3]
`;
      const result = transpiler.run(code);
      expect(result).toBe(7);
    });

    it('should handle multiplication', () => {
      const code = `
main:
  - ['*', 4, 5]
`;
      const result = transpiler.run(code);
      expect(result).toBe(20);
    });

    it('should handle division', () => {
      const code = `
main:
  - ['/', 15, 3]
`;
      const result = transpiler.run(code);
      expect(result).toBe(5);
    });

    it('should handle multiple operations', () => {
      const code = `
main:
  - ['+', ['*', 2, 3], ['-', 10, 4]]
`;
      const result = transpiler.run(code);
      expect(result).toBe(12);
    });
  });

  describe('Comparisons', () => {
    it('should handle less than', () => {
      const code = `
main:
  - ['<', 5, 10]
`;
      const result = transpiler.run(code);
      expect(result).toBe(true);
    });

    it('should handle greater than', () => {
      const code = `
main:
  - ['>', 10, 5]
`;
      const result = transpiler.run(code);
      expect(result).toBe(true);
    });

    it('should handle equality', () => {
      const code = `
main:
  - ['==', 5, 5]
`;
      const result = transpiler.run(code);
      expect(result).toBe(true);
    });

    it('should handle inequality', () => {
      const code = `
main:
  - ['!=', 5, 10]
`;
      const result = transpiler.run(code);
      expect(result).toBe(true);
    });
  });

  describe('Functions', () => {
    it('should define and call a simple function', () => {
      const code = `
functions:
  - name: add
    params: [a, b]
    body:
      - ['+', a, b]

main:
  - [add, 3, 4]
`;
      const result = transpiler.run(code);
      expect(result).toBe(7);
    });

    it('should handle recursive functions', () => {
      const code = `
functions:
  - name: factorial
    params: [n]
    body:
      - if:
          cond: ['<=', n, 1]
          then: 1
          else:
            ['*', n, [factorial, ['-', n, 1]]]

main:
  - [factorial, 5]
`;
      const result = transpiler.run(code);
      expect(result).toBe(120);
    });

    it('should handle fibonacci', () => {
      const code = `
functions:
  - name: fib
    params: [n]
    body:
      - if:
          cond: ['<', n, 2]
          then: n
          else:
            ['+',
             [fib, ['-', n, 1]],
             [fib, ['-', n, 2]]]

main:
  - [fib, 10]
`;
      const result = transpiler.run(code);
      expect(result).toBe(55);
    });
  });

  describe('Conditionals', () => {
    it('should handle if-then-else', () => {
      const code = `
main:
  - if:
      cond: ['<', 5, 10]
      then: "yes"
      else: "no"
`;
      const result = transpiler.run(code);
      expect(result).toBe("yes");
    });

    it('should handle if-then-else with false condition', () => {
      const code = `
main:
  - if:
      cond: ['>', 5, 10]
      then: "yes"
      else: "no"
`;
      const result = transpiler.run(code);
      expect(result).toBe("no");
    });
  });

  describe('Globals', () => {
    it('should handle global variables', () => {
      const code = `
globals:
  - name: x
    value: 42

main:
  - x
`;
      const result = transpiler.run(code);
      expect(result).toBe(42);
    });

    it('should use globals in expressions', () => {
      const code = `
globals:
  - name: pi
    value: 3.14159

main:
  - ['*', pi, 2]
`;
      const result = transpiler.run(code);
      expect(result).toBeCloseTo(6.28318);
    });
  });

  describe('JavaScript integration', () => {
    it('should call JavaScript Math functions', () => {
      const code = `
main:
  - [Math.max, 1, 2, 3, 4, 5]
`;
      const result = transpiler.run(code);
      expect(result).toBe(5);
    });

    it('should call JavaScript Math.min', () => {
      const code = `
main:
  - [Math.min, 10, 5, 3, 8]
`;
      const result = transpiler.run(code);
      expect(result).toBe(3);
    });
  });

  describe('Arrays', () => {
    it('should handle array literals', () => {
      const code = `
main:
  - [1, 2, 3]
`;
      const result = transpiler.run(code);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle empty arrays', () => {
      const code = `
main:
  - []
`;
      const result = transpiler.run(code);
      expect(result).toEqual([]);
    });
  });

  describe('Multiple entry statements', () => {
    it('should execute multiple statements and return last', () => {
      const code = `
main:
  - ['+', 1, 1]
  - ['+', 2, 2]
  - ['+', 3, 3]
`;
      const result = transpiler.run(code);
      expect(result).toBe(6);
    });
  });

  describe('Logical operators', () => {
    it('should handle AND', () => {
      const code = `
main:
  - ['&&', true, true]
`;
      const result = transpiler.run(code);
      expect(result).toBe(true);
    });

    it('should handle OR', () => {
      const code = `
main:
  - ['||', false, true]
`;
      const result = transpiler.run(code);
      expect(result).toBe(true);
    });

    it('should handle NOT', () => {
      const code = `
main:
  - ['!', false]
`;
      const result = transpiler.run(code);
      expect(result).toBe(true);
    });
  });
});

