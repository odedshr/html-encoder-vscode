"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xmldom_1 = require("xmldom");
var fs_1 = require("fs");
var parser_1 = require("./parser");
var domParser = new xmldom_1.DOMParser();
var encoding = 'utf-8';
function htmlEncoder(html, isTypescript, isSSR) {
    if (isTypescript === void 0) { isTypescript = false; }
    if (isSSR === void 0) { isSSR = false; }
    var document = domParser.parseFromString(html.replace(/\n\s+>/g, '>'), 'text/xml');
    return treeShake(transpile(new parser_1.default(document), isTypescript, isSSR));
}
exports.default = htmlEncoder;
function getTemplateFile(isTypescript) {
    return __dirname + "/JSNode." + (isTypescript ? 'ts' : 'js');
}
function transpile(parser, isTypescript, isSSR) {
    var parsedString = parser.toString();
    if (isSSR) {
        // variable isn't really being used, except for the tree-shaking phase
        parsedString += ";\n//_SSR();\n";
    }
    if (parsedString.indexOf('self.register') > -1) {
        parsedString += ";self._defineSet(" + isSSR + ");";
    }
    return fs_1.readFileSync(getTemplateFile(isTypescript), { encoding: encoding })
        .replace(/console\.log\(self, docElm\)[;,]/, "this.node = " + parsedString + ";")
        .replace(/\/\/ functions go here/, parser.getFunctions());
}
function treeShake(code) {
    findFeatures(code).forEach(function (feature) {
        var query = isFeatureUsed(code, feature)
            ? "\\s*// feature " + feature + "( end)?" // remove feature's comments
            : "\\s*// feature " + feature + "\\n[\\s\\S]*?// feature " + feature + " end"; // remove feature
        code = code.replace(new RegExp(query, 'gm'), '');
    });
    return code;
}
function isFeatureUsed(code, feature) {
    return (code.match(new RegExp(feature + " = function|" + feature + "\\(", 'gm')) || []).length > 1;
}
function findFeatures(code) {
    var featureFinder = /\s*\/\/ feature (\w*) end\n/g; // /^\t*\/\/ (_\w*)$/g;
    var features = [];
    var match;
    while ((match = featureFinder.exec(code)) !== null) {
        features.push(match[1]);
    }
    return features;
}
