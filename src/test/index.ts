import { resolve as resolvePath } from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = resolvePath(__dirname, '..');

	return new Promise((resolve, reject) => {
		glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return reject(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(resolvePath(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => (failures > 0) ? reject(new Error(`${failures} tests failed.`)) : resolve());
			} catch (err) {
				console.error(err);
				reject(err);
			}
		});
	});
}
