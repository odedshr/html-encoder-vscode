import { existsSync, mkdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
//@ts-ignore
import * as NYC from 'nyc';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export async function run(): Promise<void> {
	const tempDir = resolvePath(__dirname, '..', '..', '.nyc_output');
	const reportDir = resolvePath(__dirname, '..', '..', 'coverage');
	[tempDir, reportDir].forEach(folder => _mkDirIfExists(folder));

	const nyc = new NYC({
		cwd: resolvePath(__dirname, '..', '..', 'out'),
		all: true,
		reportDir,
		tempDir,
		reporter: [
			'html',
			'json-summary',
		],
		extension: ['.ts', '.js'],
		sourceMap: true,
		instrument: true,
		include: ['*.ts', '*.js'],
		exclude: [
			"**/*.d.ts",
			"**/*.test.ts",
		]
	});
	nyc.addAllFiles();
	await nyc.createTempDirectory();

	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = resolvePath(__dirname, '..');

	const files: Array<string> = await new Promise((resolve, reject) =>
		glob(
			'**/**.test.js',
			{ cwd: testsRoot },
			(err, files) => err ? reject(err) : resolve(files)
		)
	);

	// Add files to the test suite
	files.forEach(f => mocha.addFile(resolvePath(testsRoot, f)));

	const failures: number = await new Promise(resolve => mocha.run(resolve));
	await nyc.writeCoverageFile();
	await nyc.report();

	if (failures > 0) {
		throw new Error(`${failures} tests failed.`);
	}
}

function _mkDirIfExists(dir: string): void {
	if (!existsSync(dir)) {
		mkdirSync(dir);
	}
}