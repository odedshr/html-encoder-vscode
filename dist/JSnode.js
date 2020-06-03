"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initNode = exports.getNode = void 0;
// feature _SSR
// _SSR()
var xmldom_1 = require("xmldom");
var window = { DOMParser: xmldom_1.DOMParser };
// feature _SSR end
function getNode(data) {
    if (data === void 0) { data = {}; }
    return new JSNode(data);
}
exports.getNode = getNode;
function initNode(existingNode) {
    return new JSNode({}, existingNode);
}
exports.initNode = initNode;
var JSNode = /** @class */ (function () {
    function JSNode(data, existingNode) {
        var _this = this;
        this.set = {};
        this.domParser = new window.DOMParser();
        this.docElm = this.getDocElm();
        this.data = data;
        if (existingNode) {
            this.node = existingNode;
            this.initExitingElement();
        }
        else {
            this.fillNode();
        }
        var self = this;
        var originalToString = this.node.toString;
        this.node.toString = function () { return self.fixHTMLTags(originalToString.call(_this.node)); };
        return this.node;
    }
    JSNode.prototype.initExitingElement = function () {
        var self = this;
        if (this.node.nodeType === 9) {
            Array.from(this.node.childNodes)
                .filter(function (child) { return !!child.setAttribute; })
                .forEach(function (child) { return initChild(self, child); });
        }
        else {
            initChild(self, this.node);
        }
        // feature _defineSet
        addReactiveFunctionality(this.node, this.set, this.domParser);
        // feature _defineSet end
    };
    JSNode.prototype.fillNode = function () {
        var self = this;
        //docElm is used by injected code
        var docElm = this.docElm;
        // main code goes here:
        //@ts-ignore returned value might be DocumentFragment which isn't a childNode, which might cause tsc to complain
        console.log(self, docElm);
        // end of main code
    };
    JSNode.prototype.getDocElm = function () {
        return typeof document !== 'undefined' ? document : this.domParser.parseFromString('<html></html>', 'text/xml');
    };
    // feature register
    JSNode.prototype.register = function (key, value) {
        if (!this.set[key]) {
            this.set[key] = [];
        }
        this.set[key].push(value);
    };
    // feature register end
    // feature _setDocumentType
    JSNode.prototype._setDocumentType = function (name, publicId, systemId) {
        var nodeDoctype = this.docElm.implementation.createDocumentType(name, publicId, systemId);
        if (this.docElm.doctype) {
            this.docElm.replaceChild(nodeDoctype, this.docElm.doctype);
        }
        else {
            this.docElm.insertBefore(nodeDoctype, this.docElm.childNodes[0]);
        }
        // removing empty <html/> and adding this.node instead; I got an error when I tried to use replaceChild here
        this.docElm.removeChild(this.docElm.childNodes[1]);
        this.docElm.appendChild(this.node);
        //@ts-ignore
        this.node = this.docElm;
    };
    // feature _setDocumentType end
    // feature _defineSet
    JSNode.prototype._defineSet = function (isSSR) {
        if (Object.keys(this.set).length) {
            if (isSSR) {
                // if node is Document refer to the first child (the <html>);
                (this.node.nodeType === 9 ? this.findHTMLChildren(this.node) : [this.node]).forEach(function (node) {
                    return node.setAttribute('data-live-root', '');
                });
                addServerReactiveFunctionality(this.set);
            }
            else {
                addReactiveFunctionality(this.node, this.set, this.domParser);
            }
        }
    };
    JSNode.prototype.findHTMLChildren = function (root) {
        return Array.from(root.childNodes).filter(function (child) { return !!child.setAttribute; });
    };
    // feature _defineSet end
    // feature _getSubTemplate
    JSNode.prototype._getSubTemplate = function (templateName) {
        var self = this;
        var Template = self._getValue(this.data, templateName);
        return new Template(this.data);
    };
    // feature _getSubTemplate end
    // feature _forEach
    JSNode.prototype._forEach = function (iteratorName, indexName, list, parent, fn) {
        var self = this;
        var orig = {
            iterator: self._getValue(this.data, iteratorName),
            index: self._getValue(this.data, indexName),
        };
        var items = [];
        for (var id in list) {
            self._setValue(this.data, indexName, id);
            self._setValue(this.data, iteratorName, list[id]);
            items.push(getAddedChildren(parent, fn));
        }
        self._setValue(this.data, iteratorName, orig.iterator);
        self._setValue(this.data, indexName, orig.index);
        return items;
    };
    // feature _forEach end
    // feature _getPrecedingOrSelf
    JSNode.prototype._getPrecedingOrSelf = function (elm) {
        //@ts-ignore
        var children = Array.from(elm.childNodes);
        children.reverse();
        return (children.find(function (child) {
            return child.nodeType === 1;
        }) || elm);
    };
    // feature _getPrecedingOrSelf end
    // feature _getValue
    JSNode.prototype._getValue = function (data, path) {
        if (path.match(/^(['"].*(\1))$/)) {
            return path.substring(1, path.length - 1);
        }
        return path[0] === '!'
            ? !this._getValue(data, path.substr(1))
            : path.split('.').reduce(function (ptr, step) {
                return ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined;
            }, data);
    };
    // feature _getValue end
    // feature _setValue
    JSNode.prototype._setValue = function (data, path, value) {
        var pathParts = path.split('.');
        var varName = pathParts.pop();
        pathParts.reduce(function (ptr, step) {
            return ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined;
        }, data)[varName] = value;
    };
    // feature _setValue end
    // feature _getHTMLNode
    JSNode.prototype._getHTMLNode = function (htmlString) {
        if (!(typeof htmlString === 'string')) {
            return htmlString;
        }
        if (!htmlString.match(/<(.*?)>.*<\/(\1)>/)) {
            return this.docElm.createTextNode(htmlString);
        }
        else if (!htmlString.match(/^<(.*?)>.*<\/(\1)>$/)) {
            // htmlString is text that has html tags in it, we need to wrap it
            htmlString = "<span>" + htmlString.replace(/& /g, '&amp; ') + "</span>";
        }
        try {
            return this.domParser.parseFromString(htmlString, 'text/xml').firstChild;
        }
        catch (err) {
            console.error("failed to parse string: " + htmlString, err);
            return this.docElm.createTextNode(htmlString);
        }
    };
    // feature _getHTMLNode end
    // feature fixHTMLTags
    JSNode.prototype.fixHTMLTags = function (xmlString) {
        return xmlString.replace(/\<(?!area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([a-z|A-Z|_|\-|:|0-9]+)([^>]*)\/\>/gm, '<$1$2></$1>');
    };
    return JSNode;
}());
exports.default = JSNode;
// functions go here
// feature clone
function clone(item) {
    return typeof item === 'object' ? Object.freeze(Array.isArray(item) ? __spreadArrays(item) : __assign({}, item)) : item;
}
// feature clone end
// feature getAddedChildren
function getAddedChildren(parent, fn) {
    var items = [];
    var beforeChildCount = parent.childNodes.length;
    fn();
    var afterChildCount = parent.childNodes.length;
    for (var i = beforeChildCount; i < afterChildCount; i++) {
        items.push(parent.childNodes.item(i));
    }
    return items;
}
// feature getAddedChildren end
// feature _defineSet
function addServerReactiveFunctionality(set) {
    if (set === void 0) { set = {}; }
    var _loop_1 = function (key) {
        set[key].forEach(function (property) {
            var node = property.node;
            var parentNode = node.parentNode;
            switch (property.type) {
                case 'text':
                    appendAttribute(parentNode, 'data-live-text', indexOfChild(parentNode.childNodes, node) + "|" + key);
                    break;
                case 'html':
                    if (!node.getAttribute || !(node.getAttribute('id') === key)) {
                        var parentNode_1 = node.parentNode;
                        appendAttribute(parentNode_1, 'data-live-html', indexOfChild(parentNode_1.childNodes, node) + "|" + key);
                    }
                    break;
                case 'attribute':
                    if (property.attrName) {
                        appendAttribute(node, 'data-live-attr', property.attrName + "|" + key);
                    }
                    else {
                        node.setAttribute('data-live-map', key);
                    }
                    break;
                case 'loop':
                    {
                        var _a = property.details, fn = _a.fn, startAt = _a.startAt, items = _a.items, nodes = _a.nodes;
                        appendAttribute(node, 'data-live-loop', startAt + "|" + key + "|" + fn.name.replace(/bound /, '') + "|" + JSON.stringify(items));
                        nodes.forEach(function (collection, i) {
                            return collection.forEach(function (item) { return appendAttribute(item, 'data-live-loop-child', key + "|" + i); });
                        });
                    }
                    break;
                case 'conditional':
                    {
                        var _b = property.details, fn = _b.fn, startAt = _b.startAt, flag = _b.flag, nodes = _b.nodes;
                        appendAttribute(node, 'data-live-if', startAt + "|" + key + "|" + fn.name.replace(/bound /, '') + "|" + flag);
                        nodes.forEach(function (collection, i) {
                            return collection.forEach(function (item) { return appendAttribute(item, 'data-live-if-child', key + "|" + i); });
                        });
                    }
                    break;
            }
        });
    };
    for (var key in set) {
        _loop_1(key);
    }
}
function indexOfChild(childNodes, child) {
    return Array.prototype.indexOf.call(childNodes, child);
}
function appendAttribute(node, attributeName, newChild) {
    var value = [newChild];
    if (node.hasAttribute(attributeName)) {
        value.unshift(node.getAttribute(attributeName));
    }
    node.setAttribute(attributeName, value.join(';'));
}
function addReactiveFunctionality(node, set, domParser) {
    if (set === void 0) { set = {}; }
    Object.defineProperty(node, 'set', {
        value: getSetProxy(set, domParser),
        configurable: true,
        writable: true,
    });
}
function getSetProxy(map, domParser) {
    return new Proxy(map, {
        get: function (map, prop) {
            var property = map[prop][0];
            if (property) {
                switch (property.type) {
                    case 'text':
                        return property.node.textContent;
                    case 'html':
                        return property.node;
                    case 'attribute':
                        return property.node.getAttribute(property.attrName);
                    case 'loop':
                        return property.details.items;
                    case 'conditional':
                        return property.details.flag;
                }
            }
        },
        set: function (map, prop, value) {
            map[prop].forEach(function (property) {
                switch (property.type) {
                    case 'text':
                        property.node.data = value;
                        break;
                    case 'html':
                        try {
                            var newNode = typeof value === 'string' ? domParser.parseFromString(value, 'text/xml') : value;
                            property.node.parentNode.replaceChild(newNode, property.node);
                            property.node = newNode;
                        }
                        catch (err) {
                            console.error("failed to replace node to " + value, err);
                        }
                        break;
                    case 'attribute':
                        if (property.attrName) {
                            // single attribute
                            if (value === null) {
                                property.node.removeAttribute(property.attrName);
                            }
                            else {
                                property.node.setAttribute(property.attrName, value);
                            }
                        }
                        else {
                            // attribute map
                            Object.keys(value).forEach(function (attrName) { return property.node.setAttribute(attrName, value[attrName]); });
                        }
                        break;
                    case 'loop':
                        updateLoop(property, value);
                        break;
                    case 'conditional':
                        updateConditional(property, value);
                        break;
                }
            });
            return true;
        },
    });
}
function countElementsUntilIndex(items, index) {
    var acc = 0;
    for (var i = 0; i < index; i++) {
        acc += items[i].length;
    }
    return acc;
}
function updateLoop(property, value) {
    var parent = property.node;
    var _a = property.details, fn = _a.fn, items = _a.items, nodes = _a.nodes, startAt = _a.startAt;
    var instructions = diff(items, value);
    var removedChildren = instructions.removed.map(function (i) {
        nodes[i].forEach(function (node) { return parent.removeChild(node); });
        return nodes[i];
    });
    fn(instructions.added).forEach(function (children) { return nodes.push(children); });
    var updatedNodes = nodes.filter(function (node) { return !removedChildren.includes(node); });
    instructions.positions.forEach(function (newIndex, i) {
        if (newIndex !== -1) {
            var newP = countElementsUntilIndex(updatedNodes, newIndex);
            var sibling_1 = parent.childNodes.item(startAt + newP);
            if (sibling_1 !== updatedNodes[i][0]) {
                updatedNodes[i].forEach(function (child) { return parent.insertBefore(child, sibling_1); });
            }
        }
    });
    property.details.nodes = updatedNodes;
    property.details.items = clone(value);
}
function diff(source, target) {
    var placed = target.map(function () { return false; });
    var output = {
        removed: [],
        added: [],
        positions: [],
    };
    source.forEach(function (item, from) {
        var position = target.findIndex(function (targetItem, j) { return targetItem === item && !placed[j]; });
        if (position === -1) {
            output.removed.push(from);
        }
        else {
            output.positions.push(position);
            placed[position] = true;
        }
    });
    output.removed = output.removed.sort().reverse();
    target.forEach(function (item, position) {
        if (!placed[position]) {
            output.positions.push(position);
            output.added.push(item);
        }
    });
    return output;
}
function updateConditional(property, value) {
    var parent = property.node;
    var updatedNodes = [];
    var _a = property.details, fn = _a.fn, flag = _a.flag, nodes = _a.nodes, startAt = _a.startAt;
    if (flag && !value) {
        while (nodes[0].length) {
            parent.removeChild(nodes[0].pop());
        }
    }
    else if (!flag && value) {
        updatedNodes = [fn(value)];
        if (parent.childNodes.length < startAt) {
            property.details.startAt = parent.childNodes.length - updatedNodes[0].length;
        }
        else {
            var sibling_2 = parent.childNodes.item(startAt);
            updatedNodes[0].forEach(function (node) { return parent.insertBefore(node, sibling_2); });
        }
    }
    property.details.nodes = updatedNodes;
    property.details.flag = value;
}
function initChild(self, node) {
    if (!!node.hasAttribute) {
        if (node.hasAttribute('id')) {
            self.register(node.getAttribute('id'), { type: 'html', node: node });
        }
        if (node.hasAttribute('data-live-text')) {
            node
                .getAttribute('data-live-text')
                .split(';')
                .forEach(function (attr) {
                var _a = attr.split('|'), childIndex = _a[0], varName = _a[1];
                while (node.childNodes.length <= +childIndex) {
                    node.appendChild(document.createTextNode(''));
                }
                self.register(varName, { type: 'text', node: node.childNodes[+childIndex] });
            });
        }
        if (node.hasAttribute('data-live-html')) {
            node
                .getAttribute('data-live-html')
                .split(';')
                .forEach(function (attr) {
                var _a = attr.split('|'), childIndex = _a[0], varName = _a[1];
                self.register(varName, { type: 'html', node: node.childNodes[+childIndex] });
            });
        }
        if (node.hasAttribute('data-live-map')) {
            self.register(node.getAttribute('data-live-map'), { type: 'attribute', node: node });
        }
        if (node.hasAttribute('data-live-attr')) {
            node
                .getAttribute('data-live-attr')
                .split(';')
                .forEach(function (attr) {
                var _a = attr.split('|'), attrName = _a[0], varName = _a[1];
                self.register(varName, { type: 'attribute', node: node, attrName: attrName });
            });
        }
        if (node.hasAttribute('data-live-loop')) {
            var nodes_1 = getSubroutineChildren(node, 'data-live-loop-child');
            node
                .getAttribute('data-live-loop')
                .split(';')
                .forEach(function (attr) {
                var _a = attr.split('|'), startAt = _a[0], varName = _a[1], fnName = _a[2], stringValue = _a[3];
                var fn = eval(fnName).bind({}, self, self.docElm, node);
                self.register(varName, {
                    type: 'loop',
                    node: node,
                    details: { startAt: +startAt, items: JSON.parse(stringValue), nodes: nodes_1[varName], fn: fn },
                });
            });
        }
        if (node.hasAttribute('data-live-if')) {
            var nodes_2 = getSubroutineChildren(node, 'data-live-if-child');
            node
                .getAttribute('data-live-if')
                .split(';')
                .forEach(function (attr) {
                var _a = attr.split('|'), startAt = _a[0], varName = _a[1], fnName = _a[2], flag = _a[3];
                var fn = eval(fnName).bind({}, self, self.docElm, node);
                self.register(varName, {
                    type: 'conditional',
                    node: node,
                    details: { startAt: +startAt, flag: flag === 'true', nodes: nodes_2[varName], fn: fn },
                });
            });
        }
    }
    Array.from(node.childNodes)
        .filter(function (child) { return !!child.hasAttribute && !child.hasAttribute('data-live-root'); })
        .forEach(function (child) { return initChild(self, child); });
}
function getSubroutineChildren(node, attribute) {
    var output = {};
    Array.from(node.childNodes).forEach(function (child) {
        if (child.hasAttribute(attribute)) {
            var _a = child.getAttribute(attribute).split('|'), key = _a[0], collection = _a[1];
            if (!output[key]) {
                output[key] = [];
            }
            if (!output[key][+collection]) {
                output[key][+collection] = [];
            }
            output[key][+collection].push(child);
        }
    });
    return output;
}
// feature _defineSet end
