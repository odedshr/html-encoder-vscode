const assert = require('assert');
const { DOMParser } = require('xmldom');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../dist/index').default;

function getNode(htmlString, data) {
	const JSNode = requireFromString(htmlEncoder(htmlString)).default;
	JSNode.DOMParser = DOMParser;
	return new JSNode(data);
}

describe('htmlEncoder: real-time-updates', () => {
	it('supports <?=text #liveId?>', () => {
		const node = getNode('<div>Hello <?=name #name?></div>', { name: 'World' });
		assert.equal(node.toString(), '<div>Hello World</div>', 'binded text');
		node.set.name = 'Dave';
		assert.equal(node.toString(), '<div>Hello Dave</div>', 'binded text updated');
	});

	it('supports <?==html #liveId?> updating with string', () => {
		const node = getNode('<div>Hello <?==name #name?></div>', { name: '<b>World</b>' });
		assert.equal(node.toString(), '<div>Hello <b>World</b></div>', 'binded html');
		node.set.name = '<i>Dave</i>';
		assert.equal(node.toString(), '<div>Hello <i>Dave</i></div>', 'binded html updated');
	});

	it('supports <?==html #liveId?> updating with node', () => {
		const node = getNode('<div>Hello <?==name #name?></div>', { name: '<b>World</b>' });
		const domParser = new DOMParser();
		assert.equal(node.toString(), '<div>Hello <b>World</b></div>', 'binded html');
		node.set.name = domParser.parseFromString('<u>Claire</u>');
		assert.equal(node.toString(), '<div>Hello <u>Claire</u></div>', 'binded html updated');
	});

	it('supports <?attr value=key #liveId?> for parent', () => {
		const node = getNode('<div id="attrs"><?attr value=value?>Hello</div>', { value: 'foo' });
		assert.equal(node.toString(), '<div id="attrs" value="foo">Hello</div>', 'binded html');
		node.set.attrs.setAttribute('value', 'bar');
		assert.equal(node.toString(), '<div id="attrs" value="bar">Hello</div>', 'binded html updated');
	});
});
