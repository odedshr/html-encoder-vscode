# HTML Encoder extension for VS-code

[![Build Status](https://travis-ci.org/odedshr/html-encoder-vscode.svg?branch=master)](https://travis-ci.org/odedshr/html-encoder-vscode)

[![Dependency Status](https://david-dm.org/odedshr/html-encoder-vscode.svg?theme=shields.io)](https://david-dm.org/odedshr/html-encoder-vscode)

[![license](https://img.shields.io/badge/license-ISC-brightgreen.svg)](https://github.com/odedshr/html-encoder-vscode/blob/master/LICENSE)

## The Main Gist

HTML-Encoder converts your template HTML file to a JavaScript/TypeScript function (henceforth JSNode) as soon as you save it.
The file can then be embedded in either server-side or client-side code. It's pretty much like [JSX](https://reactjs.org/docs/introducing-jsx.html) or [Svelete](https://svelte.dev/) but without any special render command and it allowing you to write vanilla/Typescript code.

See a live example at the [showcase](https://odedshr.github.io/html-encoder-showcase/).

### Getting it to work

After enabling the extension, simply save a `[filename].template.html` file and the `filename.template.js` will pop up in the same folder.
You can then easily embed by importing it to your code and appending the node to the DOM tree:

```javascript
import { getNode } from 'login-screen.template.js';

document.appendChild(getNode());
```

### Different outputs

Should you wish to save to a different destination, simply add the tag `<?out /path-to-new-target.ts ?>`.
Target path can be relative to the source's path or absolute

- If the target extension is `ts` the output file will have Typescript notation.
- The standard output is [commonJS](https://medium.com/@cgcrutch18/commonjs-what-why-and-how-64ed9f31aa46#:~:text=CommonJS%20is%20a%20module%20formatting,heavily%20influenced%20NodeJS's%20module%20management.)-compliant; Should you wish to have a [ESNext](https://www.javascripttutorial.net/es-next/) compliant change your target suffix to `es` (e.g. `<?out *.es?>`).
- `ssr` parameter will allow you to add additional meta-data that when passed to the browser `<?out:ssr target.ts ?>`

## HTML-Encoder is powerful and support dynamic content

You can read more about it on [github](https://github.com/odedshr/html-encoder#dynamic-content-support).

## tl;dr Cheat-sheet

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
