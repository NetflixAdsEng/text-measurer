const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const archiver = require('archiver');
const JSZip = require('jszip');
const uuid = require('uuid/v4');
const Handlebars = require('handlebars');
const escapeRegex = require('escape-regexp');
const moment = require('moment');

const paths = require('./paths');
const utils = require('./utils');
const tracker = require('./tracker');

const debug = require('@ff0000-ad-tech/debug');
const log = debug(require('../package.json').name + ':gwd');

function loadGwdManifest() {
  return new Promise((resolve, reject) => {
    const manifestPath = paths.manifestJsonPath();
    log(`Loading manifest: ${manifestPath}`);
    if (!fs.existsSync(paths.absFile(manifestPath))) {
      reject(new Error(`No GWD manifest was found`));
    }
    utils
      .loadFile(paths.absFile(manifestPath))
      .then(contents => {
        resolve(JSON.parse(contents));
      })
      .catch(error => {
        reject(error);
      });
  });
}

function updateManifestVersion(packageJson) {
  return new Promise((resolve, reject) => {
    packageJson = packageJson || require('../package.json'); // <-- very sketchy...this will get hoisted and immediated loaded when api is run.
    log(` - updating manifest version to v${packageJson.version}`);
    loadGwdManifest()
      .then(manifest => {
        manifest.version = packageJson.version;
        fs.writeFile(paths.manifestJsonPath(), JSON.stringify(manifest, null, 2), err => {
          if (err) {
            return reject(err);
          }
          resolve(packageJson);
        });
      })
      .catch(err => reject(err));
  });
}

function buildGwdPreview(data, contents) {
  return new Promise((resolve, reject) => {
    // compile template
    var template = Handlebars.compile(contents, {
      noEscape: true,
      preventIndent: true
    });

    var tdata = {
      componentId: data.manifest.tagName,
      miBundle: data.miBundle
    };
    // external scripts
    tdata = buildExternalScripts(data.manifest, tdata);
    // files: js, css (also, beyond GWD spec: assets)
    tdata = buildFiles(data.manifest, tdata);

    /* methods
		// TODO(anybody): however much automated generation of gwd's manifest is desired
		tdata = buildMethods(
			manifest,
			tdata
		);
	*/
    // push tdata to template
    var result = template(tdata);

    resolve(result);
  });
}

function buildExternalScripts(manifest, data, tabs) {
  const indent = utils.getIndent(tabs);
  data.externalScripts = '\n';
  if ('externalScripts' in manifest && Array.isArray(manifest.externalScripts)) {
    manifest.externalScripts.forEach(externalScript => {
      data.externalScripts += indent + '<script src="' + externalScript + '"></script>\n';
    });
  }
  return data;
}
function buildFiles(manifest, data, tabs) {
  const indent = utils.getIndent(tabs);
  data.inlinedScripts = '\n';
  data.cssLinks = '\n';
  if ('files' in manifest) {
    // inline js loads
    if ('js' in manifest.files && Array.isArray(manifest.files.js)) {
      manifest.files.js.forEach(path => {
        const content = fs.readFileSync(paths.srcFolderPath() + path, 'utf8');
        data.inlinedScripts += content;
      });
    }

    // build css loads
    if ('css' in manifest.files && Array.isArray(manifest.files.css)) {
      manifest.files.css.forEach(path => {
        data.cssLinks += indent + '<link rel="stylesheet" href="' + path + '">\n';
      });
    }
  }
  return data;
}
/*
function buildMethods(manifest, data, tabs) {
	const indent = utils.getIndent(tabs);
	data.methods = '\n';
	if ('methods' in manifest && Array.isArray(manifest.methods)) {
		manifest.methods.forEach((method) => {
			data.methods += indent + 'component.' + method + '(';
			if ('parameters' in method) {
				method.parameters.forEach((parameter) => {
					data.methods += '';
				});
			}
		});
	}
	data.methods = '';
}
*/

