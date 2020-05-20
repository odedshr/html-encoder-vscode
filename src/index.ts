import { DOMParser } from 'xmldom';
import { readFileSync } from 'fs';
import NodeParser from './parser';

const domParser = new DOMParser();

export default function htmlEncoder(html: string, isTypescript = false, isSSR = false) {
	const document: Document = domParser.parseFromString(html.replace(/\n\s+>/g, '>'), 'text/xml');

	return treeShake(transpile(new NodeParser(document), isTypescript, isSSR));
}

function getTemplateFile(isTypescript: boolean) {
	return `${__dirname}/JSNode.${isTypescript ? 'ts' : 'js'}`;
}

function transpile(parser: NodeParser, isTypescript: boolean, isSSR: boolean) {
	let transpiledString = parser.toString();

	if (isSSR) {
		transpiledString += `;//self._SSR = true;\n`;
	}

	if (transpiledString.indexOf('self.set') > -1) {
		transpiledString += `;self._defineSet(${isSSR});`;
	}

	return readFileSync(getTemplateFile(isTypescript), {
		encoding: 'utf-8',
	}).replace(/console\.log\(self, docElm\)[;,]/, `this.node = ${transpiledString};`);
}

function treeShake(code: string) {
	findFeatures(code).forEach((feature) => {
		const query: string =
			code.indexOf(`self.${feature}`) === -1
				? `\\s*\/\/ feature ${feature}\\n[\\s\\S]*?\/\/ feature ${feature} end\n`
				: `\\s*\/\/ feature ${feature}( end)?\\n`;

		code = code.replace(new RegExp(query, 'gm'), '');
	});

	return code;
}

function findFeatures(code: string): string[] {
	const featureFinder: RegExp = /\s*\/\/ feature (_\w*) end\n/g; // /^\t*\/\/ (_\w*)$/g;
	const features: string[] = [];
	let match: RegExpExecArray;
	while ((match = featureFinder.exec(code)) !== null) {
		features.push(match[1]);
	}
	return features;
}
