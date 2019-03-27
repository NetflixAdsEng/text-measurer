const fs = require('fs');
const path = require('path');
const ncp = require('ncp').ncp;
const rimraf = require('rimraf');
const UglifyJS = require('uglify-js');

const paths = require('./paths');
const utils = require('./utils');
const gwd = require('./gwd');

const debug = require('@ff0000-ad-tech/debug');
const log = debug(require('../package.json').name + ':bundle');

// bundles javasc
function generate(manifest, distPath, name) {
  return new Promise((resolve, reject) => {
    const manifestPromise = Promise.resolve(manifest);
    if (!manifest) {
      manifestPromise = gwd.loadGwdManifest();
    }
    manifestPromise
      .then(manifest => {
        // generate single block of code from GWD manifest
        data = gwd.buildFiles(manifest, {});

        // uglify it
        const min = UglifyJS.minify(data.inlinedScripts);

        // write file
        if (!fs.existsSync(distPath)) {
          fs.mkdirSync(distPath);
        }
        fs.writeFile(`${distPath}/${name}`, min.code, err => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      })
      .catch(err => {
        return reject(err);
      });
  });
}

module.exports = {
  generate
};
