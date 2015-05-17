#! /usr/bin/env node

/*global Promise:true*/
/*eslint-env node*/

"use strict";

var fs = require("fs");
var path = require("path");
var codemap = require("./codemap");
var Promise = require("bluebird");
var warnedFor = {};

function fixFilename(filepath, doRename) {
  return new Promise(function (resolve, reject) {
    var dirpath = path.dirname(filepath);
    var filename = path.basename(filepath);
    var newname = "";

    for (var i = 0; i < filename.length; i++) {
      var code = filename.charCodeAt(i);
      if (code > 127) {

        var newChar;
        if (code > 9999) {
          newChar = " ";
        } else {
          newChar = typeof codemap[code] === "string" ? codemap[code] : null;
        }

        if (newChar === null && !warnedFor[code]) {
          console.warn("unknown char " + code + ": " + filename[i] + " in file: " + filename);
          warnedFor[code] = true;
        }
        newname += newChar !== null ? newChar : filename[i];
      } else {
        newname += filename[i];
      }
    }

    // cleanup multiple spaces and leading/trailing whitespace
    newname = newname.replace(/\s+/g, " ").trim();

    if (!newname) {
      console.warn("empty result - cant fix: " + filename + " in: " + dirpath);
      return resolve();
    }

    if (newname !== filename) {

      if (!doRename) {
        console.log("would rename: " + filename + " to: " + newname + " in: " + dirpath);
        return resolve();
      }

      console.log("renaming: " + filename + " to: " + newname + " in: " + dirpath);
      fs.rename(filepath, path.resolve(dirpath, newname), function (err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
      return;

    }

    resolve();

  });
}

function decideAction(itempath, doRename) {
  return new Promise(function (resolve, reject) {
    fs.stat(itempath, function (err, stats) {

      if (err && err.code === "EPERM") {
        console.warn("skipping (can't access) path: " + err.path);
        return resolve();
      }

      if (err) {
        return reject(err);
      }

      if (stats.isDirectory()) {
        resolve(fixDirectoryContents(itempath, doRename).then(function () {
          return fixFilename(itempath, doRename);
        }));
      } else if (stats.isFile()) {
        resolve(fixFilename(itempath, doRename));
      } else {
        reject(new Error("unexpected stats result for: " + itempath));
      }

    });
  });
}

function fixDirectoryContents(dirpath, doRename) {
  return new Promise(function (resolve, reject) {
    fs.readdir(dirpath, function (err, contents) {

      if (err) {
        return reject(err);
      }

      Promise.all(contents.map(function (content) {
        return decideAction(path.resolve(dirpath, content), doRename);
      })).then(function () {
        resolve();
      }).catch(function (err2) {
        reject(err2);
      });

    });
  });
}

exports.fixFilename = fixFilename;
exports.fixDirectoryContents = fixDirectoryContents;

// was directly executed
if (require.main === module) {
  (function () {

    var userArgs = process.argv.slice(2);
    var doRename = userArgs.indexOf("--rename") !== -1;
    var pathSpecified = userArgs.indexOf("--path");

    var pathToSearch;
    if (pathSpecified !== -1) {
      pathToSearch = userArgs[pathSpecified + 1];
    } else {
      pathToSearch = process.cwd();
    }

    fixDirectoryContents(pathToSearch, doRename)
      .then(function () {
        console.log("finished without errors");
      })
      .catch(function (err) {
        console.error(err.stack);
      });

  }());
}
