import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const external = [
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.peerDependencies || {}),
	'child_process',
	'fs',
	'http',
	'os',
	'path'
];
const plugins = [
	typescript({
		typescript: require('typescript')
	})
];
const withMinify = [
	...plugins,
	terser() // minifies generated bundles
];

const modules = [
	{ name: 'index', file: 'dist/index.js', format: 'cjs', plugins: withMinify },
	{ name: 'cli', file: 'dist/cli.js', format: 'cjs', plugins: withMinify },
	{ name: 'JSNode', file: 'dist/JSnode.js', format: 'cjs', plugins }
];

export default modules.map(({ name, file, format }) => ({
	input: `src/${name}.ts`,
	output: { file, format, name },
	//sourcemap:true,
	//globals:{},
	plugins,
	external
}));
