import { log } from './log';
import { CodeMap } from './codemap';

const warnedFor: { [charCode: number]: true } = {};

export function fixString(
  originalStr: string
): string | null {
  let newStr = '';

  for (let i = 0; i < originalStr.length; i++) {
    const code = originalStr.charCodeAt(i);
    if (code > 127) {

      let newChar;
      if (code > 9999) {
        newChar = ' ';
      } else {
        newChar = typeof CodeMap[code] === 'string' ? CodeMap[code] : null;
      }

      if (newChar === null && !warnedFor[code]) {
        log.warn('unknown char ' + code + ': ' + originalStr[i] + ' in file: ' + originalStr);
        warnedFor[code] = true;
      }
      newStr += newChar !== null ? newChar : originalStr[i];
    } else {
      newStr += originalStr[i];
    }
  }

  // cleanup multiple spaces and leading/trailing whitespace
  newStr = newStr.replace(/\s+/g, ' ').trim();

  return newStr || null;
}