function attachTracker(manifest) {
  return new Promise((resolve, reject) => {
    log(' - adding tracker file as JS dependency');
    var trackerFilename = getTrackerFilename();

    // add tracker to manifest
    if ('files' in manifest) {
      if ('js' in manifest.files) {
        var hasId = false;
        manifest.files.js.forEach(file => {
          if (file == trackerFilename) {
            hasId = true;
            return;
          }
        });
        if (!hasId) {
          manifest.files.js.push(trackerFilename);
        }
      } else {
        manifest.files.js = [trackerFilename];
      }
    } else {
      manifest.files = {
        js: [trackerFilename]
      };
    }

    // write updated manifest
    fs.writeFile(paths.manifestJsonPath(), JSON.stringify(manifest, null, 2), err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

function getTrackerFilename() {
  var trackerFilename;
  fs.readdirSync('./src').forEach(item => {
    if (item.match(/[^\-]{8}\-[^\-]{4}\-[^\-]{4}\-[^\-]{4}\-[^\-]{12}/)) {
      trackerFilename = item;
      return;
    }
  });
  return trackerFilename;
}

function distComponent() {
  return new Promise((resolve, reject) => {
    // load top package
    utils.loadJson(paths.absFile('package.json')).then(packageJson => {
      // load manifest
      loadGwdManifest()
        // prepare destination
        .then(manifest => {
          return new Promise((resolve, reject) => {
            if (!fs.existsSync(paths.distGwdPath())) {
              fs.mkdirSync(paths.distGwdPath());
              resolve(manifest);
            } else {
              rimraf.sync(`${paths.distGwdPath()}/**/*`);
              resolve(manifest);
            }
          });
        })

        // re-path all the assets to root-directory :o
        .then(manifest => {
          return new Promise((resolve, reject) => {
            var zip = new JSZip();
            const zipName = manifest.tagName + '.zip';
            var promises = [];
            if ('files' in manifest) {
              ['js', 'css'].forEach(format => {
                if (format in manifest.files && Array.isArray(manifest.files[format])) {
                  manifest.files[format].forEach((filePath, i) => {
                    const fileName = path.basename(filePath);

                    // build new zip - read file into promise
                    const promise = new Promise((resolve, reject) => {
                      fs.readFile(`./src/${filePath}`, 'utf8', (err, content) => {
                        if (err) {
                          return reject(err);
                        }
                        // write a comment reflecting current version
                        content = applyVersionComment(packageJson, content, fileName);

                        resolve(Buffer.from(content, 'utf8'));
                      });
                    });
                    // promise file to zip
                    zip.file(fileName, promise, { binary: true });

                    // update manifest re-pathed asset
                    manifest.files[format][i] = fileName;

                    promises.push(promise);
                  });
                }
              });
            }
            Promise.all(promises)
              .then(() => {
                // add the manifest to the zip
                zip.file('manifest.json', JSON.stringify(manifest, null, 2));
                // resolve
                resolve({ name: zipName, zip: zip });
              })
              .catch(err => {
                reject(err);
              });
          });
        })

        // create gwd component package
        .then(result => {
          return new Promise((resolve, reject) => {
            result.zip
              .generateNodeStream({
                type: 'nodebuffer',
                streamFiles: true
              })
              .pipe(fs.createWriteStream(paths.distGwdPath() + result.name))
              .on('finish', () => {
                resolve();
              });
          });
        })

        .catch(err => {
          reject(err);
        });
    });
  });
}

function applyVersionComment(packageJson, content, scriptName) {
  const ver = `${packageJson.genericSource.name}:${scriptName}, VERSION: ${packageJson.version}, Published: ${moment().format(
    'YYYY/MM/DD HH:mm:ss'
  )}`;
  return `\n/* ${ver} $*/\n` + content;
}

module.exports = {
  loadGwdManifest,
  updateManifestVersion,
  buildGwdPreview,
  attachTracker,
  distComponent,
  buildFiles
};
