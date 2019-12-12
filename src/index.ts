#! /usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { CodeMap } from './codemap';
import { log } from './log';

const codemap = CodeMap;
const warnedFor: { [charCode: number]: true } = {};

export interface LaunchOptions {
  doRename: boolean;
}

function fixFilename(
  filepath: string,
  options: LaunchOptions
) {
  return new Promise(((resolve, reject) => {
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
          newChar = typeof codemap[code] === 'string' ? codemap[code] : null;
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
      return resolve();
    }

    if (newname !== filename) {

      if (!options.doRename) {
        log.info('would rename: ' + filename + ' to: ' + newname + ' in: ' + dirpath);
        return resolve();
      }

      log.info('renaming: ' + filename + ' to: ' + newname + ' in: ' + dirpath);
      fs.rename(filepath, path.resolve(dirpath, newname), (err) => {
        if (err) {
          log.warn('error renaming (' + err.code + ') path: ' + err.path);
        }
        resolve();
      });
      return;

    }

    resolve();

  }));
}

function decideAction(
  itempath: string,
  options: LaunchOptions
) {
  return new Promise(((resolve, reject) => {
    fs.stat(itempath, (err, stats) => {

      if (err && err.code === 'EPERM') {
        log.warn('skipping (can\'t access) path: ' + err.path);
        return resolve();
      }

      if (err) {
        return reject(err);
      }

      if (stats.isDirectory()) {
        resolve(fixDirectoryContents(itempath, options).then(() => {
          return fixFilename(itempath, options);
        }));
      } else if (stats.isFile()) {
        resolve(fixFilename(itempath, options));
      } else {
        reject(new Error('unexpected stats result for: ' + itempath));
      }

    });
  }));
}

function fixDirectoryContents(
  dirpath: string,
  options: LaunchOptions
) {
  return new Promise(((resolve, reject) => {
    fs.readdir(dirpath, (err, contents) => {

      if (err) {
        return reject(err);
      }

      Promise.all(contents.map((content) => {
        return decideAction(path.resolve(dirpath, content), options);
      })).then(() => {
        resolve();
      }).catch((err2) => {
        reject(err2);
      });

    });
  }));
}

exports.fixFilename = fixFilename;
exports.fixDirectoryContents = fixDirectoryContents;

// was directly executed
if (require.main === module) {
  (function () {

    const userArgs = process.argv.slice(2);
    const doRename = userArgs.includes('--rename');
    const pathSpecified = userArgs.indexOf('--path');

    let pathToSearch;
    if (pathSpecified !== -1) {
      pathToSearch = userArgs[pathSpecified + 1];
    } else {
      pathToSearch = process.cwd();
    }

    fixDirectoryContents(pathToSearch, { doRename })
      .then(() => {
        log.info('finished without errors');
      })
      .catch((err) => {
        log.error(err.stack);
      });

  }());
}
