import { DOMParser } from 'xmldom';
import { readFileSync } from 'fs';
import NodeParser from './parser';

const domParser = new DOMParser();
const encoding = 'utf-8';

export default function htmlEncoder(html: string, isTypescript = false, isSSR = false) {
	const document: Document = domParser.parseFromString(html.replace(/\n\s+>/g, '>'), 'text/xml');

	return treeShake(transpile(new NodeParser(document), isTypescript, isSSR));
}

function getTemplateFile(isTypescript: boolean) {
	return `${__dirname}/JSNode.${isTypescript ? 'ts' : 'js'}`;
}

function transpile(parser: NodeParser, isTypescript: boolean, isSSR: boolean) {
	let parsedString = parser.toString();

	if (isSSR) {
		// variable isn't really being used, except for the tree-shaking phase
		parsedString += `;\n//_SSR();\n`;
	}

	if (parsedString.indexOf('self.register') > -1) {
		parsedString += `;self._defineSet(${isSSR});`;
	}

	return readFileSync(getTemplateFile(isTypescript), { encoding })
		.replace(/console\.log\(self, docElm\)[;,]/, `this.node = ${parsedString};`)
		.replace(/\/\/ functions go here/, parser.getFunctions());
}

function treeShake(code: string) {
	findFeatures(code).forEach((feature) => {
		const query: string = isFeatureUsed(code, feature)
			? `\\s*\/\/ feature ${feature}( end)?` // remove feature's comments
			: `\\s*\/\/ feature ${feature}\\n[\\s\\S]*?\/\/ feature ${feature} end`; // remove feature

		code = code.replace(new RegExp(query, 'gm'), '');
	});

	return code;
}

function isFeatureUsed(code: string, feature: string): boolean {
	return (code.match(new RegExp(`${feature} = function|${feature}\\(`, 'gm')) || []).length > 1;
}

function findFeatures(code: string): string[] {
	const featureFinder: RegExp = /\s*\/\/ feature (\w*) end\n/g; // /^\t*\/\/ (_\w*)$/g;
	const features: string[] = [];
	let match: RegExpExecArray;
	while ((match = featureFinder.exec(code)) !== null) {
		features.push(match[1]);
	}
	return features;
}
