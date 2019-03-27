var path = require('path');

/* -- Pathing -----------------------------------------------
 *
 *	 NOTE: All paths are relative to `global.rootPath`
 *
 */
var self = (module.exports = {
  SRC_FOLDER: 'src/',
  TEST_FOLDER: 'test/',

  DIST_FOLDER: 'dist/',
  GWD_FOLDER: 'gwd/',
  NPM_PKG_FOLDER: 'npm/',
  BUNDLE_FOLDER: 'npm/bundle/',

  GWD_MANIFEST_JSON_FILENAME: 'manifest.json',

  COMPONENT_TEMPLATES_FOLDER: 'tmpl/',
  COMPONENT_PREVIEW_FILENAME: 'index.html',
  NPM_ENTRY_FILENAME: 'main.js',

  manifestJsonPath: () => {
    return `./${self.SRC_FOLDER + self.GWD_MANIFEST_JSON_FILENAME}`;
  },
  srcFolderPath: () => {
    return `./${self.SRC_FOLDER}`;
  },
  testFolderPath: () => {
    return `./${self.TEST_FOLDER}`;
  },
  distFolderPath: () => {
    return `./${self.DIST_FOLDER}`;
  },
  distGwdPath: () => {
    return `./${self.DIST_FOLDER + self.GWD_FOLDER}`;
  },
  distNpmPath: () => {
    return `./${self.DIST_FOLDER + self.NPM_PKG_FOLDER}`;
  },
  distBundlePath: () => {
    return `./${self.DIST_FOLDER + self.BUNDLE_FOLDER}`;
  },

  tmplFolderPath: () => {
    return `./${self.COMPONENT_TEMPLATES_FOLDER}`;
  },

  escapePath: path => {
    return path
      .replace(' ', ' ')
      .replace("'", "\\'")
      .replace('(', '(')
      .replace(')', ')')
      .replace('-', '-')
      .replace('&', '&');
  },
  absFile: subpath => {
    return path.resolve(global.rootPath + subpath);
  },
  absPath: subpath => {
    return self.absFile(subpath) + '/';
  }
});
