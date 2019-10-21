// ./node_modules/.bin/rollup -f cjs ./html-encoder/src/index.js -o  ./html-encoder/dist/cli.js

import { existsSync, readFileSync, writeFileSync } from 'fs';
import htmlEncoder from './index.js';

const [input, output] = process.argv.slice(2);
const toTypescript = output.endsWith('.ts');

if (!existsSync(input)) {
	console.error(`File not exists - ${input}`);
	process.exit();
}

writeFileSync(output, htmlEncoder(readFileSync(input, { encoding: 'utf-8' }), toTypescript));
console.log(`transpiled to ${output}`);
