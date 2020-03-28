const assert = require('assert');
const { DOMParser } = require('xmldom');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../tests/dist/index').default;
const { writeFileSync } = require('fs');

function getOutputString(encodedNode, data) {
	const JSNode = requireFromString(encodedNode).default;
	JSNode.DOMParser = DOMParser;
	return new JSNode(data).toString();
}

function test(originalString, data = {}, expectedString, description, testFileName = false) {
	const encodedNode = htmlEncoder(originalString);

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
