const fs = require('fs');
const debug = require('@ff0000-ad-tech/debug');
const log = debug(require('../package.json').name + ':utils');

// promise load
function loadFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, contents) => {
      if (err) {
        reject(err);
      }
      resolve(contents);
    });
  });
}
// promise write
function writeFile(path, contents) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, contents, err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}
// promise load json
function loadJson(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, contents) => {
      if (err) {
        reject(err);
      }
      resolve(JSON.parse(contents));
    });
  });
}

const ignoreFiles = ['__MACOSX', '.DS_Store'];
function isIgnoreFile(path) {
  var filename = path.match(/[^\/]*$/)[0];
  for (var i in ignoreFiles) {
    if (isHiddenFile(filename)) return true;
    if (filename.indexOf(ignoreFiles[i]) != -1) return true;
  }
}
function isHiddenFile(filename) {
  if (filename.indexOf('.') == 0) {
    return true;
  }
}
function getIndent(tabs) {
  tabs = tabs || 2;
  return '\t'.repeat(tabs);
}

module.exports = {
  loadFile,
  writeFile,
  loadJson,
  ignoreFiles,
  isIgnoreFile,
  getIndent
};
