import * as assert from 'assert';

import * as vscode from 'vscode';
import { normalize } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { addFolder, removeFolder, saveFile } from './utils';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', async () => {
	vscode.window.showInformationMessage('Start all tests');
	const tempFolder = normalize(`${__dirname}/../../.tmp`);

	test('non-template html file', async function () {
		this.timeout(6000);

		const uniqueFolder = `${tempFolder}1`;
		addFolder(uniqueFolder);
		await saveFile(normalize(`${uniqueFolder}/index.html`), 'hello world', '!');
		const files = readdirSync(uniqueFolder);

		assert.strictEqual(files.length, 1);
		assert.strictEqual(files[0], 'index.html');
		removeFolder(uniqueFolder);
	});

	test('default file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile1.template.html`);
		const outputFile = filename.replace(/\.html$/i, '.js');
		await saveFile(filename, 'hello world', '!');

		assert.ok(existsSync(outputFile), `${outputFile} file exists`);
		removeFolder(tempFolder);
	});

	test('default typescript file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile2.template.html`);
		const outputFile = filename.replace(/\.html$/i, '.ts');
		await saveFile(filename, 'hello world', '<?out *.ts ?>');

		assert.ok(existsSync(outputFile), 'ts file exists');
		removeFolder(tempFolder);
	});

	test('both default typescript and javascript files', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile3.template.html`);
		await saveFile(filename, 'hello world', '<?out *.ts ?><?out *.js ?>');

		assert.ok(existsSync(filename.replace(/\.html$/i, '.js')), 'js file exists');
		assert.ok(existsSync(filename.replace(/\.html$/i, '.ts')), 'ts file exists');
		removeFolder(tempFolder);
	});

	test('same folder ts', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile4.template.html`);
		await saveFile(filename, 'hello world', '<?out ./output.ts?>');

		assert.ok(existsSync(`${tempFolder}/output.ts`), 'ts file exists');
		removeFolder(tempFolder);
	});

	test('path not-specified', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile5.template.html`);
		await saveFile(filename, 'hello world', '<?out output.ts ?>');

		assert.ok(existsSync(`${tempFolder}/output.ts`), 'ts file exists');
		removeFolder(tempFolder);
	});

	test('outside folder', async () => {
		addFolder(`${tempFolder}/foo`);
		const filename = normalize(`${tempFolder}/foo/testFile6.template.html`);
		await saveFile(filename, 'hello world', '<?out ../output.ts ?>');

		assert.ok(existsSync(`${tempFolder}/output.ts`), 'ts file exists');
		removeFolder(tempFolder);
	});

	test('es file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile8.template.html`);
		const outputFile = normalize(`${tempFolder}/es-test.js`);
		await saveFile(filename, '<div>Hello <?=name#?></div>', '<?out es-test.es?>');

		assert.ok(existsSync(outputFile), `js file exists ${outputFile}`);
		const fileContent = readFileSync(outputFile);
		assert.ok(fileContent.indexOf('export default class JSNode') > -1);
		removeFolder(tempFolder);
	});

	test('ssr file', async () => {
		addFolder(tempFolder);
		const filename = normalize(`${tempFolder}/testFile7.template.html`);
		const browserFile = normalize(`${tempFolder}/ssr-test-browser.js`);
		const serverFile = normalize(`${tempFolder}/ssr-test-server.js`);

		await saveFile(filename, '<div>Hello <?=name#?></div>', '<?out ssr-test-server.js ssr?><?out ssr-test-browser.js ?>');
		assert.ok(existsSync(serverFile), `server file exists ${serverFile}`);
		assert.ok(existsSync(browserFile), `browser file exists ${browserFile}`);

		const { getNode } = await import(serverFile);
		const { initNode } = await import(browserFile);
		const ssrNode = getNode({ name: 'world' });
		const node = initNode(ssrNode);
		assert.ok(node.set.name, 'world');
		removeFolder(tempFolder);
	});
});