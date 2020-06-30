const { test } = require('./utils.js');

describe('htmlEncoder: conditionals', () => {
	it('supports <??booleans?>[content]<?/??>', () =>
		test('<div><??flag1?>True<?/??><??flag2?>False<?/??></div>', { flag1: true, flag2: false }, '<div>True</div>'));

	it('supports <??!booleans?>[content]<?/??>', () =>
		test('<div><??!flag1?>True<?/??><??!flag2?>False<?/??></div>', { flag1: true, flag2: false }, '<div>False</div>'));
});
