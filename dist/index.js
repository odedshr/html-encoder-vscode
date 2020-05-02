"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var xmldom_1 = require("xmldom");
var fs_1 = require("fs");
var domParser = new xmldom_1.DOMParser();
var NodeType = {
    Element: 1,
    Attribute: 2,
    Text: 3,
    CDATA: 4,
    EntityReference: 5,
    Entity: 6,
    ProcessingInstruction: 7,
    Comment: 8,
    Document: 9,
    DocumentType: 10,
    DocumentFragment: 11,
    Notation: 12,
};
function htmlEncoder(html, isTypescript) {
    if (isTypescript === void 0) { isTypescript = false; }
    var document = domParser.parseFromString(html.replace(/\n\s+>/g, '>'), 'text/xml');
    return treeShake(transpile(new NodeParser(document), isTypescript));
}
exports.default = htmlEncoder;
function getTemplateFile(isTypescript) {
    return __dirname + "/JSNode." + (isTypescript ? 'ts' : 'js');
}
function transpile(parser, isTypescript) {
    var transpiledString = parser.toString();
    if (transpiledString.indexOf('self.set') > -1) {
        transpiledString += ";self._defineSet();";
    }
    return fs_1.readFileSync(getTemplateFile(isTypescript), {
        encoding: 'utf-8',
    }).replace(/console\.log\(self, docElm\)[;,]/, "this.node = " + transpiledString + ";");
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
var SubRoutine = /** @class */ (function () {
    function SubRoutine(type, varName) {
        this.type = type;
        this.varName = varName;
        this.children = [];
    }
    SubRoutine.prototype.toString = function () {
        switch (this.type) {
            case 'loop':
                var _a = this.varName.split('@'), iteratorAndIndex = _a[0], varName = _a[1], _b = iteratorAndIndex.split(':'), iterator = _b[0], _c = _b[1], index = _c === void 0 ? '$i' : _c;
                return "self._forEach('" + iterator + "', '" + index + "','" + varName + "', function() {\n\t\t\t\t\t" + this.children.join('\n') + "\n\t\t\t\t});";
            case 'if':
                return "\n\t\t\t\t\tif (self._getValue(self.data, '" + this.varName + "')) {\n\t\t\t\t\t\t" + this.children.join('\n') + "\n\t\t\t\t\t}";
        }
    };
    return SubRoutine;
}());
var NodeParser = /** @class */ (function () {
    function NodeParser(document) {
        var _this = this;
        this.output = [];
        this.rootNode = document;
        if (!document || !document.firstChild) {
            // not content at all
            this.output.push("docElm.createDocumentFragment()");
        }
        else {
            var children = Array.from(document.childNodes);
            var docType = children[0].nodeType === NodeType.DocumentType ? children.shift() : false;
            if (children.length > 1) {
                this.output.push(this.wrapAndReturnELM(__spreadArrays([
                    "const elm = docElm.createDocumentFragment()"
                ], children.map(function (node) { return "elm.appendChild(" + _this.parseDocument(node) + ")"; }))));
            }
            else {
                this.output.push(this.parseDocument(children.pop()));
            }
            if (docType) {
                this.output.push(this.parseDocument(docType));
            }
        }
    }
    NodeParser.prototype.parseDocument = function (node) {
        var output = this.parseNode(node);
        if (output instanceof SubRoutine) {
            return output.toString();
        }
        else if (Array.isArray(output)) {
            return output.join('\n');
        }
        return output;
    };
    NodeParser.prototype.parseNode = function (node) {
        switch (node.nodeType) {
            case NodeType.DocumentType:
                return this.parseDocumentType(node);
            case NodeType.Document:
            case NodeType.DocumentFragment:
                if (node.childNodes.length !== 1) {
                    throw Error('document must have exactly one child');
                }
                return this.parseNode(node.firstChild);
            case NodeType.ProcessingInstruction:
                return this.parseProcessInstruction(node);
            case NodeType.Text:
                return this.parseTextElement(node);
            case NodeType.Comment:
                return this.parseCommentElement(node);
            default:
                return this.parseHtmlElement(node);
        }
    };
    NodeParser.prototype.parseProcessInstruction = function (node) {
        var tagName = node.target;
        if (tagName.indexOf('?') === 0) {
            return new SubRoutine('if', tagName.substring(1));
        }
        else if (tagName.match(/.+@.+/)) {
            return new SubRoutine('loop', tagName);
        }
        else if (['/@', '/?'].indexOf(tagName) > -1) {
            return null;
        }
        else if (tagName.indexOf('attr') === 0) {
            return this._getAttributeInstructions(node.nodeValue.split(/\s/));
        }
        else if (tagName.indexOf('css') === 0) {
            return this._getCssInstructions(node.nodeValue.split(/\s/));
        }
        else if (tagName.indexOf(':') === 0) {
            return ["elm.appendChild(self._getSubTemplate('" + tagName.substring(1) + "'))"];
        }
        else if (tagName.indexOf('==') === 0) {
            return [
                this._getAppendLivableString("self._getHTMLNode(self._getValue(self.data, '" + tagName.substring(2) + "'))", node.nodeValue, 'html'),
            ];
        }
        else if (tagName.indexOf('=') === 0) {
            return [
                this._getAppendLivableString("docElm.createTextNode(self._getValue(self.data, '" + tagName.substring(1) + "'))", node.nodeValue, 'text'),
            ];
        }
        return ["elm.appendChild(docElm.createProcessingInstruction('" + tagName + "','" + node.nodeValue + "'))"];
    };
    NodeParser.prototype._getAppendLivableString = function (nodeString, nodeValue, type) {
        var addToSetString = nodeValue.indexOf('#') === 0 ? "self.set['" + nodeValue.substring(1) + "'] = { node, type: '" + type + "' };" : '';
        return "elm.appendChild((function () { const node = " + nodeString + "; " + addToSetString + " return node; })());";
    };
    NodeParser.prototype.parseDocumentType = function (node) {
        return "self._setDocumentType('" + node.name + "','" + (node.publicId ? node.publicId : '') + "','" + (node.systemId ? node.systemId : '') + "')";
    };
    NodeParser.prototype.parseTextElement = function (node) {
        return "docElm.createTextNode(`" + node.textContent + "`)";
    };
    NodeParser.prototype.parseCommentElement = function (node) {
        return "docElm.createComment(`" + node.textContent + "`)";
    };
    NodeParser.prototype.parseHtmlElement = function (node) {
        var element = ["const elm = docElm.createElement('" + node.tagName + "');"];
        this.parseAttributes(node, element);
        element.push.apply(element, this.parseChildren(node));
        return this.wrapAndReturnELM(element);
    };
    NodeParser.prototype.wrapAndReturnELM = function (element) {
        return "(function () { " + element.join('\n') + "\n return elm; })()";
    };
    NodeParser.prototype.parseAttributes = function (node, element) {
        var _this = this;
        return Array.from(node.attributes || []).forEach(function (attr) {
            _this.rememberForEasyAccess(attr, element);
            element.push("elm.setAttribute('" + attr.nodeName + "','" + attr.nodeValue + "')");
        });
    };
    NodeParser.prototype.rememberForEasyAccess = function (attr, element) {
        if (attr.nodeName.toLowerCase() === 'id') {
            element.push("self.set['" + attr.nodeValue + "'] = { node: elm, type: 'attribute' };");
        }
    };
    NodeParser.prototype.parseChildren = function (node) {
        var _this = this;
        var childNodes = Array.from(node.childNodes || []);
        var stack = [];
        var children = [];
        // console.debug(`-- parsing ${node.tagName}: ${this._getChildrenDecription(childNodes)}`);
        childNodes.forEach(function (childNode) {
            var parsed = _this.parseNode(childNode);
            if (parsed instanceof SubRoutine) {
                parsed.parent = children;
                stack.push(parsed);
                //from now on, add to the subroutines' children list;
                children = parsed.children;
            }
            else if (parsed === null) {
                var subRoutine = stack.pop();
                if (!subRoutine) {
                    throw Error("end of subRoutine without start: " + _this.getChildrenDecription(childNodes));
                }
                children = subRoutine.parent;
                children.push(subRoutine.toString());
            }
            else if (Array.isArray(parsed)) {
                children.push.apply(children, parsed);
            }
            else {
                children.push("elm.appendChild(" + parsed + ")");
            }
        });
        return children;
    };
    NodeParser.prototype.getChildrenDecription = function (children) {
        return JSON.stringify(children.map(function (node) {
            switch (node.nodeType) {
                case NodeType.Document:
                case NodeType.DocumentFragment:
                    return 'doc';
                case NodeType.ProcessingInstruction:
                    return node.target;
                case NodeType.Text:
                    return "t{" + node.textContent + "}";
                case NodeType.Comment:
                    return "t{" + node.textContent + "}";
                default:
                    return node.tagName;
            }
        }));
    };
    // value is `condition?attrName=varName`
    NodeParser.prototype._parseAttrValue = function (value) {
        var matches = value.match(/((.+)\?)?([^=.]+)(=(.+))?/);
        return { condition: matches[2], attrName: matches[3], varName: matches[5] };
    };
    NodeParser.prototype._getAttributeInstructions = function (attributes) {
        var _this = this;
        var instructions = ['{ let node = self._getPreceedingOrSelf(elm), tmpAttrs;'];
        var liveId;
        if (attributes[attributes.length - 1].indexOf('#') === 0) {
            liveId = attributes.pop().substring(1);
        }
        attributes.forEach(function (attrValue) {
            var _a = _this._parseAttrValue(attrValue), condition = _a.condition, attrName = _a.attrName, varName = _a.varName;
            if (condition) {
                instructions.push("if (self._getValue(self.data, '" + condition + "')) {");
            }
            if (varName) {
                instructions.push("node.setAttribute('" + attrName + "', self._getValue(self.data, '" + varName.replace(/[\'"]/g, "\\'") + "'));");
                if (liveId) {
                    instructions.push("self.set['" + liveId + "#" + attrName + "'] = { node, type: 'attribute', 'attrName': '" + attrName + "'}");
                }
            }
            else {
                var addToLiveList = liveId
                    ? "self.set[`" + liveId + "#${k}`] = { node, type: 'attribute', 'attrName': k };"
                    : '';
                instructions.push("tmpAttrs = self._getValue(self.data, '" + attrName + "');");
                instructions.push("for (let k in tmpAttrs) { node.setAttribute(k, tmpAttrs[k]);" + addToLiveList + " }");
            }
            if (condition) {
                instructions.push('}');
            }
        });
        instructions.push('}');
        return instructions;
    };
    // value is `condition?cssName`
    NodeParser.prototype._parseCssValue = function (value) {
        var matches = value.match(/((.+)\?)?([^=.]+)/);
        return { condition: matches[2], varName: matches[3] };
    };
    NodeParser.prototype._getCssInstructions = function (classes) {
        var _this = this;
        var instructions = [
            "{ let tmpElm = self._getPreceedingOrSelf(elm), tmpCss = tmpElm.getAttribute('class') || '',\n\t\ttarget = tmpCss.length ? tmpCss.split(/s/) : [];",
        ];
        classes.forEach(function (varValue) {
            var _a = _this._parseCssValue(varValue), condition = _a.condition, varName = _a.varName;
            if (condition) {
                instructions.push("if (self._getValue(self.data, '" + condition + "')) {");
            }
            instructions.push("tmpCss = self._getValue(self.data, '" + varName + "');\n\t\t\t\t(Array.isArray(tmpCss) ? tmpCss : [tmpCss]).forEach(function (css) { target.push(css); });\n\t\t\t");
            if (condition) {
                instructions.push('}');
            }
        });
        instructions.push("tmpElm.setAttribute('class', target.join(' ')); }");
        return instructions;
    };
    NodeParser.prototype.toString = function () {
        return this.output.join(';');
    };
    return NodeParser;
}());
