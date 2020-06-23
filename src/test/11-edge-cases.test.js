const assert = require('assert');
const { test, getNode, getTSString } = require('./utils.js');

describe('htmlEncoder: edge-cases', () => {
	it('handles empty file', () => test('', {}, ''));

	it('handles invalid xml', () => test('<heading>Reminder</lala>', {}, '<heading></heading>Reminder'));

	it('handles data with illegal html chars', () => test('<div><?==text?></div>', { text: '&' }, '<div>&amp;</div>'));

	it('handles html-tags with illegal html chars', () =>
		test('<div><?==text?></div>', { text: '<b>a</b> & <i>b</i>' }, '<div><span><b>a</b> &amp; <i>b</i></span></div>'));

	//
	it('using the same #liveId for multiple targets', () => {
		const node = getNode(
			'<ul><li><input id="field"/><?attr value#liveId=text?></li><li><?==text #liveId?></li><li><?=text #liveId?></li></ul>',
			{ text: '<b>foo</b>' }
		);
		assert.equal(
			node.toString(),
			'<ul><li><input id="field" value="&lt;b>foo&lt;/b>"/></li><li><b>foo</b></li><li>&lt;b>foo&lt;/b></li></ul>'
		);
		node.set.field.setAttribute('value', 'lax');
		assert.equal(
			node.toString(),
			'<ul><li><input id="field" value="lax"/></li><li><b>foo</b></li><li>&lt;b>foo&lt;/b></li></ul>'
		);
		node.set.liveId = 'bar';
		assert.equal(node.toString(), '<ul><li><input id="field" value="bar"/></li><li>bar</li><li>bar</li></ul>');
	});

	it('handles typescript loops', () => {
		const nodeString = getTSString('<ul><?v@items?><li><?=v?></li><?/@?></ul>');

		assert.ok(nodeString.indexOf("function loopVItems (self:JSNode, docElm:Document, elm:Node, items:any)") > -1);
	})
});
