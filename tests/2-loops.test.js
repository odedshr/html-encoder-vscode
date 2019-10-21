const { test } = require('./test-func.js');

describe('htmlEncoder: loops', () => {
	it('supports <?value:key@array?></?@?>', () =>
		test(
			'<ul><?v:k@items?><li><?=v?><?=k?></li><?/@?></ul>',
			{ items: ['a', 'b', 'c'] },
			'<ul><li>a0</li><li>b1</li><li>c2</li></ul>',
			'iterates an array'
		));

	it('supports <?value:key@object?></?@?>', () =>
		test(
			'<ul><?v:k@items?><li><?=v?><?=k?></li><?/@?></ul>',
			{ items: { a: 0, b: 1, c: 2 } },
			'<ul><li>0a</li><li>1b</li><li>2c</li></ul>',
			'iterates an object'
		));
});
