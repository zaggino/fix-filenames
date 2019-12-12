import { promises as fsAsync } from 'fs';
import * as path from 'path';
import { CodeMap } from './codemap';
import { log } from './log';

const warnedFor: { [charCode: number]: true } = {};

export interface LaunchOptions {
  doRename: boolean;
  checkMp3s: boolean;
}

export async function fixFilename(
  filepath: string,
  options: LaunchOptions
) {
  const dirpath = path.dirname(filepath);
  const filename = path.basename(filepath);
  let newname = '';

  for (let i = 0; i < filename.length; i++) {
    const code = filename.charCodeAt(i);
    if (code > 127) {

      let newChar;
      if (code > 9999) {
        newChar = ' ';
      } else {
        newChar = typeof CodeMap[code] === 'string' ? CodeMap[code] : null;
      }

      if (newChar === null && !warnedFor[code]) {
        log.warn('unknown char ' + code + ': ' + filename[i] + ' in file: ' + filename);
        warnedFor[code] = true;
      }
      newname += newChar !== null ? newChar : filename[i];
    } else {
      newname += filename[i];
    }
  }

  // cleanup multiple spaces and leading/trailing whitespace
  newname = newname.replace(/\s+/g, ' ').trim();

  if (!newname) {
    log.warn('empty result - cant fix: ' + filename + ' in: ' + dirpath);
    return;
  }

  if (newname !== filename) {
    if (options.doRename) {
      log.info('renaming: ' + filename + ' to: ' + newname + ' in: ' + dirpath);
      try {
        await fsAsync.rename(filepath, path.resolve(dirpath, newname));
      } catch (err) {
        log.warn('error renaming (' + err.code + ') path: ' + err.path);
      }
    } else {
      log.info('would rename: ' + filename + ' to: ' + newname + ' in: ' + dirpath);
    }
  }
}

async function decideAction(
  itempath: string,
  options: LaunchOptions
) {
  let stats;

  try {
    stats = await fsAsync.stat(itempath);
  } catch (err) {
    if (err && err.code === 'EPERM') {
      log.warn(`skipping (can't access) path: ${err.path}`);
      return;
    }
    throw err;
  }

  if (stats.isDirectory()) {
    await fixDirectoryContents(itempath, options);
    await fixFilename(itempath, options);
    return;
  }
  if (stats.isFile()) {
    await fixFilename(itempath, options);
    return;
  }
  throw new Error('unexpected stats result for: ' + itempath);
}

export async function fixDirectoryContents(
  dirpath: string,
  options: LaunchOptions
) {
  const contents = await fsAsync.readdir(dirpath);
  await Promise.all(
    contents.map(content => decideAction(path.resolve(dirpath, content), options))
  );
}
