const assert = require('assert');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../../out/htmlEncoder').default;
const { writeFileSync } = require('fs');

function getOutputString(encodedNode, data) {
  const getNode = requireFromString(encodedNode).getNode;
  const jsNode = getNode(data);

  return jsNode.toString();
}

// test() created a JS-based SSR-compatible node and compares it to the expected string
function test(originalString, data = {}, expectedString, description, testFileName = undefined) {
  const encodedNode = htmlEncoder(originalString, 'js', true);
  try {
    if (testFileName) {
      writeFileSync(`${testFileName}.log.js`, encodedNode);
    }

    assert.equal(getOutputString(encodedNode, data), expectedString, description);
  } catch (err) {
    console.error(err, originalString);
    assert.fail();
  }
}

// getNode() returns a JS-based browser-compatible node (we forcefully inject DOMParser in so it could still run server-side)
function getNode(htmlString, data, testFileName = undefined) {
  const encoded = htmlEncoder(htmlString).replace(
    'class JSNode',
    `var xmldom_1 = require("xmldom");var window = { DOMParser: xmldom_1.DOMParser };\nclass JSNode`
  );
  if (testFileName) {
    writeFileSync(`${testFileName}.log.js`, encoded);
  }

  const getNode = requireFromString(encoded).getNode;
  return getNode(data);
}

// getSSRNode() creates a JS-based SSR-compatible node but then use it as a base for browser-compatible node to return
function getSSRNode(htmlString, data, testFileName = undefined) {
  const SSREncoded = htmlEncoder(htmlString, 'js', true);
  const getNode = requireFromString(SSREncoded).getNode;
  const node = getNode(data);

  if (testFileName) {
    writeFileSync(`${testFileName}.log.js`, encoded);
  }

  const browserEncoded = htmlEncoder(htmlString).replace(
    'class JSNode',
    `var xmldom_1 = require("xmldom");var window = { DOMParser: xmldom_1.DOMParser };class JSNode`
  );
  const initNode = requireFromString(browserEncoded).initNode;
  return initNode(node);
}

module.exports = { test, getSSRNode, getNode };
