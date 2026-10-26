const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function stripComments(code) {
  let result = '';
  let i = 0;
  const n = code.length;

  const MODE_CODE = 0;
  const MODE_SINGLE_QUOTE = 1;
  const MODE_DOUBLE_QUOTE = 2;
  const MODE_TEMPLATE = 3;
  const MODE_LINE_COMMENT = 4;
  const MODE_BLOCK_COMMENT = 5;
  const MODE_REGEX = 6;

  let mode = MODE_CODE;
  let templateDepths = []; // for nested ${...} inside templates
  let lastNonWhitespace = '';

  while (i < n) {
    const ch = code[i];
    const next = i + 1 < n ? code[i + 1] : '';

    if (mode === MODE_CODE) {
      if (ch === '/' && next === '/') {
        mode = MODE_LINE_COMMENT;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        mode = MODE_BLOCK_COMMENT;
        i += 2;
        continue;
      }
      if (ch === "'") {
        mode = MODE_SINGLE_QUOTE;
        result += ch;
        lastNonWhitespace = ch;
        i++;
        continue;
      }
      if (ch === '"') {
        mode = MODE_DOUBLE_QUOTE;
        result += ch;
        lastNonWhitespace = ch;
        i++;
        continue;
      }
      if (ch === '`') {
        mode = MODE_TEMPLATE;
        templateDepths.push(0);
        result += ch;
        lastNonWhitespace = ch;
        i++;
        continue;
      }
      if (ch === '/') {
        // Determine if regex or division
        // Preceded by operator, keyword, or start
        const isRegex = /(?:[\(\[\{;:=,\+\-\*\/%&\|\^!~?:<>]|\breturn|\bthrow|\btypeof|\bdelete|\bvoid|\bcase|\byield|\bawait)\s*$/.test(result) || result.trim().length === 0;
        if (isRegex) {
          mode = MODE_REGEX;
          result += ch;
          lastNonWhitespace = ch;
          i++;
          continue;
        }
      }

      result += ch;
      if (!/\s/.test(ch)) {
        lastNonWhitespace = ch;
      }
      i++;
    } else if (mode === MODE_LINE_COMMENT) {
      if (ch === '\n') {
        mode = MODE_CODE;
        result += ch;
      }
      i++;
    } else if (mode === MODE_BLOCK_COMMENT) {
      if (ch === '*' && next === '/') {
        mode = MODE_CODE;
        i += 2;
        continue;
      }
      // If block comment contains newlines, preserve a single space or newline if needed
      i++;
    } else if (mode === MODE_SINGLE_QUOTE) {
      result += ch;
      if (ch === '\\') {
        if (i + 1 < n) {
          result += code[i + 1];
          i += 2;
          continue;
        }
      } else if (ch === "'") {
        mode = MODE_CODE;
      }
      i++;
    } else if (mode === MODE_DOUBLE_QUOTE) {
      result += ch;
      if (ch === '\\') {
        if (i + 1 < n) {
          result += code[i + 1];
          i += 2;
          continue;
        }
      } else if (ch === '"') {
        mode = MODE_CODE;
      }
      i++;
    } else if (mode === MODE_TEMPLATE) {
      result += ch;
      if (ch === '\\') {
        if (i + 1 < n) {
          result += code[i + 1];
          i += 2;
          continue;
        }
      } else if (ch === '$' && next === '{') {
        result += '{';
        i += 2;
        // Parse nested JS code inside template expression
        let braceCount = 1;
        while (i < n && braceCount > 0) {
          const innerCh = code[i];
          const innerNext = i + 1 < n ? code[i + 1] : '';

          if (innerCh === '/' && innerNext === '/') {
            // line comment inside template expression
            i += 2;
            while (i < n && code[i] !== '\n') i++;
            if (i < n) {
              result += code[i]; // newline
              i++;
            }
            continue;
          }
          if (innerCh === '/' && innerNext === '*') {
            // block comment inside template expression
            i += 2;
            while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
            i += 2;
            continue;
          }
          if (innerCh === "'" || innerCh === '"') {
            const q = innerCh;
            result += q;
            i++;
            while (i < n && code[i] !== q) {
              if (code[i] === '\\' && i + 1 < n) {
                result += code[i] + code[i + 1];
                i += 2;
              } else {
                result += code[i];
                i++;
              }
            }
            if (i < n) {
              result += code[i];
              i++;
            }
            continue;
          }
          if (innerCh === '`') {
            // nested template literal!
            result += innerCh;
            i++;
            // recursively handle nested template
            let nestedBacktick = 1;
            while (i < n && nestedBacktick > 0) {
              if (code[i] === '\\' && i + 1 < n) {
                result += code[i] + code[i + 1];
                i += 2;
              } else if (code[i] === '`') {
                result += code[i];
                nestedBacktick--;
                i++;
              } else {
                result += code[i];
                i++;
              }
            }
            continue;
          }

          if (innerCh === '{') braceCount++;
          if (innerCh === '}') braceCount--;

          result += innerCh;
          i++;
        }
        continue;
      } else if (ch === '`') {
        templateDepths.pop();
        mode = MODE_CODE;
      }
      i++;
    } else if (mode === MODE_REGEX) {
      result += ch;
      if (ch === '\\') {
        if (i + 1 < n) {
          result += code[i + 1];
          i += 2;
          continue;
        }
      } else if (ch === '/') {
        mode = MODE_CODE;
      }
      i++;
    }
  }

  // Clean up excessive blank lines (more than 2 consecutive blank lines)
  const cleaned = result
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return cleaned.trim() + '\n';
}

// Target files
const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

function getAllJsFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'vendor') {
        files = files.concat(getAllJsFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const jsFiles = getAllJsFiles(srcDir);
console.log(`Found ${jsFiles.length} JavaScript files to strip comments.`);

for (const file of jsFiles) {
  const original = fs.readFileSync(file, 'utf8');
  const stripped = stripComments(original);
  fs.writeFileSync(file, stripped, 'utf8');
  console.log(`✓ Stripped comments: ${path.relative(projectRoot, file)}`);

  // Syntax check
  try {
    execSync(`node --check "${file}"`);
    console.log(`  ↳ Syntax OK`);
  } catch (err) {
    console.error(`  ❌ SYNTAX ERROR in ${file}! Restoring original...`);
    fs.writeFileSync(file, original, 'utf8');
    process.exit(1);
  }
}

console.log('\nAll files stripped and verified successfully!');
