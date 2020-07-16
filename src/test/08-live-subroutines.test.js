const assert = require('assert');
const { getNode } = require('./utils');

describe('htmlEncoder: real-time-sub-routines', () => {
	it('supports <?value@array #liveId?></?@?>', () => {
		const node = getNode('<ul><li>first</li><?v@items #value?><li><?=v?></li><?/@?><li>last</li></ul>', {
			items: ['a', 'b', 'c'],
		});
		assert.equal(node.toString(), '<ul><li>first</li><li>a</li><li>b</li><li>c</li><li>last</li></ul>');
		assert.equal(JSON.stringify(node.set.value), '["a","b","c"]');
		node.set.value = [];
		assert.equal(node.toString(), '<ul><li>first</li><li>last</li></ul>');
		node.set.value = ['c', 'd', 'b'];
		assert.equal(node.toString(), '<ul><li>first</li><li>c</li><li>d</li><li>b</li><li>last</li></ul>');
		assert.equal(JSON.stringify(node.set.value), '["c","d","b"]');
	});

	it('supports live loop that is initially empty', () => {
		const node = getNode('<ul><li>first</li><?v@items#?><li><?=v?></li><?/@?><li>last</li></ul>', {});
		assert.equal(node.toString(), '<ul><li>first</li><li>last</li></ul>');
		assert.equal(JSON.stringify(node.set.items), '[]');
		node.set.items = { 'foo': 'a', 'bar': 'b' };
		assert.equal(node.toString(), '<ul><li>first</li><li>a</li><li>b</li><li>last</li></ul>');
		assert.equal(JSON.stringify(node.set.items), '{"foo":"a","bar":"b"}');
		node.set.items = ['c', 'd', 'b'];
		assert.equal(node.toString(), '<ul><li>first</li><li>c</li><li>d</li><li>b</li><li>last</li></ul>');
		assert.equal(JSON.stringify(node.set.items), '["c","d","b"]');
	});

	it('supports multiple live loops', () => {
		const node = getNode('<ul><?v@letters #letters?><li><?=v?></li><?/@?><?v@numbers#?><li><?=v?></li><?/@?></ul>', {
			letters: ['a', 'b', 'c'],
			numbers: ['1', '2', '3'],
		});
		assert.equal(node.toString(), '<ul><li>a</li><li>b</li><li>c</li><li>1</li><li>2</li><li>3</li></ul>');
		node.set.letters = ['b', 'd'];
		node.set.numbers = ['4', '1', '5', '6'];
		assert.equal(node.toString(), '<ul><li>b</li><li>d</li><li>4</li><li>1</li><li>5</li><li>6</li></ul>');
	});

	it('supports iterations with multiple children', () => {
		const items = [
			{ k: 'foo', v: 'a' },
			{ k: 'bar', v: 'b' },
		];
		const node = getNode('<dl><?i@items #value?><dt><?=i.k?></dt><dd><?=i.v?></dd><?/@?></dl>', { items });
		assert.equal(node.toString(), '<dl><dt>foo</dt><dd>a</dd><dt>bar</dt><dd>b</dd></dl>');
		items.pop();
		assert.equal(
			node.toString(),
			'<dl><dt>foo</dt><dd>a</dd><dt>bar</dt><dd>b</dd></dl>',
			`change in original data doesn't apply automatically`
		);
		items.unshift({ k: 'lax', v: 'c' });
		node.set.value = items;
		assert.equal(node.toString(), '<dl><dt>lax</dt><dd>c</dd><dt>foo</dt><dd>a</dd></dl>');
	});

	it('supports <??boolean #liveId?>[content]<?/??>', () => {
		const node = getNode('<ul><li>Foo</li><??foo #flag?><li>aa</li><li>bb</li><?/??><li>Bar</li></ul>', { foo: true });
		assert.equal(node.toString(), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
		assert.equal(node.set.flag, true, 'value is set to true');
		node.set.flag = false;
		assert.equal(node.toString(), '<ul><li>Foo</li><li>Bar</li></ul>');
		node.set.flag = true;
		assert.equal(node.toString(), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
	});

	it('supports <??boolean#?>[content]<?/??>', () => {
		const node = getNode('<ul><li>Foo</li><??foo#?><li>aa</li><li>bb</li><?/??><li>Bar</li></ul>', {
			foo: true,
		});
		assert.equal(node.toString(), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
		assert.equal(node.set.foo, true, 'value is set to true');
		node.set.foo = false;
		assert.equal(node.toString(), '<ul><li>Foo</li><li>Bar</li></ul>');
		node.set.foo = true;
		assert.equal(node.toString(), '<ul><li>Foo</li><li>aa</li><li>bb</li><li>Bar</li></ul>');
	});

	it('supports using the same flag twice', () => {
		const node = getNode('<div><??flag1#?>foo<?/??><??flag1#?>bar<?/??></div>', {
			flag1: true,
		});
		assert.equal(node.toString(), '<div>foobar</div>');
		assert.equal(node.set.flag1, true, 'value is set to true');
		node.set.flag1 = false;
		assert.equal(node.toString(), '<div></div>');
		node.set.flag1 = true;
		assert.equal(node.toString(), '<div>foobar</div>');
	});
});
