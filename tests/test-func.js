const assert = require('assert');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../dist/index').default;
const { writeFileSync } = require('fs');

function getOutputString(encodedNode, data) {
	const JSNode = requireFromString(encodedNode).default;
	const jsNode = new JSNode(data);

	return jsNode.toString();
}

function test(originalString, data = {}, expectedString, description, testFileName = undefined) {
	const encodedNode = htmlEncoder(originalString, false, true);

	try {
		const actual = getOutputString(encodedNode, data);

		if (testFileName) {
			writeFileSync(`${testFileName}.log.js`, encodedNode);
		}

		assert.equal(actual, expectedString, description);
	} catch (err) {
		console.error(err, originalString);
		assert.fail();
	}
}

module.exports = { test };
