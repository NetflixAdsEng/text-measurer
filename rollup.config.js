import { uglify } from 'rollup-plugin-uglify'
import babel from 'rollup-plugin-babel'

export default {
	input: 'src/TextMeasurer.js',
	plugins: [
		babel({
			exclude: ['node_modules/**'],
			presets: [
				[
					'@babel/preset-env',
					{
						targets: {
							browsers: ['ie >= 8']
						},
						modules: false
					}
				]
			]
		}),
		uglify()
	],
	output: {
		name: 'TextMeasurer',
		file: 'dist/TextMeasurer.min.js',
		format: 'umd'
	}
}
