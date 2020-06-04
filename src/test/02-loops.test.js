const { test } = require('./utils.js');

describe('htmlEncoder: loops', () => {
  it('supports <?value@array?></?@?>', () =>
    test(
      '<ul><?v@items?><li><?=v?></li><?/@?></ul>',
      { items: ['a', 'b', 'c'] },
      '<ul><li>a</li><li>b</li><li>c</li></ul>',
      ''
    ));

  it('supports <?value:key@array?></?@?>', () =>
    test(
      '<ul><?v:k@items?><li><?=v?><?=k?></li><?/@?></ul>',
      { items: ['a', 'b', 'c'] },
      '<ul><li>a0</li><li>b1</li><li>c2</li></ul>'
    ));

  it('supports <?value:key@object?></?@?>', () =>
    test(
      '<ul><?v:k@items?><li><?=v?><?=k?></li><?/@?></ul>',
      { items: { a: 0, b: 1, c: 2 } },
      '<ul><li>0a</li><li>1b</li><li>2c</li></ul>'
    ));

  it('supports <?value:key@object?></?@?> with select:option', () =>
    test(
      '<select><?v:k@items?><option><?attr value=k?><?=v?></option><?/@?></select>',
      { items: { a: 'apple', b: 'berry', c: 'oranges' } },
      '<select><option value="a">apple</option><option value="b">berry</option><option value="c">oranges</option></select>'
    ));
});
