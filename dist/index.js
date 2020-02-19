'use strict';

var xmldom = require('xmldom');
var fs = require('fs');

function htmlEncoder(html, isTypescript) {
    if (isTypescript === void 0) { isTypescript = false; }
    var document = domParser.parseFromString(html, 'text/xml');
    var nodeParser = new NodeParser(document);
    return transpile(nodeParser, isTypescript);
}
function transpile(parser, isTypescript) {
    return fs.readFileSync(getTemplateFile(isTypescript), { encoding: 'utf-8' }).replace(/console\.log\(docElm\)[;,]/, "this.node = " + parser.toString() + ";");
}
function getTemplateFile(isTypescript) {
    return __dirname + "/JSNode." + (isTypescript ? 'ts' : 'js');
}
var domParser = new xmldom.DOMParser(), NodeType = {
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
    Notation: 12
};
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
                return "this._forEach('" + iterator + "', '" + index + "','" + varName + "', () => {\n\t\t\t\t\t" + this.children.join('\n') + "\n\t\t\t\t});";
            case 'if':
                return "\n\t\t\t\t\tif (this._getValue(this.data, '" + this.varName + "')) {\n\t\t\t\t\t\t" + this.children.join('\n') + "\n\t\t\t\t\t}";
        }
    };
    return SubRoutine;
}());
var NodeParser = /** @class */ (function () {
    function NodeParser(document) {
        this.rootNode = document;
        this.output = this._pareseDocument(document.firstChild);
    }
    NodeParser.prototype._pareseDocument = function (node) {
        var output = this._parseNode(node);
        if (output instanceof SubRoutine) {
            return output.toString();
        }
        else if (Array.isArray(output)) {
            return output.join('\n');
        }
        return output;
    };
    NodeParser.prototype._parseNode = function (node) {
        switch (node.nodeType) {
            case NodeType.Document:
            case NodeType.DocumentFragment:
                if (node.childNodes.length !== 1) {
                    throw Error('document must have exactly one child');
                }
                return this._parseNode(node.firstChild);
            case NodeType.ProcessingInstruction:
                return this._parseProcessInstruction(node);
            case NodeType.Text:
                return this._parseTextElement(node);
            case NodeType.Comment:
                return this._parseCommentElement(node);
            default:
                return this._parseHtmlElement(node);
        }
    };
    NodeParser.prototype._parseProcessInstruction = function (node) {
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
            return ["elm.appendChild(this._getSubTemplate('" + tagName.substring(1) + "'))"];
        }
        else if (tagName.indexOf('==') === 0) {
            return [
                this._getAppendLivableString("this.domParser.parseFromString(this._getValue(this.data, '" + tagName.substring(2) + "'), 'text/xml')", node.nodeValue, 'html')
            ];
        }
        else if (tagName.indexOf('=') === 0) {
            return [
                this._getAppendLivableString("docElm.createTextNode(this._getValue(this.data, '" + tagName.substring(1) + "'))", node.nodeValue, 'text')
            ];
        }
        return ["elm.appendChild(docElm.createProcessingInstruction('" + tagName + "','" + node.nodeValue + "'))"];
    };
    NodeParser.prototype._getAppendLivableString = function (nodeString, nodeValue, type) {
        var addToSetString = nodeValue.indexOf('#') === 0 ? "this.set['" + nodeValue.substring(1) + "'] = { node, type: '" + type + "' };" : '';
        return "elm.appendChild((() => { const node = " + nodeString + "; " + addToSetString + " return node; })());";
    };
    NodeParser.prototype._parseTextElement = function (node) {
        return "docElm.createTextNode(`" + node.textContent + "`)";
    };
    NodeParser.prototype._parseCommentElement = function (node) {
        return "docElm.createComment(`" + node.textContent + "`)";
    };
    NodeParser.prototype._parseHtmlElement = function (node) {
        var element = ["const elm = docElm.createElement('" + node.tagName + "');"];
        this._parseAttributes(node, element);
        element.push.apply(element, this._parseChildren(node));
        return this._wrapAndReturnELM(element);
    };
    NodeParser.prototype._wrapAndReturnELM = function (element) {
        return "(() => { " + element.join('\n') + "\n return elm; })()";
    };
    NodeParser.prototype._parseAttributes = function (node, element) {
        var _this = this;
        return Array.from(node.attributes || []).forEach(function (attr) {
            _this._rememberForEasyAccess(attr, element);
            element.push("elm.setAttribute('" + attr.nodeName + "','" + attr.nodeValue + "')");
        });
    };
    NodeParser.prototype._rememberForEasyAccess = function (attr, element) {
        if (attr.nodeName.toLowerCase() === 'id') {
            element.push("this.set['" + attr.nodeValue + "'] = { node: elm, type: 'attribute' };");
        }
    };
    NodeParser.prototype._parseChildren = function (node) {
        var _this = this;
        var stack = [];
        var children = [];
        Array.from(node.childNodes || []).forEach(function (childNode) {
            var parsed = _this._parseNode(childNode);
            if (parsed instanceof SubRoutine) {
                parsed.parent = children;
                stack.push(parsed);
                //from now on, add to the subroutines' children list;
                children = parsed.children;
            }
            else if (parsed === null) {
                var subRoutine = stack.pop();
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
    // value is `condition?attrName=varName`
    NodeParser.prototype._parseAttrValue = function (value) {
        var matches = value.match(/((.+)\?)?([^=.]+)(=(.+))?/);
        return { condition: matches[2], attrName: matches[3], varName: matches[5] };
    };
    NodeParser.prototype._getAttributeInstructions = function (attributes) {
        var _this = this;
        var instructions = ['{ let node = this._getFirstOrSelf(elm), tmpAttrs;'];
        var liveId;
        if (attributes[attributes.length - 1].indexOf('#') === 0) {
            liveId = attributes.pop().substring(1);
        }
        attributes.forEach(function (attrValue) {
            var _a = _this._parseAttrValue(attrValue), condition = _a.condition, attrName = _a.attrName, varName = _a.varName;
            if (condition) {
                instructions.push("if (this._getValue(this.data, '" + condition + "')) {");
            }
            if (varName) {
                instructions.push("node.setAttribute('" + attrName + "', this._getValue(this.data, '" + varName.replace(/[\'"]/g, "\\'") + "'));");
                if (liveId) {
                    instructions.push("this.set['" + liveId + "#" + attrName + "'] = { node, type: 'attribute', 'attrName': '" + attrName + "'}");
                }
            }
            else {
                var addToLiveList = liveId
                    ? "this.set[`" + liveId + "#${k}`] = { node, type: 'attribute', 'attrName': k };"
                    : '';
                instructions.push("tmpAttrs = this._getValue(this.data, '" + attrName + "');");
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
            "{ let tmpElm = this._getFirstOrSelf(elm), tmpCss = tmpElm.getAttribute('class') || '',\n\t\ttarget = tmpCss.length ? tmpCss.split(/s/) : [];"
        ];
        classes.forEach(function (varValue) {
            var _a = _this._parseCssValue(varValue), condition = _a.condition, varName = _a.varName;
            if (condition) {
                instructions.push("if (this._getValue(this.data, '" + condition + "')) {");
            }
            instructions.push("tmpCss = this._getValue(this.data, '" + varName + "');\n\t\t\t\t(Array.isArray(tmpCss) ? tmpCss : [tmpCss]).forEach(css => target.push(css));\n\t\t\t");
            if (condition) {
                instructions.push('}');
            }
        });
        instructions.push("tmpElm.setAttribute('class', target.join(' ')); }");
        return instructions;
    };
    NodeParser.prototype.toString = function () {
        return this.output;
    };
    return NodeParser;
}());

module.exports = htmlEncoder;
