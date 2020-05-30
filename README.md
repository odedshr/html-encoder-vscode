# HTML Encoder

[![Build Status](https://travis-ci.org/odedshr/html-encoder.svg?branch=master)](https://travis-ci.org/odedshr/html-encoder)

[![Dependency Status](https://david-dm.org/odedshr/html-encoder.svg?theme=shields.io)](https://david-dm.org/odedshr/html-encoder)

[![license](https://img.shields.io/badge/license-ISC-brightgreen.svg)](https://github.com/odedshr/html-encoder/blob/master/LICENSE)

## Overview

HTML-Encoder converts html files and excerpts to JS/TS code that can be used in either client-side or backend;

The idea is to pre-compile the files so the process wouldn't happen on runtime. Additionally, HTML-Encoder provides a powerful reactivity with dead-simple access to attributes and elements to modify them directly with the need to render the entire DOM tree.

## Installation

```bash
npm install --save-dev html-encoder
```

## Running tests

the tests can provide an excellent features list and expected behaviors:

```bash
npm test
```

## Usage

1. Add 'html-encode' section in your `package.json`:

   ```typescript
   html-encode: {
     source: string | string[];
     target?: string | string[] | { path:string, ts?: boolean, ssr?: boolean }[]
   }[];

   ```

   `html-encode` is an array of source-target couples, though if target is not provided the js/ts file will be created in the source folder.

   `source` can be a single string or an array of strings; it can point to a specific file or use [`glob`](<https://en.wikipedia.org/wiki/Glob_(programming)>) pattern.

   `target` can be a simple string - a single filename or a folder, a list of targets, or a list of targets with different spec per target - typescript or server-side-rendering (see below).
   Unless specifying a target file the output will be the same filename as the source but with js/ts extension (`login.template.html` => `login.template.ts`)

2. Run `node ./node_modules/html-encoder/dist/cli.js [options]`
   Options (set default value that can be overridden per target):
   - `ts` - Outputs a typescript file (default is `false`)
   - `ssr` - Maps reactive elements for server-side-rendering (default is `false`)

## Usage via code

Import the library to your code and call the `htmlEncoder()` function:

```typescript
import  htmlEncoder = from 'html-encoder';

const  output:string = htmlEncoder(html: string, isTypescript:boolean, ssr: boolean);
```

## Using the output file

You may import HTML files in your javascript code this way:

```javascript
import Node from './popup.template';

document.body.append(new Node());
```

### Usage in Node.JS

By default, the output is meant is meant to run on the browser; however when compiled with `ssr = true` it will internally use [XMLDOM](https://www.npmjs.com/package/xmldom) library to access a `DOMParser`.

```javascript
import PageTemplate from './page.template';

// or const Node = require('./page.template').default;

return new PageTemplate();

// or new PageTemplate().toString(); // to return the HTML string
```

It is technically possible to replace the dom-parser by manipulating the encoded output, please refer to the tests source code for an example.

## Dynamic Content

`HTML-encoder` supports dynamic content using [`XML-processing-instructions`](https://en.wikipedia.org/wiki/Processing_Instruction)

and passing an object of data to the constructor (e.g. `new Node({data})`).

These instructions are applied to their preceding sibling tag or parent if no preceding tag available. For example for the data

```javascript
<div><?css divClass?><img /></div>  // => add css class to div

<div><img  /><?attr src=src?></div>  // => add `src` attribute to img
```

Let's see example in action:

template.html:

```html
<div>
  <?css parent?><b>Hello</b
  ><?css sibling?>
</div>
```

```javascript
import Node from './file.template';

console.log(new Node({ parent: 'parent', sibling: 'sibling' }).toString);

// output: <div class="parent"><b class="sibling">Hello</b></div>
```

### Content

- `<?=text?>` - Append a textNode with the html-safe content of the variable `text`.

- `<?==html?>` - Append a parsed node with the content of the variable `html`;

The input may be either a text or a pre-compiled node / HTML Element.

### Conditionals

- `<??condition>xxx<?/??>` - Add its content only if the variable `condition` is truthy.

- `<??!condition>xxx<?/??>` - Add its content only if the variable `condition` is falsy.

### Loops

- `<?value@array?><li><?=value?></li></?@?>` - Iterate over an array allowing access to its elements.

- `<?value:key@array?><li><?=key?> <?=value?></li></?@?>` - Iterate over an array allowing access to its elements and provide their index-number (starting from zero)

- `<?value:key@object?><li><?=key?> <?=value?></li></?@?>` - Iterate over a key-value object.

### Attributes

- `<?attr key=varName?>` - Set the attribute `key` with the value of `varName`.

- `<?attr key=value key2=value2?>` - Set as many attributes as provided.

- `<?attr map?>` - Set a collection of attributes described in the variable `map`, which should be key-value object (e.g. `{ val1: 'bar', val2: 'foo' }`)

- `<?attr condition?key=value?>` - Set attribute `key` only if the variable `condition` is truthy.

- `<?attr !condition?key=value?>` - Set attribute `key` only if the variable `condition` is falsy.

- `<?attr condition?map?>` - Set a collection of attributes only if the variable `condition` is truthy.

- `<?attr !condition?map?>` - Set a collection of attributes only if the variable `condition` is falsy.

### CSS Classes

- `<?css value?>` - Add the css-class or array-of-classes provided in `value` (i.e. `value: 'highlighted'` or `value: ['primary','pressed']`)

- `<?css condition?value?>` - Add the css-class or array-of-classes provided in `value` if the variable `condition` is truthy.

## Sub-Templates

- `<?:templateName?>` - Use another template. For example:

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

```javascript
console.log(new UlTemplate({ items: ['a', 'b', 'c'], liTemplate }).toString());
```

Output:

```html
<ul>
  <li>a</li>
  <li>b</li>
  <li>c</li>
</ul>
```

## Easy-access to Content

### Using id (`<img id="foo" />`)

Any HTML elements with an `id` attribute can easily be access at `node.set[id]`, for example:

template.html:

```html
<button  id="cta">Foo</div>
```

javascript:

```javascript
const  node = new  Node();

node.set.cta.addEventListener('click', ... );
```

You can even replace the node entirely and the reference will point to the new element.

```javascript
node.set.cta = new ButtonTemplate({label:'login'});
node.set.cta.addEventListener('click', ... );
```

### Creating references to dynamic data

text nodes and html nodes that were added using `<?=text#?>` and `<?==html#?>` can also have quick-access, by adding a `#id` suffix. For example:

template.html:

```html
<div>
  Hello
  <?=firstName#?>
</div>
```

javascript:

```javascript
const node = new Node({ firstName: 'Adam' });

console.log(node.toString()); // output `<div>Hello Adam</div>`

node.set.firstName = 'Ben';

console.log(node.toString()); // output `<div>Hello Ben</div>`
```

The reference shares the variable-name that is used, but it can also differ:

1. `<?=text #id?> => node.set.id` - Create a textNode and update its value
2. `<?==html #id?> => node.set.id` - Create a node and update its value with either text or node

When setting `#id` to an html, it's the same effect as defining an `id` attribute to the element (as previously described) and similarly it allows replacing the entire node.

If the same `#id` is used twice, only the last reference will stay relevant.

### Setting references to attributes

Similarly you can create a reference to a specific attribute:

1. `<?attr href#=url?>` creates a reference at `node.set.href` and set initial value from `url`
2. `<?attr href#link=url?>` creates a reference at `node.set.link` with the initial value
3. `<?attr value#{variable}=key?>` creates a reference where the alias named is also a variable. for example, the data `{variable:'link', key:'localhost' }` the following statement will be true `node.set.link === 'localhost`
4. `<?attr attributeMap#?>` create an easy attribute-map setter `node.set.attributeMap = { attr1:'foo', attr2: 'bar' }`

It's important to note that the reference aren't independent variables, rather then reference so changes in the values will be reflected automatically:

```html
<div><input type="text" id="field" value="initial" /><?attr value#name=value?></div>
```

```javascript
node.set.field.value = 'hello'; //node.set.field refers to the input HTML element

console.log(node.set.name); // outputs 'hello
```

### Easy-access to content with Server-Side-Rendering

`node.set` can provide easy access to the code but it's only available when the node was rendered in the browser.

In order to support [Server-Side-Rendering](https://medium.com/@baphemot/whats-server-side-rendering-and-do-i-need-it-cb42dc059b38) (SSR), we can leave enough cues that can later be picked up to reconstruct a new `node.set`

By compiling `htmlEncode(htmlString, true, /*SSR = */ true)`, it will add additional attributes:

1. Every template's root receives the attribute `data-live-root` to indicate it's a separate component (This is useful when having sub-templates).

2. `<li><?=text #varName?></li>` => `<li data-live-text="0|varName"></li>` (added to the parent of the text node), note the 0 indicates the child's index.

3. `<ul><?==html #foo?><?==html #bar?></ul>` => `<ul data-live-html="0|foo;1:bar"><li></li><li></li></ul>` (added to the parent of the text node), Note the 1 indicates the child's index.

4. `<img><?attr attributeMap#? />` => `<img data-live-map="attributeMap" />`;

5. `<img><?attr src#=url?></div>` => `<div data-live-attr="src:src"></div>`;

6. `<img><?attr src#link=url alt#=text?></div>` => `<div data-live-attr="src:link;alt:alt"></div>`;

7. `id` attribute (e.g. `<img id="avatar" />`) don't have translated reference but it is picked up by the init regardless.

To reconnect all the references at the client side, import an `new MyTemplate({}, node)` using either:

```javascript
import MyForm from './MyComponent.template';

const myForm = new MyForm({}, document.getElementById('feedbackForm'));

console.log(myForm.set.starCount); // should have the reference to the value;
```

## The idea behind the project The HTML

The native HTML `<template>` element can be useful when (a) we have repetitive HTML content; or (b) when we're introducing new content. But

because of the static nature of HTML which doesn't really support any data-binding on its own, the `template` element

becomes meaningless:

I believe that there is a conceptual flaw with HTML `<template >` element (or maybe it is I who failed to find a reasonable tutorial how to use it properly): `<template >` tags are meant to help having dynamic content in the page by providing the template as base, but as long as it

is handled using javascript and not a pure-browser-native code, it must be encoded (for performance sake) to

javascript before being used, and if the translation occurs at the browser-side then by definition it'll effect

performance.

### How could it have worked natively

1. `<template>` tag should have a `data-bind` attribute, which is then connected to a javascript variable hold an object (or

   array of objects) with fields that will be populated natively. For example:

   ```html
   `<template data-bind="names"><li data-bind="name"></li></template>`
   ```

   would be displayed as `<li>Alex</li> <li>Ben</li>` And wouldn't it be wonderful if whenever names variable would change the html would refresh itself automatically?

2. If we could `data-bind-src` a URL with either JSON or XML data to be natively parsed into our template. But in all fairness, we don't need a `template` tag for that, we just need the html `bind` attribute.

   This would work great for pseudo-static HTML files (in the sense that there's no Javascript required for the

   page to function).

   And should we want a dynamic page perhaps we could pick the TemplateElement and use its `clone(data)` method to populate it with our data, so the usage would be:

   ```javascript

   const template = document.selectById("myTemplate");

   document.selectById("myParent").appendChild(template.clone(data, isWatchingData)

   ```

Without native-browser-based data-population and without javascript-less support, the `template` tags are utter pointless.

### JSX as a template alternative

And now let's talk about [JSX](https://medium.com/javascript-scene/jsx-looks-like-an-abomination-1c1ec351a918), which is another kind of

template. JSX in essence, is a pseudo-html code written within JS code and then pre-compiled to pure JS which is served to the browser.

Quite Similarly, [Svelte](https://gist.github.com/Rich-Harris/0f910048478c2a6505d1c32185b61934) is quite nice idea

It's a much more efficient way to write template but I don't like it, because in order to write proper JSX you need to proficient in both HTML and Javascript and for me it feels like a mix of responsibilities: HTML provides the structure to our page, while javascript provides computability and these are two different things from my point of view. I believe this separation of concern is bound to result in better code.

### This is where the html-encoder comes in

I would like to write a normal HTML file but empower it with a `data-bind` attribute without any additional javascript programming (it

would have been nice to do so natively but that's just wishful thinking) and this HTML can be pre-compiled on the server and served as a static page (live-refresh is bonus). The `HTML encoder` does exactly that:

1. Write a normal HTML file

2. Import it to your javascript code using `import Node from './example.template';` and then use it by appending it to the DOM -`document.appendChild(new Node());`

### The `<?...?>` tag

A guiding principle was to write an HTML valid code, but this raised the question - "Where can we place the computational instructions required?" and I found the Process Instructions (PI for short). they look a bit ugly I must admit -`<? ... ?>` but for the proof-of-concept they serve their purpose. Looking at other template systems such as [Vue](https://medium.com/@Pier/vue-js-the-good-the-meh-and-the-ugly-82800bbe6684), the PIs are attributes in the elements or new html-invalid elements (i.e. not part of the HTML language), While the `<? ... ?>` is a valid HTML element.

## Cheat-sheet

1. `<?=text?>`creates a textNode with the content of the variable named`text`.
2. `<?==html?>`creates an HTML element with the content of`html`, which can be either an HTML element or a string that will be parsed as HTML.
3. Conditions: `<??condition?>xxx<?/??>`will add the content only if condition is true. A boolean-negate (`!`) is also available so `<??!condition?>xxx<?/??>` will add the content only if condition is false.
4. Loops: `<?item:index@items?>xxx<?/@?>`will iterate over items (either an array or an object) providing the key and value and the given variable names (in the example it would be `item` and `index` )
5. Attributes: `<?attr key1=varName1 key2=varName2?>`will set the attributes in preceding element `<?attr attrObject?>` will set the attributes described in the `attrObject` (e.g. `<img/><?attr attrMap?> // attrMap={ src: "...", alt: "...", width: ...}` )
6. CSS classes: `<?css varName?>`will set the class(es) described in the variable that can be either a string or an array. it's also possible to condition a class by writing `<?class condition?varName?>`.
7. SubTemplates: When a subTemplates' class is provided with the data it can be used with`<?:subTemplateVarName?>`
8. Editable content: you can access nodes and attributes via`node.set.XXX` -
   - All elements that have an id (e.g. `<img id="editable" />` => `node.set.editable.src="..."`)
   - `<?=text#?>` => `node.set.text = 'hello world'`
   - `<?==text␣#value?>` => `node.set.value = 'hello world'`
   - `<??condition#?>xxx<?/??>` => `node.set.condition = true`
   - `<??condition␣#flag?>xxx<?/??>` => `node.set.flag = false`
   - `<?item:index@items#?>xxx<?/@?>` => `node.set.items = [...]`
   - `<?item:index@items␣#value?>xxx<?/@?>` => `node.set.value = [...]`
   - `<?attr attrMap#?>` => `node.set.attrMap = { ...};`
   - `<?attr value#=data?>` => `node.set.value = "foo";`
   - `<?attr value#{varName}=data?> / { data: 2, varName: "key"}` => `node.set.key = 3;`

## Future steps

This project is mostly thought-experiment in creating a relatively clean internet code, well-encapsulated and easy to use.

1. Ideally, I would have liked it to be a [Typescript](<[https://www.typescriptlang.org/](https://www.typescriptlang.org/)>) plugin and avoid the creation of the template.js files. Alternatively, I'm considering writing a [VSCode](<[https://code.visualstudio.com/](https://code.visualstudio.com/)>) extension that will automatically save the encoded versions of the file.
2. It would be great to check its performance compared to other frameworks
3. Next, I think it'll be time to create a real application and see whether it holds to its promise and allows easy development with no need to touch HTML code directly from the javascript.
