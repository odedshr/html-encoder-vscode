/* eslint-disable no-undef */
const { test } = require('./test-func.js');

describe('htmlEncoder: edge-cases', () => {
	it('handles empty file', () => test('', {}, '', 'handles empty file'));

	it('handles invalid xml', () => test('<heading>Reminder</pheading>', {}, '<heading/>', 'handles invalid xml'));
});
