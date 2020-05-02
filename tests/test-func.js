const assert = require('assert');
const { DOMParser } = require('xmldom');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../dist/index').default;
const { writeFileSync } = require('fs');

const domParser = new DOMParser();

function getOutputString(encodedNode, data) {
	const JSNode = requireFromString(encodedNode).default;
	const jsNode = new JSNode(data, domParser);

	return jsNode.toString();
}

function test(originalString, data = {}, expectedString, description, testFileName = undefined) {
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
