const assert = require('assert');
const { DOMParser } = require('xmldom');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../dist/index').default;

const domParser = new DOMParser();

function getNode(htmlString, data) {
	const { init, default: JSNode } = requireFromString(htmlEncoder(htmlString, false));
	const node = new JSNode(data, domParser, true);
	// the outputs of domxml don't have
	// node.querySelectorAll = querySelectorAll;
	init(node, domParser);
	return node;
}

// function querySelectorAll(queryString) {
// 	const criteria = parseQueryString(queryString);
// 	return flatTree(this).filter((node) => criteria.find((c) => isMatch(node, c)));
// }

// function isMatch(node, criteria) {
// 	if (node.attributes) {
// 		return Array.from(node.attributes).find((attr) => attr.name === criteria.attribute);
// 	}
// 	return false;
// }

// function parseQueryString(queryString) {
// 	const queryRegex = /\[(.*?)\],?/g;
// 	const criteria = [];
// 	let match;
// 	while ((match = queryRegex.exec(queryString))) {
// 		criteria.push({ attribute: match[1] });
// 	}
// 	return criteria;
// }

// function flatTree(node) {
// 	let list = node.childNodes ? Array.from(node.childNodes).map((child) => flatTree(child)) : [];
// 	list.unshift(node);
// 	return list.flat();
// }

describe('htmlEncoder: server-side-rendering tagging', () => {
	it('supports <?=text #liveId?>', () => {
		const node = getNode('<div>Hello <?=name #name?></div>', { name: 'World' });
		assert.equal(node.toString(), '<div data-live-root="" data-live-text="1:name">Hello World</div>', 'binded text');
		node.set.name = 'David';
		assert.equal(node.toString(), '<div data-live-root="" data-live-text="1:name">Hello David</div>', 'binded text');
	});

	it('supports <?==html #liveId?> updating with a new node', () => {
		const node = getNode('<div>Hello <?==name #name?></div>', {
			name: '<b>World</b>',
		});
		assert.equal(
			node.toString(),
			'<div data-live-root="" data-live-html="1:name">Hello <b>World</b></div>',
			'binded html'
		);

		node.set.name = domParser.parseFromString('<i>David</i>');
		assert.equal(
			node.toString(),
			'<div data-live-root="" data-live-html="1:name">Hello <i>David</i></div>',
			'binded html'
		);
	});

	it('supports <?attr attributeMap#?>', () => {
		const node = getNode('<div><?attr attributeMap#?>Hello</div>', {});
		assert.equal(node.toString(), '<div data-live-root="" data-live-map="attributeMap">Hello</div>', 'binded html');

		node.set.attributeMap = { val1: 'bar', val2: 'foo' };
		assert.equal(
			node.toString(),
			'<div data-live-root="" data-live-map="attributeMap" val1="bar" val2="foo">Hello</div>',
			'binded html updated'
		);
	});

	it('supports <?attr value#live=key?>', () => {
		const node = getNode('<div><?attr value#live=value?>Hello</div>', { value: 'foo' });
		assert.equal(
			node.toString(),
			'<div value="foo" data-live-root="" data-live-attr="value:live">Hello</div>',
			'binded html'
		);
		node.set.live = 'bar';
		assert.equal(
			node.toString(),
			'<div value="bar" data-live-root="" data-live-attr="value:live">Hello</div>',
			'binded html updated'
		);
	});

	it('supports <?attr value#=key?>', () => {
		const node = getNode('<div><?attr value1#=value1 value2#=value2?>Hello</div>', {
			value1: 'val1',
			value2: 'val2',
		});
		assert.equal(
			node.toString(),
			'<div value1="val1" value2="val2" data-live-root="" data-live-attr="value1:value1;value2:value2">Hello</div>',
			'binded html'
		);
		node.set.value1 = 'val3';
		assert.equal(
			node.toString(),
			'<div value1="val3" value2="val2" data-live-root="" data-live-attr="value1:value1;value2:value2">Hello</div>',
			'binded html updated'
		);
	});

	it('supports <?attr value#{variable}=key ?>', () => {
		const node = getNode('<div><?attr value#{varName}=value?>Hello</div>', {
			value: 'david',
			varName: 'foo',
		});
		assert.equal(
			node.toString(),
			'<div value="david" data-live-root="" data-live-attr="value:foo">Hello</div>',
			'binded html'
		);
		node.set.foo = 'claire';
		assert.equal(
			node.toString(),
			'<div value="claire" data-live-root="" data-live-attr="value:foo">Hello</div>',
			'binded html updated'
		);
	});

	it('add tags for value; ignore id attribute', () => {
		const node = getNode('<div><input type="text" id="field"/><?attr value#=value?></div>', {
			value: 'adam',
		});
		assert.equal(
			node.toString(),
			'<div data-live-root=""><input type="text" id="field" value="adam" data-live-attr="value:value"/></div>',
			'binded html'
		);
		node.set.value = 'beth';
		assert.equal(
			node.toString(),
			'<div data-live-root=""><input type="text" id="field" value="beth" data-live-attr="value:value"/></div>',
			'binded html updated'
		);
		node.set.field.setAttribute('value', 'claire');
		assert.equal(node.set.value, 'claire', 'value read from set');
	});

	it('supports multiple roots', () => {
		const child = getNode('<li class="child"><?==content #child?></li>', { content: 'foo' });
		assert.equal(
			child.toString(),
			'<li class="child" data-live-root="" data-live-html="0:child">foo</li>',
			'binded html'
		);
		const parent = getNode('<ul class="parent"><?==content #parent?><li id="sibling"></li></ul>', {
			content: child,
		});
		assert.equal(
			parent.toString(),
			'<ul class="parent" data-live-root="" data-live-html="0:parent"><li class="child" data-live-root="" data-live-html="0:child">foo</li><li id="sibling"></li></ul>',
			'binded html'
		);
		child.set.child = 'bar';
		assert.equal(
			parent.toString(),
			'<ul class="parent" data-live-root="" data-live-html="0:parent"><li class="child" data-live-root="" data-live-html="0:child">bar</li><li id="sibling"></li></ul>',
			'binded html'
		);
		assert.equal(Object.keys(parent.set).toString(), 'parent,sibling', `child variables weren't added to parents`);
	});
});
