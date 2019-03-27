const fs = require('fs');
const path = require('path');
const walk = require('walk');
const exec = require('child_process').exec;

const paths = require('./paths');

const debug = require('@ff0000-ad-tech/debug');
const log = debug(require('../package.json').name + ':tracker');

// flag communicates to Monet whether this component can be previewed
function markPublished(packageJson) {
  return new Promise((resolve, reject) => {
    packageJson = packageJson || require('../package.json'); // <-- very sketchy...this will get hoisted and immediated loaded when api is run.
    packageJson.genericSource.state = 'published';
    packageJson.genericSource.updated = new Date().getTime();
    fs.writeFile('./package.json', JSON.stringify(packageJson, null, 2) + '\n', err => {
      if (err) {
        return reject(err);
      }
      resolve(packageJson);
    });
  });
}

// update the version
function markVersion(packageJson) {
  return new Promise((resolve, reject) => {
    packageJson = packageJson || require('../package.json'); // <-- very sketchy...this will get hoisted and immediated loaded when api is run.
    log(` - adding package version ${packageJson.version}`);
    packageJson.genericSource.version = packageJson.version;
    fs.writeFile('./package.json', JSON.stringify(packageJson, null, 2) + '\n', err => {
      if (err) {
        return reject(err);
      }
      resolve(packageJson);
    });
  });
}

// update modified
function markUpdated(packageJson) {
  return new Promise((resolve, reject) => {
    log(` - set updated time`);
    packageJson = packageJson || require('../package.json'); // <-- very sketchy...this will get hoisted and immediated loaded when api is run.
    packageJson.genericSource.username = 'GitHub';
    packageJson.genericSource.updated = new Date().getTime();
    fs.writeFile('./package.json', JSON.stringify(packageJson, null, 2) + '\n', err => {
      if (err) {
        return reject(err);
      }
      resolve(packageJson);
    });
  });
}

// update trackers
function updateTracker(packageJson) {
  return new Promise((resolve, reject) => {
    packageJson = packageJson || require('../package.json'); // <-- very sketchy...this will get hoisted and immediated loaded when api is run.
    log(` - updating tracker ${packageJson.genericSource.id}.js`);

    // look for generic source tracker files in ./src
    var genericSourceRegex = /(module\.exports\s*=\s*)([^]*?\n\})/;
    walk
      .walk('./src')
      .on('file', (root, stat, next) => {
        if (stat.name == packageJson.genericSource.id + '.js') {
          const trackerJsPath = root + '/' + stat.name;
          fs.readFile(trackerJsPath, 'utf8', (err, data) => {
            if (err) {
              return reject(err);
            }
            // write updated generic-source-json back to tracker
            var result = data.replace(genericSourceRegex, '$1' + JSON.stringify(packageJson.genericSource, null, 2));
            fs.writeFile(trackerJsPath, result, err => {
              if (err) {
                return reject(err);
              }
            });
          });
        }
        next();
      })
      .on('errors', function(entry, stat) {
        reject(new Error('Looking for gs-tracker files:\n', stat[0].error.Error));
      })
      .on('end', function() {
        resolve(packageJson);
      });
  });
}

// create annotated tag, to be commited to GitHub
function tagVersion(packageJson) {
  return new Promise((resolve, reject) => {
    exec(`git tag -a v${packageJson.version} -m "${packageJson.version}"`, err => {
      if (err) {
        return reject(err);
      }
      resolve(packageJson);
    });
  });
}

module.exports = {
  markPublished,
  markVersion,
  markUpdated,
  updateTracker,
  tagVersion
};
