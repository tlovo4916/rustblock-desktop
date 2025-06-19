// 代码验证工具
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'fatal';
  code?: string;
}

export interface ValidationWarning {
  line: number;
  column: number;
  message: string;
  severity: 'warning' | 'info';
  code?: string;
}

// Arduino 代码验证
export function validateArduinoCode(code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 基本语法检查
  const lines = code.split('\n');

  // 检查是否有 setup() 函数
  if (!code.includes('void setup()') && !code.includes('void setup ()')) {
    errors.push({
      line: 1,
      column: 1,
      message: '缺少必需的 setup() 函数',
      severity: 'error',
    });
  }

  // 检查是否有 loop() 函数
  if (!code.includes('void loop()') && !code.includes('void loop ()')) {
    errors.push({
      line: 1,
      column: 1,
      message: '缺少必需的 loop() 函数',
      severity: 'error',
    });
  }

  // 检查括号匹配
  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;

  lines.forEach((line, lineIndex) => {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      switch (char) {
        case '{':
          openBraces++;
          break;
        case '}':
          openBraces--;
          if (openBraces < 0) {
            errors.push({
              line: lineIndex + 1,
              column: i + 1,
              message: '多余的右花括号 }',
              severity: 'error',
            });
          }
          break;
        case '(':
          openParens++;
          break;
        case ')':
          openParens--;
          if (openParens < 0) {
            errors.push({
              line: lineIndex + 1,
              column: i + 1,
              message: '多余的右圆括号 )',
              severity: 'error',
            });
          }
          break;
        case '[':
          openBrackets++;
          break;
        case ']':
          openBrackets--;
          if (openBrackets < 0) {
            errors.push({
              line: lineIndex + 1,
              column: i + 1,
              message: '多余的右方括号 ]',
              severity: 'error',
            });
          }
          break;
      }
    }

    // 检查分号
    const trimmedLine = line.trim();
    if (
      trimmedLine &&
      !trimmedLine.startsWith('//') &&
      !trimmedLine.startsWith('#') &&
      !trimmedLine.endsWith('{') &&
      !trimmedLine.endsWith('}') &&
      !trimmedLine.endsWith(':') &&
      !trimmedLine.includes('for') &&
      !trimmedLine.includes('while') &&
      !trimmedLine.includes('if') &&
      !trimmedLine.includes('else') &&
      !trimmedLine.endsWith(';')
    ) {
      // 可能缺少分号
      if (
        trimmedLine.includes('=') ||
        trimmedLine.includes('digitalWrite') ||
        trimmedLine.includes('pinMode') ||
        trimmedLine.includes('Serial') ||
        trimmedLine.includes('delay')
      ) {
        warnings.push({
          line: lineIndex + 1,
          column: line.length,
          message: '可能缺少分号',
          severity: 'warning',
        });
      }
    }
  });

  // 检查未闭合的括号
  if (openBraces > 0) {
    errors.push({
      line: lines.length,
      column: 1,
      message: `有 ${openBraces} 个未闭合的花括号 {`,
      severity: 'error',
    });
  }

  if (openParens > 0) {
    errors.push({
      line: lines.length,
      column: 1,
      message: `有 ${openParens} 个未闭合的圆括号 (`,
      severity: 'error',
    });
  }

  if (openBrackets > 0) {
    errors.push({
      line: lines.length,
      column: 1,
      message: `有 ${openBrackets} 个未闭合的方括号 [`,
      severity: 'error',
    });
  }

  // 检查常见错误
  lines.forEach((line, lineIndex) => {
    // 检查 = 和 == 的混淆
    if (line.includes('if') && line.includes('=') && !line.includes('==')) {
      warnings.push({
        line: lineIndex + 1,
        column: line.indexOf('=') + 1,
        message: 'if 语句中可能应该使用 == 而不是 =',
        severity: 'warning',
      });
    }

    // 检查未定义的变量（简单检查）
    const variablePattern = /\b([a-zA-Z_]\w*)\s*=/;
    const match = line.match(variablePattern);
    if (
      match &&
      !code.includes(`int ${match[1]}`) &&
      !code.includes(`float ${match[1]}`) &&
      !code.includes(`double ${match[1]}`) &&
      !code.includes(`char ${match[1]}`) &&
      !code.includes(`bool ${match[1]}`) &&
      !code.includes(`boolean ${match[1]}`) &&
      !code.includes(`byte ${match[1]}`) &&
      !code.includes(`String ${match[1]}`)
    ) {
      warnings.push({
        line: lineIndex + 1,
        column: line.indexOf(match[1]) + 1,
        message: `变量 '${match[1]}' 可能未定义`,
        severity: 'info',
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// MicroPython 代码验证
export function validateMicroPythonCode(code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const lines = code.split('\n');
  let indentLevel = 0;
  let inFunction = false;
  let inClass = false;

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // 检查缩进
    const leadingSpaces = line.length - line.trimStart().length;
    const expectedIndent = indentLevel * 4;

    if (trimmedLine && leadingSpaces !== expectedIndent && !trimmedLine.startsWith('#')) {
      // 允许空行和注释行
      if (line.trim() !== '') {
        warnings.push({
          line: lineIndex + 1,
          column: 1,
          message: `缩进不正确，期望 ${expectedIndent} 个空格，实际 ${leadingSpaces} 个`,
          severity: 'warning',
        });
      }
    }

    // 检查冒号后的缩进
    if (trimmedLine.endsWith(':')) {
      indentLevel++;
      inFunction = trimmedLine.startsWith('def ');
      inClass = trimmedLine.startsWith('class ');
    }

    // 检查缩进减少
    if (trimmedLine && leadingSpaces < expectedIndent) {
      indentLevel = Math.floor(leadingSpaces / 4);
    }

    // 检查括号匹配
    let openParens = 0;
    let openBrackets = 0;
    let openBraces = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';

      // 处理字符串
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        switch (char) {
          case '(':
            openParens++;
            break;
          case ')':
            openParens--;
            if (openParens < 0) {
              errors.push({
                line: lineIndex + 1,
                column: i + 1,
                message: '多余的右圆括号 )',
                severity: 'error',
              });
            }
            break;
          case '[':
            openBrackets++;
            break;
          case ']':
            openBrackets--;
            if (openBrackets < 0) {
              errors.push({
                line: lineIndex + 1,
                column: i + 1,
                message: '多余的右方括号 ]',
                severity: 'error',
              });
            }
            break;
          case '{':
            openBraces++;
            break;
          case '}':
            openBraces--;
            if (openBraces < 0) {
              errors.push({
                line: lineIndex + 1,
                column: i + 1,
                message: '多余的右花括号 }',
                severity: 'error',
              });
            }
            break;
        }
      }
    }

    // 行尾检查
    if (openParens > 0 || openBrackets > 0 || openBraces > 0) {
      warnings.push({
        line: lineIndex + 1,
        column: line.length,
        message: '该行有未闭合的括号',
        severity: 'info',
      });
    }

    // 检查常见的 Python 错误
    if (trimmedLine.includes('print ') && !trimmedLine.includes('print(')) {
      errors.push({
        line: lineIndex + 1,
        column: line.indexOf('print ') + 1,
        message: 'Python 3 中 print 是函数，需要使用括号',
        severity: 'error',
      });
    }

    // 检查 tab 和空格混用
    if (line.includes('\t') && line.includes('    ')) {
      errors.push({
        line: lineIndex + 1,
        column: 1,
        message: '不要混用 Tab 和空格进行缩进',
        severity: 'error',
      });
    }
  });

  // 检查必要的导入
  if (
    code.includes('machine.') &&
    !code.includes('import machine') &&
    !code.includes('from machine')
  ) {
    warnings.push({
      line: 1,
      column: 1,
      message: '使用了 machine 模块但未导入',
      severity: 'warning',
    });
  }

  if (code.includes('time.') && !code.includes('import time') && !code.includes('from time')) {
    warnings.push({
      line: 1,
      column: 1,
      message: '使用了 time 模块但未导入',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// 通用代码验证入口
export function validateCode(code: string, language: string): ValidationResult {
  switch (language.toLowerCase()) {
    case 'arduino':
    case 'c++':
    case 'cpp':
      return validateArduinoCode(code);
    case 'micropython':
    case 'python':
      return validateMicroPythonCode(code);
    default:
      return {
        valid: true,
        errors: [],
        warnings: [],
      };
  }
}

// 获取验证结果摘要
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    return '代码验证通过';
  }

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;

  let summary = '';
  if (errorCount > 0) {
    summary += `${errorCount} 个错误`;
  }
  if (warningCount > 0) {
    if (summary) summary += ', ';
    summary += `${warningCount} 个警告`;
  }

  return summary || '代码有问题';
}
