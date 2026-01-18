
import ts from 'typescript';

export interface QualityReport {
  valid: boolean;
  syntaxErrors: string[];
  styleIssues: string[];
  score: number; // 0-100
}

export class QualityController {
  /**
   * Verify code quality including syntax and basic style
   */
  static verify(code: string): QualityReport {
    const syntaxErrors = this.checkSyntax(code);
    const styleIssues = this.checkStyle(code);
    
    const valid = syntaxErrors.length === 0;
    
    // Calculate score
    let score = 100;
    if (!valid) score = 0;
    else {
      score -= styleIssues.length * 5;
      score = Math.max(0, score);
    }

    return {
      valid,
      syntaxErrors,
      styleIssues,
      score
    };
  }

  /**
   * Check for TypeScript syntax errors
   */
  private static checkSyntax(code: string): string[] {
    const errors: string[] = [];
    
    try {
      const sourceFile = ts.createSourceFile(
        'temp.ts',
        code,
        ts.ScriptTarget.Latest,
        true
      );

      const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram({
        rootNames: ['temp.ts'],
        options: {
          noEmit: true,
          target: ts.ScriptTarget.Latest,
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.React,
        },
        host: {
          ...ts.createCompilerHost({}),
          getSourceFile: (fileName) => fileName === 'temp.ts' ? sourceFile : undefined,
          writeFile: () => {},
          getDefaultLibFileName: () => "lib.d.ts",
          useCaseSensitiveFileNames: () => true,
          getCanonicalFileName: fileName => fileName,
          getCurrentDirectory: () => "",
          getNewLine: () => "\n",
          fileExists: (fileName) => fileName === 'temp.ts',
          readFile: (fileName) => fileName === 'temp.ts' ? code : undefined,
        }
      }));

      for (const diagnostic of diagnostics) {
        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          errors.push(`Line ${line + 1}, Col ${character + 1}: ${message}`);
        } else {
          errors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
      }
    } catch (e) {
      errors.push(`Compiler crash: ${e instanceof Error ? e.message : String(e)}`);
    }

    return errors;
  }

  /**
   * Check for basic code style consistency
   */
  private static checkStyle(code: string): string[] {
    const issues: string[] = [];

    // Check for console.log usage (warning)
    if (code.includes('console.log')) {
      issues.push('Contains console.log statements');
    }

    // Check for any type (warning)
    if (code.includes(': any') || code.includes('as any')) {
      issues.push('Contains "any" type usage');
    }

    // Check for TODO comments
    if (code.includes('// TODO') || code.includes('// FIXME')) {
      issues.push('Contains TODO/FIXME comments');
    }

    // Check for long lines (> 120 chars)
    const lines = code.split('\n');
    lines.forEach((line, i) => {
      if (line.length > 120) {
        issues.push(`Line ${i + 1} exceeds 120 characters`);
      }
    });

    return issues;
  }
}
