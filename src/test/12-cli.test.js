const assert = require('assert');
const { normalize } = require('path');
const { existsSync, readdirSync, readFileSync, writeFileSync, watch } = require('fs');
const { exec, spawn } = require('child_process');

const { encode } = require('../../out/cli.js');
const tempFolder = normalize(`${__dirname}/../../.tmp`);
const { addFolder, removeFolder } = require('./utils');

async function commandLine(query) {
	return new Promise((resolve) => exec(query, (error, stdout, stderr) => {
		if (error) {
			console.error(error);
		}

		if (stderr) {
			console.error(stderr);
		}

		console.log(stdout);
		resolve();
	}));
}
describe('htmlEncoder: CLI', () => {
	it('throws error when no files provided', async () => {
		try {
			await encode();
			assert.fail(`should've failed`)
		} catch (err) {
			assert.equal(err.message, 'no source files provided')
		}
	});

	it('ignores non-template html file', async () => {
		const uniqueFolder = `${tempFolder}1`;
		const filename = normalize(`${uniqueFolder}/index.html`);
		removeFolder(uniqueFolder);
		addFolder(uniqueFolder);
		writeFileSync(filename, 'hello world', 'utf-8');
		await encode([filename]);
		const files = readdirSync(uniqueFolder);

		assert.equal(files.length, 1);
		assert.equal(files[0], 'index.html');
		removeFolder(uniqueFolder);
	});

	it('encodes default file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile1.template.html`);
		const outputFile = filename.replace(/\.html$/i, '.js');
		writeFileSync(filename, 'hello world', 'utf-8');
		await encode([filename]);
		assert.ok(existsSync(outputFile), 'js file exists');
		removeFolder(tempFolder);
	});

	it('encodes default file from command line', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile2.template.html`);
		const outputFile = filename.replace(/\.html$/i, '.js');
		writeFileSync(filename, 'hello world', 'utf-8');
		await commandLine(`node ./out/cli ${filename}`);
		assert.ok(existsSync(outputFile), 'js file exists');
		removeFolder(tempFolder);
	});

	it('encodes default typescript file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile3.template.html`);
		const outputFile = filename.replace(/\.html$/i, '.ts');
		writeFileSync(filename, 'hello world<?out *.ts ?>', 'utf-8');
		await encode([filename]);

		assert.ok(existsSync(outputFile), `ts file exists: ${outputFile}`);
		removeFolder(tempFolder);
	});

	it('encode both default typescript and javascript files', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile4.template.html`);
		writeFileSync(filename, 'hello world<?out *.ts ?><?out *.js ?>', 'utf-8');
		await encode([filename]);

		assert.ok(existsSync(filename.replace(/\.html$/i, '.js')), 'js file exists');
		assert.ok(existsSync(filename.replace(/\.html$/i, '.ts')), 'ts file exists');
		removeFolder(tempFolder);
	});

	it('encodes same folder ts', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile5.template.html`);
		writeFileSync(filename, 'hello world<?out ./output.ts ?>', 'utf-8');
		await encode([filename]);

		assert.ok(existsSync(`${tempFolder}/output.ts`), 'ts file exists');
		removeFolder(tempFolder);
	});

	it('handles path not-specified', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile6.template.html`);
		writeFileSync(filename, 'hello world <?out output.ts ?>', 'utf-8');
		await encode([filename]);

		assert.ok(existsSync(`${tempFolder}/output.ts`), 'ts file exists');
		removeFolder(tempFolder);
	});

	it('handles outside folder', async () => {
		addFolder(`${tempFolder}/foo`);
		const filename = normalize(`${tempFolder}/foo/testFile7.template.html`);
		writeFileSync(filename, 'hello world <?out ../output.ts ?>', 'utf-8');
		await encode([filename]);

		assert.ok(existsSync(`${tempFolder}/output.ts`), 'ts file exists');
		removeFolder(tempFolder);
	});

	it('encodes ssr file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile8.template.html`);
		const outputFile = normalize(`${tempFolder}/ssr-test.js`);
		writeFileSync(filename, '<div>Hello <?=name#?></div><?out ssr-test.js ssr?>', 'utf-8');
		await encode([filename]);

		assert.ok(existsSync(outputFile), `js file exists ${outputFile}`);
		const { getNode, initNode } = require(outputFile);
		const ssrNode = getNode({ name: 'world' });
		const node = initNode(ssrNode);
		assert.ok(node.set.name, 'world');
		removeFolder(tempFolder);
	});

	it('encodes es file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile9.template.html`);
		const outputFile = normalize(`${tempFolder}/es-test.js`);
		writeFileSync(filename, '<div>Hello <?=name#?></div><?out es-test.es?>', 'utf-8');
		await encode([filename]);

		assert.ok(existsSync(outputFile), `js file exists ${outputFile}`);
		const fileContent = readFileSync(outputFile);
		assert.ok(fileContent.indexOf('export default class JSNode') > -1);
		removeFolder(tempFolder);
	});

	it('watches files for changes', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile10.template.html`);
		const outputFile = filename.replace(/\.html$/i, '.js');
		writeFileSync(filename, 'hello world', 'utf-8');
		watchers = await encode([filename], true);
		await new Promise(resolve => setTimeout(resolve, 500));
		assert.ok(readFileSync(outputFile, 'utf-8').indexOf('hello world') > -1);
		writeFileSync(filename, 'foo bar', 'utf-8');
		await new Promise(resolve => setTimeout(resolve, 500));
		assert.ok(readFileSync(outputFile, 'utf-8').indexOf('foo bar') > -1);
		watchers.forEach(watcher => watcher.close());
		writeFileSync(filename, 'new content', 'utf-8');
		await new Promise(resolve => setTimeout(resolve, 500));
		assert.ok(readFileSync(outputFile, 'utf-8').indexOf('foo bar') > -1);
		removeFolder(tempFolder);
	});

	it('watches files for changes using command-line', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile10.template.html`);
		const outputFile = filename.replace(/\.html$/i, '.js');
		writeFileSync(filename, 'hello world', 'utf-8');
		const watcher = spawn('node', ['./out/cli', filename, '-w']);

		await new Promise(resolve => setTimeout(resolve, 500));
		assert.ok(readFileSync(outputFile, 'utf-8').indexOf('hello world') > -1);
		writeFileSync(filename, 'foo bar', 'utf-8');
		await new Promise(resolve => setTimeout(resolve, 500));
		assert.ok(readFileSync(outputFile, 'utf-8').indexOf('foo bar') > -1);
		removeFolder(tempFolder);
		watcher.kill();
	});
});
