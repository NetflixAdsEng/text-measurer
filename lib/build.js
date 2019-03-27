const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const varname = require('varname');

const paths = require('./paths');
const utils = require('./utils');
const gwd = require('./gwd');

const debug = require('@ff0000-ad-tech/debug');
const log = debug(require('../package.json').name + ':build');

function previewEntry(manifest, templatePath, implementationPath) {
	log(` - template: ${templatePath}\n - destination: ${implementationPath}`);
	return new Promise((resolve, reject) => {
		// get monet-integrator build
		loadMonetIntegratorBundle()
			.then(miBundle => {
				// then build it out
				return utils.loadFile(paths.absFile(templatePath)).then(contents => {
					return gwd.buildGwdPreview({ manifest, miBundle }, contents);
				});
			})
			// save
			.then(template => {
				return utils.writeFile(paths.absFile(implementationPath), template);
			})
			// resolve
			.then(() => {
				resolve(manifest);
			})
			// errors
			.catch(error => {
				console.error(error);
				reject(error);
			});
	});
}

const loadMonetIntegratorBundle = async () => {
	const miPath = path.resolve('./node_modules/@netflixadseng/wc-monet-integrator');
	if (!fs.existsSync(`${miPath}/package.json`)) {
		log(`\nWARNING:`);
		log(` Unable to load Monet Integrator at ${miPath}`);
		log(` This may affect component's ability to render a preview of itself.\n`);
	} else {
		const miPackage = JSON.parse(await fsp.readFile(`${miPath}/package.json`));
		// package.json: "bundle" property has path to minified MI bundle
		const miBundle = await fsp.readFile(path.resolve(miPath, miPackage.bundle));
		return miBundle;
	}
};

function npmEntry(manifest, templatePath, implementationPath) {
	log(` - template: ${templatePath}\n - destination: ${implementationPath}`);
	return new Promise((resolve, reject) => {
		// load link template
		fs.readFile(templatePath, 'utf-8', (err, contents) => {
			if (err) {
				return reject(err);
			}
			// compile handlebars template
			var hb = Handlebars.compile(contents, {
				noEscape: true,
				preventIndent: true
			});

			// construct imports from manifest
			var data = {
				imports: '',
				assets: ''
			};
			// relative paths
			for (var ext in manifest.files) {
				let nodeModules = [];
				manifest.files[ext].forEach(scriptPath => {
					const script = path.normalize(`${scriptPath}`);
					// js, css - declare dependencies as imports so that webpack will pick them up
					if (ext == 'js' || ext == 'css') {
						if (script.match(/^node_modules/)) {
							let importPath;
							// is a path to a file in a node-modules package
							const orgNameMatch = script.match(/^node_modules\/(@[^\/]+\/[^\/]+)/);
							if (orgNameMatch) {
								// is an organization package, like "@netflixadseng/wc-component-name"
								importPath = orgNameMatch[1];
							} else {
								// is a regular package, like "npm-package-name"
								const pkgNameMatch = script.match(/^node_modules\/([^\/]+)/);
								importPath = pkgNameMatch[1];
							}
							// there may be multiple files included from a single package, but we should only include the package once
							if (!nodeModules.includes(importPath)) {
								nodeModules.push(importPath);
								data.imports += `import '${importPath}'\n`;
							}
						} else {
							// is a relative path to a discreet file
							data.imports += `import './${script}'\n`;
						}
					} else if (ext == 'assets') {
						// assets - works in tandem with pk-component-assets,
						//  the idea here is to enable webpack to import component assets and
						//  make them available to the component via ComponentAssets, see https://github.com/NetflixAdsEng/pk-component-assets
						const assetName = varname.camelback(path.basename(script).split('.')[0]);
						data.assets += `import ${assetName} from '${importPath}'\n` + `ComponentAssets.add('${script}', ${assetName})\n`;
					}
				});
			}

			// absolute paths
			for (var i in manifest.externalScripts) {
				data.imports += `// IMPORTANT !!! Absolute URLs must be handled manually:\n` + `//  ${manifest.externalScripts[i]}\n`;
			}

			// write template output
			fs.writeFile(implementationPath, hb(data), err => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});
	});
}

module.exports = {
	previewEntry,
	npmEntry
};
