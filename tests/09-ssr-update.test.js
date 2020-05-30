const assert = require('assert');
const { DOMParser } = require('xmldom');
const { getSSRNode } = require('./utils.js');
const domParser = new DOMParser();

describe('htmlEncoder: server-side-rendering tagging', () => {
	it('supports <?=text #liveId?>', () => {
		const node = getSSRNode('<div>Hello <?=name #name?></div>', { name: 'World' });
		assert.equal(node.toString(), '<div data-live-root="" data-live-text="1|name">Hello World</div>');
		node.set.name = 'David';
		assert.equal(node.toString(), '<div data-live-root="" data-live-text="1|name">Hello David</div>');
	});

	it('supports <?==html #liveId?> updating with a new node', () => {
		const node = getSSRNode('<div>Hello <?==name #name?></div>', {
			name: '<b>World</b>',
		});
		assert.equal(node.toString(), '<div data-live-root="" data-live-html="1|name">Hello <b>World</b></div>');

		node.set.name = domParser.parseFromString('<i>David</i>');
		assert.equal(node.toString(), '<div data-live-root="" data-live-html="1|name">Hello <i>David</i></div>');
	});

	it('supports <?attr attributeMap#?>', () => {
		const node = getSSRNode('<div><?attr attributeMap#?>Hello</div>', {});
		assert.equal(node.toString(), '<div data-live-root="" data-live-map="attributeMap">Hello</div>');

		node.set.attributeMap = { val1: 'bar', val2: 'foo' };
		assert.equal(
			node.toString(),
			'<div data-live-root="" data-live-map="attributeMap" val1="bar" val2="foo">Hello</div>'
		);
	});

	it('supports <?attr value#live=key?>', () => {
		const node = getSSRNode('<div><?attr value#live=value?>Hello</div>', { value: 'foo' });
		assert.equal(node.toString(), '<div value="foo" data-live-root="" data-live-attr="value|live">Hello</div>');
		node.set.live = 'bar';
		assert.equal(node.toString(), '<div value="bar" data-live-root="" data-live-attr="value|live">Hello</div>');
	});

	it('supports <?attr value#=key?>', () => {
		const node = getSSRNode('<div><?attr value1#=value1 value2#=value2?>Hello</div>', {
			value1: 'val1',
			value2: 'val2',
		});
		assert.equal(
			node.toString(),
			'<div value1="val1" value2="val2" data-live-root="" data-live-attr="value1|value1;value2|value2">Hello</div>'
		);
		node.set.value1 = 'val3';
		assert.equal(
			node.toString(),
			'<div value1="val3" value2="val2" data-live-root="" data-live-attr="value1|value1;value2|value2">Hello</div>'
		);
	});

	it('supports <?attr value#{variable}=key ?>', () => {
		const node = getSSRNode('<div><?attr value#{varName}=value?>Hello</div>', {
			value: 'david',
			varName: 'foo',
		});
		assert.equal(node.toString(), '<div value="david" data-live-root="" data-live-attr="value|foo">Hello</div>');
		node.set.foo = 'claire';
		assert.equal(node.toString(), '<div value="claire" data-live-root="" data-live-attr="value|foo">Hello</div>');
	});

	it('add tags for value; ignore id attribute', () => {
		const node = getSSRNode('<div><input type="text" id="field"/><?attr value#=value?></div>', {
			value: 'adam',
		});
		assert.equal(
			node.toString(),
			'<div data-live-root=""><input type="text" id="field" value="adam" data-live-attr="value|value"/></div>'
		);
		node.set.value = 'beth';
		assert.equal(
			node.toString(),
			'<div data-live-root=""><input type="text" id="field" value="beth" data-live-attr="value|value"/></div>'
		);
		node.set.field.setAttribute('value', 'claire');
		assert.equal(node.set.value, 'claire', 'value read from set');
	});

	it('supports multiple roots', () => {
		const child = getSSRNode('<li class="child"><?==content #child?></li>', { content: 'foo' });
		assert.equal(child.toString(), '<li class="child" data-live-root="" data-live-html="0|child">foo</li>');
		const parent = getSSRNode('<ul class="parent"><?==content #parent?><li id="sibling"></li></ul>', {
			content: child,
		});
		assert.equal(
			parent.toString(),
			'<ul class="parent" data-live-root="" data-live-html="0|parent"><li class="child" data-live-root="" data-live-html="0|child">foo</li><li id="sibling"></li></ul>'
		);
		child.set.child = 'bar';
		assert.equal(
			parent.toString(),
			'<ul class="parent" data-live-root="" data-live-html="0|parent"><li class="child" data-live-root="" data-live-html="0|child">bar</li><li id="sibling"></li></ul>'
		);
		assert.equal(Object.keys(parent.set).toString(), 'parent,sibling', `child variables weren't added to parents`);
	});

	it('supports live-update full document', () => {
		const node = getSSRNode(
			`<!DOCTYPE html>
			<html class="no-js" lang="">
				<body>
					<div id="foo"></div>
				</body>
			</html>`,
			{}
		);
		assert.equal(
			node.toString(),
			`<!DOCTYPE html>
			<html class="no-js" lang="" data-live-root="">
				<body>
					<div id="foo"></div>
				</body>
			</html>`
		);
		node.set.foo.setAttribute('value', 'bar');
		assert.equal(
			node.toString(),
			`<!DOCTYPE html>
			<html class="no-js" lang="" data-live-root="">
				<body>
					<div id="foo" value="bar"></div>
				</body>
			</html>`,
			'injected html updated'
		);
	});
});
