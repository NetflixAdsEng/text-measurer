const packageJson = require('../package.json')
const componentName = packageJson.name.split('/')[1].replace(/^wc-/, '')

const path = require('path')
var argv = require('minimist')(process.argv.slice(2))

// set app path
global.rootPath = path.resolve(__dirname + '/..') + '/'

const paths = require('./paths')
const installer = require('./installer')
const gwd = require('./gwd')
const build = require('./build')
const dist = require('./dist')
const bundle = require('./bundle')
const tracker = require('./tracker')

const debug = require('@ff0000-ad-tech/debug')
const log = debug(packageJson.name + ':api')
if ('silence' in argv) {
	debug.disable(true)
}

// help
if (argv.help) {
	log(
		`CLI OPTIONS:\n` +
			`node ./lib/api.js\n` +
			`-------------------------------------------------------------------------------------------\n` +
			` --cmd	API COMMAND, options include:\n` +
			`    "install"     install git-hooks\n` +
			`    "build"       use GWD "manifest.json" to create component's "link file", "preview file", and "boilerplate tests file"\n` +
			`    "dist"        from ${paths.srcFolderPath()} generate ${paths.distFolderPath()},\n` +
			`                  mark generic-source as "published",\n` +
			`                  create GWD package at ${paths.distGwdPath()}\n` +
			`    "track"       saves current package.version to the Generic-Source-Tracker file \n\n` +
			`    "sync"        propagates version of npm-package (./dist/npm/) to top-level \n\n` +
			` --silence, squelches console output\n` +
			`-------------------------------------------------------------------------------------------`
	)
	process.exit()
}

// api command
if (!('cmd' in argv)) {
	console.error('No API COMMAND (--cmd) specified')
	process.exit()
}

/* -- INSTALLATION ----
 *
 *
 */
if (argv.cmd == 'install') {
	// add generic-source data to component
	installer
		.attachGenericSource()

		// flag prevents other API command from running without running `npm run init`
		.then(() => {
			return installer.addInit()
		})
		.catch(err => {
			console.error(err)
		})
} else if (!installer.hasInit()) {
	console.log('ERROR!!')
	log('You must run `npm run init`')
	//
	//
} else if (argv.cmd == 'track') {
	/* -- TRACKING ----
	 *
	 *
	 */
	log('Updating package.json & trackers')
	tracker
		// update branch/commit version
		.markVersion()

		// update username and date-modified
		.then(packageJson => {
			return tracker.markUpdated(packageJson)
		})

		// find and update tracker file
		.then(packageJson => {
			return tracker.updateTracker(packageJson)
		})

		// gwd manifest file
		.then(packageJson => {
			return gwd.updateManifestVersion(packageJson)
		})

		// create annotated tag for git
		.then(packageJson => {
			return tracker.tagVersion(packageJson)
		})

		.catch(err => {
			console.error(err)
		})
	//
	//
} else if (argv.cmd == 'build') {
	/* -- BUILD ----
	 *
	 *		Builds out templates for 1) C20/Html Preview, and 2) NPM Entry
	 *		 - ./src/index.html
	 *		 - ./src/main.js
	 */
	// load manifest
	gwd
		.loadGwdManifest()

		.then(manifest => {
			// implement link template
			log('Implementing HTML preview "./index.html"')
			return new Promise((resolve, reject) => {
				build
					// implement HTML preview
					.previewEntry(
						manifest,
						paths.tmplFolderPath() + paths.COMPONENT_PREVIEW_FILENAME,
						paths.srcFolderPath() + paths.COMPONENT_PREVIEW_FILENAME
					)
					// implement NPM entry
					.then(() => {
						log('Implementing NPM entry "./main.js"')
						return build.npmEntry(
							manifest,
							paths.tmplFolderPath() + paths.NPM_ENTRY_FILENAME,
							paths.srcFolderPath() + paths.NPM_ENTRY_FILENAME
						)
					})
					.catch(err => {
						console.error(err)
					})
			})
		})
		.catch(err => {
			console.error(err)
		})
	//
	//
} else if (argv.cmd == 'dist') {
	/* -- DIST ----
	 *
	 *		Creates ./dist files from ./src
	 *		 - ./dist/npm: for C20 preview & download
	 *		 - ./dist/gwd: for Google Web Designer
	 *
	 *		Indicate C20-generic-source is "published"
	 */

	// mark generic-source as "published"
	Promise.resolve()
		.then(() => {
			log('Marking GenericSource.state as "published"')
			return tracker.markPublished()
		})

		// create a bundle: for loading/inlining in Vanilla
		.then(() => {
			log(`Generating single JS bundle at ${paths.distBundlePath()}`)
			return bundle.generate(manifest, paths.distBundlePath(), `${componentName}.min.js`)
		})

		// create gwd package: for integrating in GWD
		.then(() => {
			log(`Generating GWD component at: ${paths.distGwdPath()}`)
			return gwd.distComponent()
		})

		.catch(err => {
			console.error(err)
		})
} else if (argv.cmd == 'sync') {
	/* -- SYNC ----
	 *
	 *		Propagates NPM-package version
	 *
	 *   This is happening in the ./dist/npm/package.json folder because that's the folder we want to publish.
	 *   NP doesn't currently have option to target sub-directory. Looking at "lerna" for something like that in the future.
	 *
	 *   So, incrementing the version number only on the ./dist/package.json isn't enough
	 *   It must also be propagated to:
	 *     ./package.json, for GitHub/C20 release version to be correct
	 *     ./src/package.json, so that src is current for subsequent build/dist operations
	 */
	dist.syncNpmVersions().catch(err => {
		console.err(err)
	})
}
