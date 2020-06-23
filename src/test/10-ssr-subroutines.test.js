const assert = require('assert');
const { getSSRNode } = require('./utils.js');
const tags = / data-live-.*?=".*?"/g;

describe('htmlEncoder: real-time-sub-routines', () => {
	it('supports <?value@array #liveId?></?@?>', () => {
		const node = getSSRNode('<ul><li>first</li><?v@items #value?><li><?=v?></li><?/@?><li>last</li></ul>', {
			items: ['a', 'b', 'c'],
		});
		assert.equal(
			node.toString().replace(tags, ''),
			'<ul><li>first</li><li>a</li><li>b</li><li>c</li><li>last</li></ul>'
		);
		assert.equal(JSON.stringify(node.set.value), '["a","b","c"]');
		node.set.value = [];
		assert.equal(node.toString().replace(tags, ''), `<ul><li>first</li><li>last</li></ul>`);
		node.set.value = ['c', 'd', 'b'];
		assert.equal(
			node.toString().replace(tags, ''),
			'<ul><li>first</li><li>c</li><li>d</li><li>b</li><li>last</li></ul>'
		);
		assert.equal(JSON.stringify(node.set.value), '["c","d","b"]');
	});

	it('supports multiple ssr loops', () => {
		const node = getSSRNode('<ul><?v@letters #letters?><li><?=v?></li><?/@?><?v@numbers#?><li><?=v?></li><?/@?></ul>', {
			letters: ['a', 'b', 'c'],
			numbers: ['1', '2', '3'],
		});
		assert.equal(
			node.toString().replace(tags, ''),
			'<ul><li>a</li><li>b</li><li>c</li><li>1</li><li>2</li><li>3</li></ul>'
		);
		node.set.letters = ['b', 'd'];
		node.set.numbers = ['4', '1', '5', '6'];
		assert.equal(
			node.toString().replace(tags, ''),
			'<ul><li>b</li><li>d</li><li>4</li><li>1</li><li>5</li><li>6</li></ul>'
		);
	});

	it('supports iterations with multiple children', () => {
		const items = [
			{ k: 'foo', v: 'a' },
			{ k: 'bar', v: 'b' },
		];
		const node = getSSRNode('<dl><?i@items #value?><dt><?=i.k?></dt><dd><?=i.v?></dd><?/@?></dl>', { items });

		assert.equal(node.toString().replace(tags, ''), '<dl><dt>foo</dt><dd>a</dd><dt>bar</dt><dd>b</dd></dl>');
		items.pop();
		assert.equal(node.toString().replace(tags, ''), '<dl><dt>foo</dt><dd>a</dd><dt>bar</dt><dd>b</dd></dl>');
		items.unshift({ k: 'lax', v: 'c' });
		node.set.value = items;
		assert.equal(node.toString().replace(tags, ''), '<dl><dt>lax</dt><dd>c</dd><dt>foo</dt><dd>a</dd></dl>');
	});

	it('supports <??boolean #liveId?>[content]<?/??>', () => {
		const node = getSSRNode('<ul><li>Foo</li><??foo #flag?><li>aa</li><li>bb</li><?/??><li>Bar</li></ul>', {
			foo: true,
		});
		assert.equal(node.toString().replace(tags, ''), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
		assert.equal(node.set.flag, true, 'value is set to true');
		node.set.flag = false;
		assert.equal(node.toString().replace(tags, ''), '<ul><li>Foo</li><li>Bar</li></ul>');
		node.set.flag = true;
		assert.equal(node.toString().replace(tags, ''), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
	});

	it('supports <??boolean#?>[content]<?/??>', () => {
		const node = getSSRNode('<ul><li>Foo</li><??foo#?><li>aa</li><li>bb</li><?/??><li>Bar</li></ul>', {
			foo: true,
		});
		assert.equal(node.toString().replace(tags, ''), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
		assert.equal(node.set.foo, true, 'value is set to true');
		node.set.foo = false;
		assert.equal(node.toString().replace(tags, ''), '<ul><li>Foo</li><li>Bar</li></ul>');
		node.set.foo = true;
		assert.equal(node.toString().replace(tags, ''), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
	});
});
