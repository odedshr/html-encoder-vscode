import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { watch, FSWatcher } from 'chokidar';
import { Glob } from 'glob';
import htmlEncoder from './htmlEncoder';
import findTargets, { Target, allTargetsPattern } from './findTargets';

if (require.main === module) {
	// this module was run directly from the command line as in node xxx.js

	const args = process.argv.slice(2);
	const entries = args.filter(arg => ['-w', '-watch'].indexOf(arg) === -1)

	encode(entries, entries.length !== args.length).catch(err => console.error(err.message));
}

async function glob(query: string): Promise<string[]> {
	return new Promise((resolve, reject) => new Glob(query, (er, files) =>
		er ? reject(er) : resolve(files)
	));
}

export async function encode(entries: string[] = [], isWatch: boolean = false): Promise<(FSWatcher)[]> {
	if (!entries.length) {
		return new Promise((r, reject) => reject(new Error('no source files provided')));
	}

	const watchers: (FSWatcher)[] = []

	await Promise.all((toArray(entries))
		.map(
			async (entry: string) => (await glob(entry)).map(
				(file: string) => isWatch ? watchers.push(addWatch(file)) : encodeFile(file)
			))
	);

	return watchers;
}

function addWatch(entry: string): FSWatcher {
	return watch(entry)
		.on('add', encodeFile)
		.on('change', encodeFile)
}

function encodeFile(path: string) {
	if (!existsSync(path)) {
		console.error(`file not exists: ${path}`);
	} else if (path.match(/\.template\.html$/)) {
		const text = readFileSync(path, { encoding: 'utf-8' });
		findTargets(path, text).forEach((target: Target) => copyFileSync(text, target))
	}
	return false;
}

function copyFileSync(text: string, target: Target) {
	let targetFile = target.path;
	let accPath: string[] = [];

	targetFile
		.substring(0, target.path.lastIndexOf('/'))
		.split('/')
		.forEach((folder: string) => {
			accPath.push(folder);
			if (accPath.length >= 1 && accPath[0].length) {
				verifyFolderExists(accPath.join('/'));
			}
		});

	writeFileSync(targetFile, htmlEncoder(text.replace(allTargetsPattern, ''), target.type, target.ssr));
}

function verifyFolderExists(folder: string) {
	if (!existsSync(folder)) {
		mkdirSync(folder);
	}
}

function toArray(element: any) {
	return Array.isArray(element) ? element : [element];
}