const { test } = require('./test-func.js');

describe('htmlEncoder: conditionals', () => {
	it('supports <??boleans?>[content]<?/??>', () =>
		test(
			'<div><??flag1?>True<?/??><??flag2?>False<?/??></div>',
			{ flag1: true, flag2: false },
			'<div>True</div>',
			'binded conditionally'
		));

	it('supports <??!boleans?>[content]<?/??>', () =>
		test(
			'<div><??!flag1?>True<?/??><??!flag2?>False<?/??></div>',
			{ flag1: true, flag2: false },
			'<div>False</div>',
			'binded with negative boolean'
		));
});
