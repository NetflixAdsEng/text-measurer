const fs = require('fs');
const path = require('path');
const ncp = require('ncp').ncp;
const rimraf = require('rimraf');

const paths = require('./paths');
const utils = require('./utils');
const gwd = require('./gwd');

const debug = require('@ff0000-ad-tech/debug');
const log = debug(require('../package.json').name + ':installer');


const GIT_HOOKS_PATH = './.git/hooks/';
const PROJECT_HOOKS_PATH = './hooks/';
const PRE_COMMIT_HOOK = 'pre-commit';


function hasInit() {
	return fs.existsSync('.init');
}
function addInit() {
	return new Promise((resolve, reject) => {
		log('c20 initialization complete');
		fs.writeFile('.init', 'This file insures component has been initialized, ex: `npm run init`', (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}


function installGitHooks() {
	return new Promise((resolve, reject) => {
		// if hooks path doesn't exist, the component is being installed as an NPM component
		if (!fs.existsSync(GIT_HOOKS_PATH)) {
			return resolve();
		}
		// if a `pre-commit` hook already exists
		if (fs.existsSync(GIT_HOOKS_PATH + PRE_COMMIT_HOOK)) {
			log('WARNING: "' + PRE_COMMIT_HOOK + '" already exists at "./.git/hooks/" - not installing project pre-commit hook');
			return resolve();
		}
		// install hooks
		ncp(
			PROJECT_HOOKS_PATH + PRE_COMMIT_HOOK,
			GIT_HOOKS_PATH + PRE_COMMIT_HOOK, 
			(err) => {
				if (err) {
					log('WARNING: "' + PRE_COMMIT_HOOK + '" not installed: ', err);
					return reject(err);
				}
				fs.chmodSync(GIT_HOOKS_PATH + PRE_COMMIT_HOOK, '755');
				log('"' + PRE_COMMIT_HOOK + '" has been installed at "./.git/hooks/"');
				resolve();
			}
		);
	});
}


/* -- ATTACH GENERIC SOURCE ---------------------------------
 *
 *		The idea here is to persist the "genericSource" property from "package.json"
 *		so that this component can be tracked throughout the Monet ecosystem.
 *
 *		In the case of GWD builds, the tracker-file is added as a JS dependency in 
 *		the manifest.json, so that GWD will properly package the tracker in the 
 *		published source.
 *
 *		Future Generic-source scaffolds will need to manage inclusion of the 
 *		tracker file on their own.
 *
 */
function attachGenericSource() {
	log('Attaching Generic-source tracker in ./src/');

	// if this is a GWD component
	if (fs.existsSync(paths.manifestJsonPath())) {
		return gwd.loadGwdManifest().then(manifest => {
			return gwd.attachTracker(manifest);
		});
	}

	// if this is another type of component...
	else {
		return Promise.resolve();
	}
}









module.exports = {
	hasInit: hasInit,
	addInit: addInit,
	installGitHooks: installGitHooks,
	attachGenericSource: attachGenericSource
}

