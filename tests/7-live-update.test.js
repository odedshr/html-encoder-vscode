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

	it('replaces element using id', () => {
		const node = getNode('<div><b id="liveId">foo</b></div>', {});
		const domParser = new DOMParser();
		assert.equal(node.toString(), '<div><b id="liveId">foo</b></div>', 'original html');
		node.set.liveId = domParser.parseFromString('<i>bar</i>');
		assert.equal(node.toString(), '<div><i>bar</i></div>', 'updated html');
		node.set.liveId = domParser.parseFromString('<u>success</u>');
		assert.equal(node.toString(), '<div><u>success</u></div>', 'updated html again');
	});

	it('supports <div id="liveId"><?attr value=key?></div> for parent', () => {
		const node = getNode('<div id="myElement"><?attr value=value?>Hello</div>', { value: 'foo' });
		assert.equal(node.toString(), '<div id="myElement" value="foo">Hello</div>', 'binded html');
		node.set.myElement.setAttribute('value', 'bar');
		assert.equal(node.toString(), '<div id="myElement" value="bar">Hello</div>', 'binded html updated');
	});

	it('supports <?attr attributeMap#?>', () => {
		const node = getNode('<div><?attr attributeMap#?>Hello</div>', {});
		assert.equal(node.toString(), '<div>Hello</div>', 'binded html');
		node.set.attributeMap = { val1: 'bar', val2: 'foo' };
		assert.equal(node.toString(), '<div val1="bar" val2="foo">Hello</div>', 'binded html updated');
	});

	it('supports <?attr value#live=key?>', () => {
		const node = getNode('<div><?attr value#live=value?>Hello</div>', { value: 'foo' });
		assert.equal(node.toString(), '<div value="foo">Hello</div>', 'binded html');
		node.set.live = 'bar';
		assert.equal(node.toString(), '<div value="bar">Hello</div>', 'binded html updated');
	});

	it('supports <?attr value#=key?>', () => {
		const node = getNode('<div><?attr value1#=value1 value2=value2?>Hello</div>', {
			value1: 'val1',
			value2: 'val2',
		});
		assert.equal(node.toString(), '<div value1="val1" value2="val2">Hello</div>', 'binded html');
		node.set.value1 = 'val3';
		assert.equal(node.toString(), '<div value1="val3" value2="val2">Hello</div>', 'binded html updated');
	});

	it('supports <?attr value#{variable}=key ?>', () => {
		const node = getNode('<div><?attr value#{varName}=value?>Hello</div>', { value: 'david', varName: 'foo' });
		assert.equal(node.toString(), '<div value="david">Hello</div>', 'binded html');
		node.set.foo = 'claire';
		assert.equal(node.toString(), '<div value="claire">Hello</div>', 'binded html updated');
	});

	it('updates node.set.value when element changes', () => {
		const node = getNode('<div><input type="text" id="field"/><?attr value#=value?></div>', { value: 'adam' });
		assert.equal(node.toString(), '<div><input type="text" id="field" value="adam"/></div>', 'binded html');
		node.set.value = 'beth';
		assert.equal(node.toString(), '<div><input type="text" id="field" value="beth"/></div>', 'binded html updated');
		node.set.field.setAttribute('value', 'claire');
		assert.equal(node.set.value, 'claire', 'value read from set');
	});
});
