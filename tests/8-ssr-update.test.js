const assert = require('assert');
const { DOMParser } = require('xmldom');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../dist/index').default;

const domParser = new DOMParser();

function getNode(htmlString, data) {
	const { init, default: JSNode } = requireFromString(htmlEncoder(htmlString, false));
	return { node: new JSNode(data, domParser, true), init };
}

describe('htmlEncoder: server-side-rendering tagging', () => {
	it('supports <?=text #liveId?>', () => {
		const { node, init } = getNode('<div>Hello <?=name #name?></div>', { name: 'World' });
		assert.equal(node.toString(), '<div data-live-text="name">Hello World</div>', 'binded text');
		init(node, domParser);
		node.set.name = 'David';
		assert.equal(node.toString(), '<div data-live-text="name">Hello David</div>', 'binded text');
	});

	it('supports <?==html #liveId?> updating with string', () => {
		const { node, init } = getNode('<div>Hello <?==name #name?></div>', { name: '<b>World</b>' });
		assert.equal(node.toString(), '<div>Hello <b data-live-html="name">World</b></div>', 'binded html');
	});

	it('supports <?attr attributeMap#?>', () => {
		const { node, init } = getNode('<div><?attr attributeMap#?>Hello</div>', {});
		assert.equal(node.toString(), '<div data-live-map="attributeMap">Hello</div>', 'binded html');
	});

	it('supports <?attr value#live=key?>', () => {
		const { node, init } = getNode('<div><?attr value#live=value?>Hello</div>', { value: 'foo' });
		assert.equal(node.toString(), '<div value="foo" data-live-attr="value:live">Hello</div>', 'binded html');
	});

	it('supports <?attr value#=key?>', () => {
		const { node, init } = getNode('<div><?attr value1#=value1 value2#=value2?>Hello</div>', {
			value1: 'val1',
			value2: 'val2',
		});
		assert.equal(
			node.toString(),
			'<div value1="val1" value2="val2" data-live-attr="value1:value1;value2:value2">Hello</div>',
			'binded html'
		);
	});

	it('supports <?attr value#{variable}=key ?>', () => {
		const { node, init } = getNode('<div><?attr value#{varName}=value?>Hello</div>', {
			value: 'david',
			varName: 'foo',
		});
		assert.equal(node.toString(), '<div value="david" data-live-attr="value:foo">Hello</div>', 'binded html');
	});

	it('add tags for value; ignore id attribute', () => {
		const { node, init } = getNode('<div><input type="text" id="field"/><?attr value#=value?></div>', {
			value: 'adam',
		});
		assert.equal(
			node.toString(),
			'<div><input type="text" id="field" value="adam" data-live-attr="value:value"/></div>',
			'binded html'
		);
	});
});
