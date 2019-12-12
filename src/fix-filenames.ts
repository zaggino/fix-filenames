import { promises as fsAsync } from 'fs';
import * as path from 'path';
import { log } from './log';
import { fixMp3Tags } from './mp3';
import { fixString } from './fix-string';

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
  let currentName = filename;
  const newname = fixString(filename);

  if (!newname) {
    log.warn('empty result - cant fix: ' + filename + ' in: ' + dirpath);
    return;
  }

  if (newname !== filename) {
    if (options.doRename) {
      log.info('renaming: ' + filename + ' to: ' + newname + ' in: ' + dirpath);
      try {
        await fsAsync.rename(filepath, path.resolve(dirpath, newname));
        currentName = newname;
      } catch (err) {
        log.warn('error renaming (' + err.code + ') path: ' + err.path);
      }
    } else {
      log.info('would rename: ' + filename + ' to: ' + newname + ' in: ' + dirpath);
    }
  }

  if (options.checkMp3s && currentName.endsWith('.mp3')) {
    await fixMp3Tags(path.resolve(dirpath, currentName), options);
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
