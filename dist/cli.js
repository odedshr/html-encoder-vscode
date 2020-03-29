"use strict";
// ./node_modules/.bin/rollup -f cjs ./html-encoder/src/index.js -o  ./html-encoder/dist/cli.js
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var index_js_1 = require("./index.js");
var _a = process.argv.slice(2), input = _a[0], output = _a[1];
var toTypescript = output.endsWith('.ts');
if (!fs_1.existsSync(input)) {
    console.error("File not exists - " + input);
    process.exit();
}
fs_1.writeFileSync(output, index_js_1.default(fs_1.readFileSync(input, { encoding: 'utf-8' }), toTypescript));
console.log("transpiled to " + output);
