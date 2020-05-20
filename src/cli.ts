import { basename, join } from 'path';
import { existsSync, readFileSync, writeFileSync, lstatSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs';
import { watch } from 'chokidar';
import htmlEncoder from './index.js';

type TargetDef = { path: string; ts?: boolean; ssr?: boolean };
type Entry = {
	source: string | string[];
	target: string | string[] | TargetDef[];
};

const packageJSON = JSON.parse(readFileSync(`${process.cwd()}/package.json`, 'utf-8'));
const entries = packageJSON['html-encode'] || [];
const args = process.argv;
const ts = args.indexOf('ts') > -1;
const ssr = args.indexOf('ssr') > -1;

entries.map((entry: Entry) => {
	const targets = prepareTargets(entry.target, ts, ssr);

	return toArray(entry.source).map((source: string) => {
		return watch(source)
			.on('add', (path) => copy(source, path, targets || [{ path: replaceFileExtension(path, ts), ts, ssr }]))
			.on('change', (path) => copy(source, path, targets || [{ path: replaceFileExtension(path, ts), ts, ssr }]))
			.on('unlink', (path) => remove(source, path, targets || [{ path: replaceFileExtension(path, ts), ts, ssr }]))
			.on(
				'addDir',
				(path) => source !== path && copy(source, path, targets || [{ path: replaceFileExtension(path, ts), ts, ssr }])
			)
			.on('unlinkDir', (path) => remove(source, path, targets || [{ path: replaceFileExtension(path, ts), ts, ssr }]));
	});
});

function prepareTargets(targets: string | string[] | TargetDef[], ts: boolean, ssr: boolean): TargetDef[] {
	return toArray(targets).map((target: string | TargetDef) => {
		return typeof target === 'string' ? { path: target, ts, ssr } : { ts, ssr, ...target };
	});
}

function toArray(element: any) {
	return Array.isArray(element) ? element : [element];
}

function getTargetPath(source: string, file: string, target: string) {
	return file.replace(source, target);
}

function remove(source: string, file: string, targets: TargetDef[]) {
	targets.forEach((target) =>
		removeFileSync(getTargetPath(source, replaceFileExtension(file, target.ts), target.path))
	);
}

function copy(source: string, file: string, targets: TargetDef[]) {
	targets.forEach((target) =>
		console.log(
			copyFolderRecursiveSync(file, {
				...target,
				path: getTargetPath(source, replaceFileExtension(file, target.ts), target.path),
			})
		)
	);
}

function replaceFileExtension(filename: string, toTypescript: boolean) {
	return filename.replace(/.[^.]{1,10}$/, `.${toTypescript ? 'ts' : 'js'}`);
}

function copyFileSync(source: string, target: TargetDef) {
	let targetFile = target.path;

	//if target is a directory a new file with the same name will be created
	if (existsSync(targetFile)) {
		if (lstatSync(targetFile).isDirectory()) {
			targetFile = replaceFileExtension(join(targetFile, basename(source)), target.ts);
		}
	} else {
		targetFile
			.substring(0, target.path.lastIndexOf('/'))
			.split('/')
			.reduce((memo, folder) => {
				memo += folder;
				verifyFolderExists(memo);
				return `${memo}/`;
			}, '');
	}
	writeFileSync(targetFile, htmlEncoder(readFileSync(source, { encoding: 'utf-8' }), target.ts, target.ssr));
}

function verifyFolderExists(folder: string) {
	if (!existsSync(folder)) {
		mkdirSync(folder);
	}
}

function copyFolderRecursiveSync(source: string, target: TargetDef) {
	if (lstatSync(source).isDirectory()) {
		verifyFolderExists(target.path);

		readdirSync(source).forEach((file) => {
			const curSource = join(source, file);

			if (lstatSync(curSource).isDirectory()) {
				copyFolderRecursiveSync(curSource, target);
			} else {
				copyFileSync(curSource, target);
			}
		});
	} else {
		copyFileSync(source, target);
	}

	return `copying ${source} => ${target}`;
}

function removeFileSync(path: string) {
	if (existsSync(path)) {
		if (lstatSync(path).isDirectory()) {
			readdirSync(path).forEach((file) => removeFileSync(`${path}/${file}`));
			rmdirSync(path);
		} else {
			unlinkSync(path); // delete file
		}
	}

	return `removing ${path}`;
}
