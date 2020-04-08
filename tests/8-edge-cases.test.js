/* eslint-disable no-undef */
const { test } = require('./test-func.js');

describe('htmlEncoder: edge-cases', () => {
	it('handles empty file', () => test('', {}, '', 'handles empty file'));

	it('handles invalid xml', () => test('<heading>Reminder</pheading>', {}, '<heading/>', 'handles invalid xml'));

	it('handles data with illegal html chars', () =>
		test('<div><?==text?></div>', { text: '&' }, '<div>&amp;</div>', 'handles special html characters'));

	it('handles htmltag with illegal html chars', () =>
		test(
			'<div><?==text?></div>',
			{ text: '<b>a</b> & <i>b</i>' },
			'<div><span><b>a</b> &amp; <i>b</i></span></div>',
			'handles special html characters'
		));
});
