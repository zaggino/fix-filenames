import ffmetadata from 'ffmetadata';
import { log } from './log';
import { LaunchOptions } from './fix-filenames';
import { fixString } from './fix-string';

let didNotify = false;

type ID3Tags = Record<string, string>;

const readOptions = {};

async function readTags(
  filePath: string
): Promise<ID3Tags> {
  return new Promise((resolve, reject) => {
    ffmetadata.read(filePath, readOptions, (err: Error, data: any) => err ? reject(err) : resolve(data));
  });
}

const writeOptions = {
  'id3v1': true // If this property is truthy, id3 v1 will also be included
  // 'id3v2.3': true // If this property is truthy, id3 v2.3 will be used (instead of the default of v2.4)
};

async function writeTags(
  filePath: string,
  tags: ID3Tags
) {
  return new Promise((resolve, reject) => {
    ffmetadata.write(filePath, tags, writeOptions, (err: Error, data: any) => err ? reject(err) : resolve(data));
  });
}

export async function fixMp3Tags(
  filePath: string,
  options: LaunchOptions
) {
  if (!didNotify) {
    log.warn(
      `FFmpeg needs to be installed when working with --mp3,` +
      ` visit https://github.com/parshap/node-ffmetadata#installation for details.`
    );
    didNotify = true;
  }

  const tags = await readTags(filePath);

  let logFileOpenOnce = false;
  const logFileOpen = () => {
    if (!logFileOpenOnce) {
      log.info(`reading ID3 tags from file: ${filePath}`);
      logFileOpenOnce = true;
    }
  };

  let didModifyTags = false;
  for (const tagName of Object.keys(tags)) {
    const oldVal = tags[tagName];
    const newVal = fixString(oldVal);
    if (newVal && newVal !== oldVal) {
      logFileOpen();
      if (!options.doRename) {
        log.info(`would modify id3:${tagName} from: ${oldVal} to: ${newVal}`);
      } else {
        log.info(`changing id3:${tagName} from: ${oldVal} to: ${newVal}`);
        tags[tagName] = newVal;
        didModifyTags = true;
      }
    }
  }

  if (didModifyTags) {
    // write them back to file
    await writeTags(filePath, tags);
    log.info(`written id3 changes to file ${filePath}`);
  }
}
