"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xmldom_1 = require("xmldom");
var fs_1 = require("fs");
var parser_1 = require("./parser");
var domParser = new xmldom_1.DOMParser();
function htmlEncoder(html, isTypescript) {
    if (isTypescript === void 0) { isTypescript = false; }
    var document = domParser.parseFromString(html.replace(/\n\s+>/g, '>'), 'text/xml');
    return treeShake(transpile(new parser_1.default(document), isTypescript));
}
exports.default = htmlEncoder;
function getTemplateFile(isTypescript) {
    return __dirname + "/JSNode." + (isTypescript ? 'ts' : 'js');
}
function transpile(parser, isTypescript) {
    var transpiledString = parser.toString();
    if (transpiledString.indexOf('self.set') > -1) {
        transpiledString += ";self._defineSet(isSSR);";
    }
    return fs_1.readFileSync(getTemplateFile(isTypescript), {
        encoding: 'utf-8',
    }).replace(/console\.log\(self, docElm, isSSR\)[;,]/, "this.node = " + transpiledString + ";");
}
function treeShake(code) {
    findFeatures(code).forEach(function (feature) {
        var query = code.indexOf("self." + feature) === -1
            ? "\\s*// feature " + feature + "\\n[\\s\\S]*?// feature " + feature + " end\n"
            : "\\s*// feature " + feature + "( end)?\\n";
        code = code.replace(new RegExp(query, 'gm'), '');
    });
    return code;
}
function findFeatures(code) {
    var featureFinder = /\s*\/\/ feature (_\w*) end\n/g; // /^\t*\/\/ (_\w*)$/g;
    var features = [];
    var match;
    while ((match = featureFinder.exec(code)) !== null) {
        features.push(match[1]);
    }
    return features;
}
