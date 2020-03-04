const assert = require('assert');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../dist/index');
const { test } = require('./test-func.js');

describe('htmlEncoder: basic operations', () => {
  it('fails when no DOMParser provided', () => {
    const Node = requireFromString(htmlEncoder('<div>Fail</div>'));

    assert.throws(
      () => new Node(),
      new ReferenceError('DOMParser is not defined'),
      'Fails due to no DOMParser'
    );
  });

  it('converts static html', () =>
    test(
      '<div>Hello <b>World</b></div>',
      {},
      '<div>Hello <b>World</b></div>',
      'Got expected results'
    ));

  it('ignores unknown process instructions', () =>
    test(
      '<div>Hello <?ignore ?></div>',
      {},
      '<div>Hello <?ignore ?></div>',
      'ignored PI'
    ));

  it('supports <?=text?>', () =>
    test(
      '<div>Hello <?=name?></div>',
      { name: 'World' },
      '<div>Hello World</div>',
      'binded text'
    ));

  it('safeguards from html in <?=text?>', () =>
    test(
      '<div>Hello <?=name?></div>',
      { name: '<b>World</b>' },
      '<div>Hello &lt;b>World&lt;/b></div>',
      'protects from html injection'
    ));

  it('supports <?==html?>', () =>
    test(
      '<div>Hello <?==name?></div>',
      { name: '<b>World</b>' },
      '<div>Hello <b>World</b></div>',
      'binded html'
    ));

  it('supports <?==html?> when input is not a single ta', () =>
    test(
      '<div>Hello <?==name?></div>',
      { name: 'foo <b>bar</b>' },
      '<div>Hello <span>foo <b>bar</b></span></div>',
      'binded html'
    ));

  it('supports <span><?==html?></span>', () =>
    test(
      '<div>Hello <span><?==name?></span></div>',
      { name: '<b>World</b>' },
      '<div>Hello <span><b>World</b></span></div>',
      'binded html'
    ));

  it('supports <?==text?>', () =>
    test(
      '<div>Hello <span><?==name?></span></div>',
      { name: 'World' },
      '<div>Hello <span>World</span></div>',
      'binded text via html input'
    ));
});
