const assert = require('assert');
const DOMParser = require('xmldom').DOMParser;
const { getNode } = require('./utils');

const domParser = new DOMParser();

describe('htmlEncoder: real-time-updates', () => {
	it('supports <?=text #liveId?>', () => {
		const node = getNode('<div>Hello <?=name #userName?></div>', {
			name: 'World',
		});
		assert.equal(node.toString(), '<div>Hello World</div>');
		node.set.userName = 'Dave';
		assert.equal(node.toString(), '<div>Hello Dave</div>');
	});

	it('supports <?=text#?>', () => {
		const node = getNode('<div>Hello <?=name#?></div>', { name: 'World' });
		assert.equal(node.toString(), '<div>Hello World</div>');
		node.set.name = 'Dave';
		assert.equal(node.toString(), '<div>Hello Dave</div>');
	});

	it('supports <?==html #liveId?> updating with string', () => {
		const node = getNode('<div>Hello <?==name #name?></div>', { name: '<b>World</b>' });
		assert.equal(node.toString(), '<div>Hello <b>World</b></div>');
		node.set.name = '<i>Dave</i>';
		assert.equal(node.toString(), '<div>Hello <i>Dave</i></div>');
	});

	it('supports <?==html#?> updating with string', () => {
		const node = getNode('<div>Hello <?==name#?></div>', { name: '<b>World</b>' });
		assert.equal(node.toString(), '<div>Hello <b>World</b></div>');
		node.set.name = '<i>Dave</i>';
		assert.equal(node.toString(), '<div>Hello <i>Dave</i></div>');
	});

	it('supports <?==html #liveId?> updating with node', () => {
		const node = getNode('<div>Hello <?==name #name?></div>', { name: '<b>World</b>' });
		assert.equal(node.toString(), '<div>Hello <b>World</b></div>');
		node.set.name = domParser.parseFromString('<u>Claire</u>');
		assert.equal(node.toString(), '<div>Hello <u>Claire</u></div>');
	});

	it('replaces element using id', () => {
		const node = getNode('<div><b id="liveId">foo</b></div>', {});
		assert.equal(node.toString(), '<div><b id="liveId">foo</b></div>');
		node.set.liveId = domParser.parseFromString('<i>bar</i>');
		assert.equal(node.toString(), '<div><i>bar</i></div>');
		node.set.liveId = domParser.parseFromString('<u>success</u>');
		assert.equal(node.toString(), '<div><u>success</u></div>');
	});

	it('supports <div id="liveId"><?attr value=key?></div> for parent', () => {
		const node = getNode('<div id="myElement"><?attr value=value?>Hello</div>', { value: 'foo' });
		assert.equal(node.toString(), '<div id="myElement" value="foo">Hello</div>');
		node.set.myElement.setAttribute('value', 'bar');
		assert.equal(node.toString(), '<div id="myElement" value="bar">Hello</div>');
	});

	it('supports <?attr attributeMap#?>', () => {
		const node = getNode('<div><?attr attributeMap#?>Hello</div>', {});
		assert.equal(node.toString(), '<div>Hello</div>');
		node.set.attributeMap = { val1: 'bar', val2: 'foo' };
		assert.equal(node.toString(), '<div val1="bar" val2="foo">Hello</div>');
	});

	it('supports <?attr value#live=key?>', () => {
		const node = getNode('<div><?attr value#live=value?>Hello</div>', { value: 'foo' });
		assert.equal(node.toString(), '<div value="foo">Hello</div>');
		node.set.live = 'bar';
		assert.equal(node.toString(), '<div value="bar">Hello</div>');
	});

	it('supports <?attr value#=key?>', () => {
		const node = getNode('<div><?attr value1#=value1 value2=value2?>Hello</div>', {
			value1: 'val1',
			value2: 'val2',
		});
		assert.equal(node.toString(), '<div value1="val1" value2="val2">Hello</div>');
		node.set.value1 = 'val3';
		assert.equal(node.toString(), '<div value1="val3" value2="val2">Hello</div>');
	});

	it('supports <?attr value#{variable}=key ?>', () => {
		const node = getNode('<div><?attr value#{varName}=value?>Hello</div>', { value: 'david', varName: 'foo' });
		assert.equal(node.toString(), '<div value="david">Hello</div>');
		node.set.foo = 'claire';
		assert.equal(node.toString(), '<div value="claire">Hello</div>');
	});

	it('updates node.set.value when element changes', () => {
		const node = getNode('<div><input type="text" id="field"/><?attr value#=value?></div>', { value: 'adam' });
		assert.equal(node.toString(), '<div><input type="text" id="field" value="adam"/></div>');
		node.set.value = 'beth';
		assert.equal(node.toString(), '<div><input type="text" id="field" value="beth"/></div>');
		node.set.field.setAttribute('value', 'claire');
		assert.equal(node.set.value, 'claire');
	});

	it('supports live-update full document', () => {
		const node = getNode(
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
					<html class="no-js" lang="">
						<body>
							<div id="foo"></div>
						</body>
					</html>`
		);
		node.set.foo.setAttribute('value', 'bar');
		assert.equal(
			node.toString(),
			`<!DOCTYPE html>
					<html class="no-js" lang="">
						<body>
							<div id="foo" value="bar"></div>
						</body>
					</html>`
		);
	});
});
