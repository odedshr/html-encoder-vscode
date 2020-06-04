const assert = require('assert');
const DOMParser = require('xmldom').DOMParser;
const domParser = new DOMParser();
const { test } = require('./utils.js');

describe('htmlEncoder: basic operations', () => {
	it('converts static html', () => test('<div>Hello <b>World</b></div>', {}, '<div>Hello <b>World</b></div>'));

	it('handles undefined data', () => test('<div>Hello <b>World</b></div>', undefined, '<div>Hello <b>World</b></div>'));

	// In XML empty tags becomes single (e.g. <div></div> => <div/>),  but for majority of html tags it's considered
	// illegal. The encoder will only "fix" the tags when it's considered legal.
	it('handles empty elements properly', () =>
		test(
			'<div><script></script><article></article><aside></aside><br></br><img></img></div>',
			{},
			'<div><script></script><article></article><aside></aside><br/><img/></div>'
		));

	// It make the return Object is a single node, but the encoder handles gracefully when the input doesn't have a
	// wrapping element. In such case it returns DocumentFragment, which disappears when being append.
	it('converts unwrapped multiple html tags', () =>
		test('<li>1</li><li>2</li><li>3</li>', {}, '<li>1</li><li>2</li><li>3</li>'));

	// A full HTML document include the <!DOCTYPE> tag which requires a slightly different handling as it's not a standard
	// HTML tag, rather than instruction about the document
	it('converts a full static html', () =>
		test(
			'<!DOCTYPE html><html><body>Hello <b>World</b></body></html>',
			{},
			'<!DOCTYPE html><html><body>Hello <b>World</b></body></html>'
		));

	// The encoder uses ProcessInstructions (PI) to properly parse dynamic files. However if it sees an unknown PI,
	// it simply ignores it.
	it('ignores unknown process instructions', () =>
		test('<div>Hello <?ignore ?></div>', {}, '<div>Hello <?ignore ?></div>'));

	// The encoder handles simple text inputs and inject their value from the provided data at run-time.
	it('supports <?=text?>', () => test('<div>Hello <?=name?></div>', { name: 'World' }, '<div>Hello World</div>'));

	// textNodes are HTML-safe (meaning it won't display malicious code injected to your site)
	it('safeguards from html in <?=text?>', () =>
		test(
			'<div>Hello <?=name?></div>',
			{ name: '<script src="hack.js"></script>' },
			'<div>Hello &lt;script src="hack.js">&lt;/script></div>'
		));

	// it is possible to add HTML-friendly input
	it('supports <?==html?>', () =>
		test('<div>Hello <?==name?></div>', { name: '<b>World</b>' }, '<div>Hello <b>World</b></div>'));

	// Of course, HTML isn't limited to a single HTMLElement
	it('supports <?==html?> when input is not a single tag', () =>
		test('<div>Hello <?==name?></div>', { name: 'foo <b>bar</b>' }, '<div>Hello <span>foo <b>bar</b></span></div>'));

	// Not only that, it can actually by an HTMLElement (that was created elsewhere, presumably)
	it('supports <?==html?> when input is a DOM element', () =>
		test(
			'<div>Hello <span><?==name?></span></div>',
			{ name: domParser.parseFromString('<b>World</b>') },
			'<div>Hello <span><b>World</b></span></div>'
		));

	// But it can also be a simple text
	it('supports <?==text?>', () =>
		test('<div>Hello <span><?==name?></span></div>', { name: 'World' }, '<div>Hello <span>World</span></div>'));
});
