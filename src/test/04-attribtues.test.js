const { test } = require('./utils.js');

describe('htmlEncoder: attributes', () => {
	it('supports <?attr key=value key2=value2?> for parent', () =>
		test(
			'<div><?attr val1=a val2=b?>Hello <b>World</b></div>',
			{ a: 0, b: 1 },
			'<div val1="0" val2="1">Hello <b>World</b></div>'
		));

	it('supports <?attr attributeMap?> for parent', () =>
		test(
			'<div><?attr attrs?>Hello <b>World</b></div>',
			{ attrs: { val1: 0, val2: 1 } },
			'<div val1="0" val2="1">Hello <b>World</b></div>'
		));

	it('supports <?attr key=value?> for sibling', () =>
		test('<div>Hello <b>World</b><?attr value=a?></div>', { a: 0 }, '<div>Hello <b value="0">World</b></div>'));

	it('supports <?attr key=value?> for sibling after a text-node', () =>
		test('<div>Hello World<?attr value=a?></div>', { a: 0 }, '<div value="0">Hello World</div>'));

	it('supports <?attr condition?key=value?> for parent', () =>
		test(
			'<div><?attr c1?val1=a c2?val2=b?>Hello <b>World</b></div>',
			{ a: 0, b: 1, c1: true, c2: false },
			'<div val1="0">Hello <b>World</b></div>'
		));

	it('supports <?attr condition?key="hardcoded"?> for parent', () =>
		test(
			'<div><?attr c1?val1="a" c2?val2=\'b\'?>Hello <b>World</b></div>',
			{ c1: true, c2: true },
			'<div val1="a" val2="b">Hello <b>World</b></div>'
		));

	it('supports <?attr !condition?key=value?> for parent', () =>
		test(
			'<div><?attr !c1?val1=a !c2?val2=b?>Hello <b>World</b></div>',
			{ a: 0, b: 1, c1: true, c2: false },
			'<div val2="1">Hello <b>World</b></div>'
		));

	it('supports <?attr condition?attrs?> for parent', () =>
		test(
			'<div><?attr c1?attrs ?>Hello <b>World</b></div>',
			{ attrs: { val1: 0, val2: 1 }, c1: true },
			'<div val1="0" val2="1">Hello <b>World</b></div>'
		));
});
