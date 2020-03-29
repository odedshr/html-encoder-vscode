import { basename, join } from 'path';
import { existsSync, readFileSync, writeFileSync, lstatSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs';
import { watch } from 'chokidar';
import htmlEncoder from './index.js';

type Entry = {
	source: string;
	target: string;
};

const packageJSON = JSON.parse(readFileSync(`${process.cwd()}/package.json`, 'utf-8'));
const entries = packageJSON['html-encode'] || [];
const toTypescript = packageJSON['html-encode-to-ts'] === 'true';

entries.map((entry: Entry) => {
	const targets = entry.target ? toArray(entry.target) : false;

	return toArray(entry.source).map(source => {
		return watch(source)
			.on('add', path => copy(source, path, targets || [replaceFileExtension(path, toTypescript)], toTypescript))
			.on('change', path => copy(source, path, targets || [replaceFileExtension(path, toTypescript)], toTypescript))
			.on('unlink', path => remove(source, path, targets || [replaceFileExtension(path, toTypescript)]))
			.on(
				'addDir',
				path =>
					source !== path && copy(source, path, targets || [replaceFileExtension(path, toTypescript)], toTypescript)
			)
			.on('unlinkDir', path => remove(source, path, targets || [replaceFileExtension(path, toTypescript)]));
	});
});

function toArray(element: any) {
	return Array.isArray(element) ? element : [element];
}

function getTargetPath(source: string, file: string, target: string) {
	return file.replace(source, target);
}

function remove(source: string, file: string, targets: string[]) {
	targets.forEach(target => removeFileSync(getTargetPath(source, replaceFileExtension(file, toTypescript), target)));
}

function copy(source: string, file: string, targets: string[], toTypescript: boolean) {
	targets.forEach(target =>
		console.log(
			copyFolderRecursiveSync(
				file,
				getTargetPath(source, replaceFileExtension(file, toTypescript), target),
				toTypescript
			)
		)
	);
}

function replaceFileExtension(filename: string, toTypescript: boolean) {
	return filename.replace(/.[^.]{1,10}$/, `.${toTypescript ? 'ts' : 'js'}`);
}

function copyFileSync(source: string, target: string, toTypescript: boolean) {
	let targetFile = target;

	//if target is a directory a new file with the same name will be created
	if (existsSync(target)) {
		if (lstatSync(target).isDirectory()) {
			targetFile = replaceFileExtension(join(target, basename(source)), toTypescript);
		}
	} else {
		target
			.substring(0, target.lastIndexOf('/'))
			.split('/')
			.reduce((memo, folder) => {
				memo += folder;
				verifyFolderExists(memo);
				return `${memo}/`;
			}, '');
	}
	writeFileSync(targetFile, htmlEncoder(readFileSync(source, { encoding: 'utf-8' }), toTypescript));
}

function verifyFolderExists(folder: string) {
	if (!existsSync(folder)) {
		mkdirSync(folder);
	}
}

function copyFolderRecursiveSync(source: string, target: string, toTypescript: boolean) {
	if (lstatSync(source).isDirectory()) {
		verifyFolderExists(target);

		readdirSync(source).forEach(file => {
			const curSource = join(source, file);

			if (lstatSync(curSource).isDirectory()) {
				copyFolderRecursiveSync(curSource, target, toTypescript);
			} else {
				copyFileSync(curSource, target, toTypescript);
			}
		});
	} else {
		copyFileSync(source, target, toTypescript);
	}

	return `copying ${source} => ${target}`;
}

function removeFileSync(path: string) {
	if (existsSync(path)) {
		if (lstatSync(path).isDirectory()) {
			readdirSync(path).forEach(file => removeFileSync(`${path}/${file}`));
			rmdirSync(path);
		} else {
			unlinkSync(path); // delete file
		}
	}

	return `removing ${path}`;
}
