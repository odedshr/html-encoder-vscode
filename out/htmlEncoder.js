"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xmldom_1 = require("xmldom");
const fs_1 = require("fs");
const parser_1 = require("./parser");
const domParser = new xmldom_1.DOMParser();
const encoding = 'utf-8';
function htmlEncoder(html, type = 'js', isSSR = false) {
    const document = domParser.parseFromString(html.replace(/\n\s+>/g, '>'), 'text/xml');
    return treeShake(transpile(new parser_1.default(document, type === 'ts'), type, isSSR));
}
exports.default = htmlEncoder;
function getTemplateFile(type) {
    switch (type) {
        case 'ts':
            return `${__dirname}/JSNode.template-ts`;
        case 'es':
            return `${__dirname}/JSNode.es.js`;
        default:
            return `${__dirname}/JSNode.js`;
    }
}
function transpile(parser, type, isSSR) {
    let parsedString = parser.toString();
    if (isSSR) {
        // variable isn't really being used, except for the tree-shaking phase
        parsedString += `;\n//_SSR();\n`;
    }
    if (parsedString.indexOf('self.register') > -1) {
        parsedString += `;self._defineSet(${isSSR});`;
    }
    return fs_1.readFileSync(getTemplateFile(type), { encoding })
        .replace(/console\.log\(self, docElm\)[;,]/, `this.node = ${parsedString};`)
        .replace(/\/\/ functions goes here/, parser.getFunctions());
}
function treeShake(code) {
    findFeatures(code).forEach((feature) => {
        const query = isFeatureUsed(code, feature)
            ? `\\s*\/\/ feature ${feature}( end)?` // remove feature's comments
            : `\\s*\/\/ feature ${feature}\\n[\\s\\S]*?\/\/ feature ${feature} end`; // remove feature
        code = code.replace(new RegExp(query, 'gm'), '');
    });
    return code;
}
function isFeatureUsed(code, feature) {
    return (code.match(new RegExp(`${feature} = function|${feature}\\(|${feature}.bind`, 'gm')) || []).length > 1;
}
function findFeatures(code) {
    const featureFinder = /\s*\/\/ feature (\w*) end\n/g; // /^\t*\/\/ (_\w*)$/g;
    const features = [];
    let match;
    while ((match = featureFinder.exec(code)) !== null) {
        features.push(match[1]);
    }
    return features;
}
//# sourceMappingURL=htmlEncoder.js.map