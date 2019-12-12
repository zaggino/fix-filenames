#! /usr/bin/env node

import { log } from './log';
import { fixDirectoryContents } from './fix-filenames';

// was directly executed
if (require.main === module) {
  (function () {

    const userArgs = process.argv.slice(2);
    const doRename = userArgs.includes('--rename');
    const checkMp3s = userArgs.includes('--mp3');
    const pathSpecified = userArgs.indexOf('--path');

    let pathToSearch;
    if (pathSpecified !== -1) {
      pathToSearch = userArgs[pathSpecified + 1];
    } else {
      pathToSearch = process.cwd();
    }

    fixDirectoryContents(pathToSearch, { doRename, checkMp3s })
      .then(() => {
        log.info('finished without errors');
      })
      .catch((err) => {
        log.error(err.stack);
      });

  }());
}
