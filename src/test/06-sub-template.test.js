const { test } = require('./utils.js');
const requireFromString = require('require-from-string');
const htmlEncoder = require('../../out/htmlEncoder').default;

function getTemplate(htmlString) {
  return requireFromString(htmlEncoder(htmlString, 'js', true)).default;
}

describe('htmlEncoder: sub-templates', () => {
  it('supports <?:subTemplate?>', () =>
    test(
      '<ul><?v@items?><?:liTemplate?><?/@?></ul>',
      {
        items: ['a', 'b', 'c'],
        liTemplate: getTemplate('<li><?=v?></li>'),
      },
      '<ul><li>a</li><li>b</li><li>c</li></ul>'
    ));
});
