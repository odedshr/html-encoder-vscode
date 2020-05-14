# HTML Encoder

[![Build Status](https://travis-ci.org/odedshr/html-encoder.svg?branch=master)](https://travis-ci.org/odedshr/html-encoder)
[![Dependency Status](https://david-dm.org/odedshr/html-encoder.svg?theme=shields.io)](https://david-dm.org/odedshr/html-encoder)
[![license](https://img.shields.io/badge/license-ISC-brightgreen.svg)](https://github.com/odedshr/html-encoder/blob/master/LICENSE)

## Overview

HTML-Encoder converts html files and excerpts to JS/TS code that can be used in either client-side or backend;
The idea is to precompile the files so the process wouldn't happen on runtime.

## Installation

```bash
npm install --save-dev html-encoder
```

## Running tests

```bash
npm test
```

## Usage

1. Add 'html-encode' section in your `package.json`:

   ```json
   html-encode: [{
      source: string;
      target?: string;
   }];

   html-encode-to-ts?: boolean;
   ```

`html-encode` is an array of source-target couples, though if target is not provided the js/ts file will be created
in the source folder.
`source` can use _ as wildcard, for example `src/\*\*/_.template.html`. Unless specifying target file the output will be the same filename as the source but with js/ts extension. When`html-encode-to-ts` is set to true output file will be typescript.

1. Run 'node ./node_modules/html-encoder/dist/cli.js`

## Usage via code

1. Import the library to your code and call the `htmlEncoder()` function:

```typescript

import htmlEncoder = from 'html-encoder';

const output:string = htmlEncoder(html: string, isTypescript = false);

```

## Using the output file

You may import HTML files in your javascript code this way:

```javascript
import Node from './popup.template';

document.body.append(new Node());
```

### Usage in Node.JS

To properly create a DOM node you'll need a `DOMParser`, which exists in the browser but not in Node.JS.
You can obtain it from the [XMLDOM](https://www.npmjs.com/package/xmldom) dependency:

```javascript
import Node from './page.template.html';
import { DOMParser } from 'xmldom';

Node.DOMParser = DOMParser;

return new Node().toString();
```

or alternatively:

```javascript
return new Node({}, new DOMParser()).toString();
```

## Dynamic Content

`HTML-encoder` supports dynamic content using [`XML-processing-instructions`](https://en.wikipedia.org/wiki/Processing_Instruction)
and passing an object of data to the constructor (e.g. `new Node({data})`).
These instructions are applied to their preceeding sibling tag or parent if no preceeding tag availble. For example for the data

```html
template.html:

<div>
	<?css parent?><b>Hello</b
	><?css sibling?>
</div>
```

```javascript
import Node from './file.template';

console.log(new Node({ parent: 'parent', sibling: 'sibling' }).toString);
// ouptput: <div class="parent"><b class="sibling">Hello</b></div>
```

### Content

a. `<?=text?>` will append a textNode with the html-safe content of the variable `text`.

b. `<?==html?>` will append a parsed node with the content of the variable `html`. The input may be either a text or a pre-compiled node.

### Conditionals

c. `<??condition>xxx<?/??>` will add its content only if the variable `condition` is truthy.

d. `<??!condition>xxx<?/??>` will add its content only if the variable `condition` is falsy.

### Loops

e. `<?value@array?><li><?=value?></li></?@?>` will iterate over an array allowing access to its elements.

f. `<?value:key@array?><li><?=key?> <?=value?></li></?@?>`\_ will iterate over an array allowing access to its elements and provide their index-number (starting from zero)

g. `<?value:key@object?><li><?=key?> <?=value?></li></?@?>` will iterate over a key-value object.

### Attributes

h. `<?attr key=value?>` will set the attribute `key` with the value of `value`.

i. `<?attr key=value key2=value2?>` will set as many attributes as provided.

j. `<?attr map?>` will set a collection of attributes described in the variable `map`

k. `<?attr condition?key=value?>` will set attribute `key` only if the variable `condition` is truthy.

l. `<?attr !condition?key=value?>` will set attribute `key` only if the variable `condition` is falsy.

m. `<?attr condition?map?>` will set a collection of attributes only if the variable `condition` is truthy.

n. `<?attr !condition?map?>` will set a collection of attributes only if the variable `condition` is falsy.

### CSS Classes

o. _<?css value?>_ will add the css-class or array-of-classes provided in `value`.

p. _<?css condition?value?>_ will add the css-class or array-of-classes provided in `value` if the variable `condition` is truthy.

## Easy-access to Content

### Using id (`<img id="foo" />`)

HTML elements with an `id` attribute can easily be acceses at `node.set[id]`, for example:

template.html:

```html
<button id="cta">Foo</div>
```

javascript:

```javascript
const node = new Node();
node.set.cta.addEventListener('click', ... );

```

You can even replace the node entirely (`node.set.cta = new Node()`) and the reference will move to the new node.

### using `#id` suffix for `<?=text #foo>`, `<?=text #foo>` and `<?=text #foo>`

text nodes and html nodes that were added using `<?=text ?>` and `<?==html ?>` can also have quick-access, by adding a `#id` suffix. For example:

template.html:

```html
<div>
	Hello
	<?=firstName #name?>
</div>
```

javascript:

```javascript
const node = new Node({ firstName: 'Adam' });
console.log(node.toString()); // output `<div>Hello Adam</div>`
node.set.name = 'Ben';
console.log(node.toString()); // output `<div>Hello Ben</div>`
```

1. `<?=text #id?>` => create a textnode and update its value
2. `<?==html #id?>` => create a node and update its value with either text or node

when setting `#id` to an html, it's the same effect as defining an `id` attribute to the element (as previously described) and similarly it allows replacing the entire node.

### setting reference to attributes

Similarly you can create a reference to a specific attribute:

1. `<?attr href#=url?>` creates a reference at `node.set.href` and set initial value from `url`
2. `<?attr href#link=url?>` creates a refernce at `node.set.link` with the initial value
3. `<?attr value#{variable}=key?>` creates a reference where the alias named is also a variable. for example, the data `{variable:'link', key:'localhost' }` the following statement will be true `node.set.link === 'localhost`
4. `<?attr attributeMap#?>` create an easy attribute-map setter `node.set.attributeMap = { attr1:'foo', attr2: 'bar' }`

It's important to note that the reference aren't variables, rather then reference so changes in the values will be refelected automatically:

```html
<div><input type="text" id="field" value="initial" /><?attr value#name=value?></div>
```

```javascript
node.set.field.value = 'hello'; //node.set.field refers to the input HTML element
console.log(node.set.name); // outputs 'hello
```

### Easy-access to content with Server-Side-Rendering

`node.set` can provide easy access to the code but it's only available when the node was rendered in the browser.
In ordr to support SSR, we can leave enough cues that can later be picked up to reconstruct a new `node.set`
By compiling `new Node({...}, domParser, /*isSSR=*/ true)`, it will add additional attributes:

1. `<?=text #varName?>` => `data-live-text="varName"` (added to the parent of the text node)
2. `<?==html #varName?>` => `data-live-html="varName"` (added the replaceable node and also allow accessing the node's attributes). It's worthing noting that `id` attribute don't require any special tagging and are expected to be caught by the front-end independentaly.
3. `<img><?attr attributeMap#? />` => `<img data-live-map="attributeMap" />`;
4. `<img><?attr src#=url?></div>` => `<div data-live-attr="src:src"></div>`;
5. `<img><?attr src#link=url alt#=text?></div>` => `<div data-live-attr="src:link;alt:alt"></div>`;

## Sub-Templates

it is possible to use existing templates using the `<?:templateNamte?>` command. For example:

liTemplate:

```html
<li><?=v?></li>
```

ulTemplate:

```html
<ul>
	<?v@items?><?:liTemplate?><?/@?>
</ul>
```

Javascript:

```javsascript
console.log(new UlTemplate({ items: ['a','b','c'], liTemplate }).toString()) // output:
```

Ouput:

```html
<ul>
	<li>a</li>
	<li>b</li>
	<li>c</li>
</ul>
```

## The idea behind the project The HTML

`<template>` element can be useful when (a) we have repetitive HTML content; or (b) when we're introducing new content. But
because of the static nature of HTML which doesn't really support any data-binding on its own, the `template` element
becomes meaningless.

I believe that there is a conceptual flaw with HTML `<template >` element (or at least it is I who failed to find a reasonable tutorial how to use it properly): `<template >` tags are meant to help having dynamic content in the page by providing the template as base, but as long as it
is handled using javascript and not a pure-browser-native code, it must be encoded (for performance sake) to
javascript before being used, and if the translation occurs at the browser-side then by definition it'll effect
performance.

### How could it have worked natively

1. `<template >` tag should have a `data-bind` attribute, which is then connected to a javascript variable hold an object (or
   array of objects) with fields that will be populated natively. For example - `<template data-bind="names" ><li data-bind="name"></li> <li></li></template >` would be displayed as `<li>Alex</li> <li>Ben</li>` And wouldn't it be wonderful if whenever names variable would update the html would refresh itself
   automatically?
2. If we could data-bind-src a URL with either JSON or XML data to be natively parsed into our
   template. But in all fairness, we don't need a `template` tag for that, we just need the html `bind` attribute.
   This would work great for pseudo-static HTML files (in the sense that there's no Javascript required for the
   page to function), and should we want a dynamic page perhaps we could pick the TemplateElement and use it's
   `clone(data)` method to populate it with our data, so the usage would be:

```javascript
   const template = document.selectById("myTemplate");
   document.selectById("myParent").appendChild(template.clone(data, isWatchingData)
```

Without native-browser-based data-population and without javascript-less support, the `template` tags are utter pointless.

### JSX as a templating alternative

And now let's talk about [JSX](https://medium.com/javascript-scene/jsx-looks-like-an-abomination-1c1ec351a918), which is another kind of
template. JSX in essence, is a pseudo-html code written within JS code and then pre-compiled to pure JS which is
served to the browser. It's a much more efficient way to write template but I don't like it, because in order to
write proper JSX you need to proficient in both HTML and Javascript and for me it feels like a mix of
responsibilities. HTML provides the structure to our page, while javascript provides computability and these are
two different things from my point of view. ### This is where the html-encoder comes in I would like to write a
normal HTML file but empower it with a `data-bind` attribute without any additional javascript programming (it
would have been nice to do so natively but that's just wishful thinking) and this HTML can be pre-compiled on
the server and served as a static page (live-refresh is bonus). The `HTML encoder` does exactly that:

1. Write a normal HTML file
2. Import it to your javascript code using `import Node from './example.template.html';` and then use it by appending it to the DOM -`document.appendChild(new Node());`

Behind the scenes, I use [Rollup](https://rollupjs.org/) plugin capability to detect imported HTML and encoding them to a set of javascript commands that are embedded with the Rollup output javascript file. ### Adding dynamic content A guiding principle was to write an HTML valid code, but this raised the question - "Where can we place the computational instructions required?" and I found the Process Instructions (PI for short). they look a bit ugly I must admit -`<?=value?>` but for the proof-of-concept they serve their purpose. Looking at other templating systems such as [Vue](https://medium.com/@Pier/vue-js-the-good-the-meh-and-the-ugly-82800bbe6684), the PIs are attributes in the elements or new html-invalid elements (i.e. not part of the HTML language). The `<? ... ?>` is a valid HTML element, it should appear as a first child to the element we wish to manipulate or immediately following it (in case of a childless element).

## Cheatsheet

1. `<?=text?>`creates a textNode with the content of the variable named`text`.
2. `<?==html?>`creates an HTML element with the content of`html`, which can be either an HTML element or a string that will be parsed as HTML.
3. Conditions:`<??condition?>xxx<?/??>`will add the content only if condition is true. A boolean-negate (`!`) is also available so `<??!condition?>xxx<?/??>` will add the content only if condition is false.
4. Loops:`<?item:index@items?>xxx<?/@?>`will iterate over items (either an array or an object) providing the key and value and the given variable names (in the example it would be `item` and `index` )
5. Attributes:`<?attr key1=varName1 key2=varName2?>`will set the attributes in preceding element `<?attr attrObject?>` will set the attributes described in the attrObject (i.e. the key is the attribute name and the value is the actual value)
6. CSS classes:`<?css varName?>`will set the class(es) described in the variable that can be either a string or an array. it's also possible to condition a class by writing `<?class condition?varName?>`.
7. Editable content: you can access created nodes at`node.set.foo`if the id was
8. provided in one of those ways`<?=text #foo?>`or`<?==html #foo?>` or `<div id="foo">`.
9. SubTemplates: When a subTemplates' class is provided with the data it can be used with`<?:subTemplateVarName?>`
   and it will get the data as the parent-template.

## Future steps

This project is mostly thought-experiment in creating a relatively clean internet code, well-encapsulated and easy to use.
The next step will be to try create an application with it and see whether it holds to its promise and allows easy development with no need
to touch HTML code directly from the javascript.
