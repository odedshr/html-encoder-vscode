const assert = require('assert');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../../out/htmlEncoder').default;
const { writeFileSync, existsSync, mkdirSync, rmdirSync, lstatSync, readdirSync, unlinkSync } = require('fs');
const { join } = require('path');


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
  const encoded = htmlEncoder(htmlString);
  if (testFileName) {
    writeFileSync(`${testFileName}.log.js`, encoded);
  }

  const getNode = requireFromString(encoded).getNode;
  return getNode(data);
}

// getSSRNode() creates a JS-based SSR-compatible node but then use it as a base for browser-compatible node to return
function getSSRNode(htmlString, data, testFileName = undefined) {
  const ssrEncoded = htmlEncoder(htmlString, 'js', true);
  const getNode = requireFromString(ssrEncoded).getNode;
  const node = getNode(data);

  if (testFileName) {
    writeFileSync(`${testFileName}.log.js`, ssrEncoded);
  }

  const browserEncoded = htmlEncoder(htmlString);
  const initNode = requireFromString(browserEncoded).initNode;
  return initNode(node);
}

function getTSString(htmlString, testFileName = undefined) {
  const tsEncoded = htmlEncoder(htmlString, 'ts');

  if (testFileName) {
    writeFileSync(`${testFileName}.log.js`, tsEncoded);
  }

  return tsEncoded;
}

function addFolder(path) {
  let folder = '';
  path.replace(/\/$/, '').split('/').forEach(path => {
    folder += `${path}/`;

    if (!existsSync(folder)) {
      mkdirSync(folder);
    }
  });
}

function removeFolder(folder) {
  if (existsSync(folder)) {
    readdirSync(folder).forEach(file => {
      const curPath = join(folder, file);
      if (lstatSync(curPath).isDirectory()) { // recurse
        removeFolder(curPath);
      } else { // delete file
        unlinkSync(curPath);
      }
    });
    rmdirSync(folder);

  }
}

module.exports = { test, getSSRNode, getNode, getTSString, addFolder, removeFolder };
