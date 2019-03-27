const fs = require('fs');
const path = require('path');
const ncp = require('ncp').ncp;
const rimraf = require('rimraf');

const paths = require('./paths');
const utils = require('./utils');

const debug = require('@ff0000-ad-tech/debug');
const log = debug(require('../package.json').name + ':dist');

const readmePath = './README.md';
const changeLogPath = './CHANGELOG.md';

function entry() {
  return new Promise((resolve, reject) => {});
}

// build ./src/ to ./[distPath]/
function src(distPath) {
  return new Promise((resolve, reject) => {
    //
    prepareDist(distPath)
      .then(() => {
        const srcFolder = paths.srcFolderPath();
        fs.readdir(srcFolder, (error, items) => {
          if (error) {
            reject(error);
          }
          // for each item in srcFolder
          var promises = [];
          items.forEach(item => {
            if (!utils.isIgnoreFile(srcFolder + '/' + item)) {
              promises.push(
                ncp(srcFolder + '/' + item, distPath + '/' + item, error => {
                  if (error) {
                    console.error(error);
                    return reject(error);
                  }
                  resolve();
                })
              );
            }
          });

          // copy top-level README to ./dist/npm
          promises.push(
            ncp(
              readmePath,
              `${distPath}/README.md`,
              error => {
                if (error) {
                  console.error(error);
                  return reject(error);
                }
              },
              resolve()
            )
          );

          // copy top-level CHANGELOG to ./dist/npm
          promises.push(
            ncp(
              changeLogPath,
              `${distPath}/CHANGELOG.md`,
              error => {
                if (error) {
                  console.error(error);
                  return reject(error);
                }
              },
              resolve()
            )
          );

          Promise.all(promises)
            .then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
        });
      })

      .catch(error => {
        return reject(error);
      });
  });
}

function prepareDist(distPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath);
      resolve();
    } else {
      rimraf(distPath + '/*', error => {
        if (error) {
          console.error(error);
          return reject(error);
        }
        resolve();
      });
    }
  });
}

/* Propagate dist-version number back to:
 *  - ./package.json, the GitHub release version
 *  - ./src/package.json, so subsequent build/dist operations are in-sync with what was published
 */
function syncNpmVersions() {
  return new Promise((resolve, reject) => {
    fs.readFile(`${paths.distNpmPath()}/package.json`, (err, data) => {
      if (err) {
        return reject(err);
      }
      const npmPackage = JSON.parse(data);
      const promises = [
        updatePackageVersion(`./package.json`, npmPackage),
        updatePackageVersion(`./src/package.json`, npmPackage)
      ];
      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
  });
}

function updatePackageVersion(targetPath, pkg) {
  return new Promise((resolve, reject) => {
    fs.readFile(targetPath, (err, data) => {
      if (err) {
        return reject(err);
      }
      const targetPkg = JSON.parse(data);
      targetPkg.version = pkg.version;
      fs.writeFile(targetPath, JSON.stringify(targetPkg, null, 2), err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

module.exports = {
  src,
  syncNpmVersions
};
