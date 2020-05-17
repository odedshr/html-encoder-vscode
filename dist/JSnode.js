"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var JSNode = /** @class */ (function () {
    function JSNode(data, domParserInstance, isSSR) {
        var _this = this;
        if (isSSR === void 0) { isSSR = false; }
        this.set = {};
        this.domParser = this.getDOMParser(domParserInstance);
        this.docElm = this.getDocElm();
        this.data = data;
        var self = this;
        //docElm is used by injected code
        var docElm = this.docElm;
        // main code goes here:
        //@ts-ignore returned value might be DocumentFragment which isn't a childNode, which might cause tsc to complain
        console.log(self, docElm, isSSR);
        // end of main code
        var originalToString = this.node.toString;
        this.node.toString = function () { return fixHTMLTags(originalToString.call(_this.node)); };
        return this.node;
    }
    JSNode.prototype.getDocElm = function () {
        return typeof document !== 'undefined' ? document : this.domParser.parseFromString('<html></html>', 'text/xml');
    };
    JSNode.prototype.getDOMParser = function (domParserInstance) {
        if (domParserInstance) {
            return domParserInstance;
        }
        var _get = function (item, key) {
            return item[key];
        };
        if (this.constructor.hasOwnProperty('DOMParser')) {
            return new (_get(this.constructor, 'DOMParser'))();
        }
        if (typeof window !== 'undefined' && window.DOMParser) {
            return new window.DOMParser();
        }
        else {
            throw new ReferenceError('DOMParser is not defined');
        }
    };
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
                // if (this.node.hasOwnProperty('setAttribute')) {
                this.node.setAttribute('data-live-root', '');
                // }
                addServerReactiveFunctionality(this.set);
            }
            else {
                addReactiveFunctionality(this.node, this.set, this.domParser);
            }
        }
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
    JSNode.prototype._forEach = function (iteratorName, indexName, varName, fn) {
        var self = this;
        var orig = {
            iterator: self._getValue(this.data, iteratorName),
            index: self._getValue(this.data, indexName),
        };
        var list = self._getValue(this.data, varName);
        for (var k in list) {
            self._setValue(this.data, indexName, k);
            self._setValue(this.data, iteratorName, list[k]);
            fn();
        }
        self._setValue(this.data, iteratorName, orig.iterator);
        self._setValue(this.data, indexName, orig.index);
    };
    // feature _forEach end
    // feature _getPreceedingOrSelf
    JSNode.prototype._getPreceedingOrSelf = function (elm) {
        //@ts-ignore
        var children = Array.from(elm.childNodes);
        children.reverse();
        return (children.find(function (child) {
            return child.nodeType === 1;
        }) || elm);
    };
    // feature _getPreceedingOrSelf end
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
            // console.debug ('parsing ', htmlString);
            return this.domParser.parseFromString(htmlString, 'text/xml').firstChild;
        }
        catch (err) {
            console.error("failed to parse string: " + htmlString, err);
            return this.docElm.createTextNode(htmlString);
        }
    };
    return JSNode;
}());
exports.default = JSNode;
// feature _defineSet
function addServerReactiveFunctionality(set) {
    if (set === void 0) { set = {}; }
    for (var key in set) {
        var property = set[key];
        var node = property.node;
        switch (property.type) {
            case 'text':
                var parentNode = node.parentNode;
                appendAttribute(parentNode, 'data-live-text', Array.from(parentNode.childNodes).indexOf(node) + ":" + key);
                break;
            case 'html':
                if (!node.getAttribute || !(node.getAttribute('id') === key)) {
                    var parentNode_1 = node.parentNode;
                    appendAttribute(parentNode_1, 'data-live-html', Array.from(parentNode_1.childNodes).indexOf(node) + ":" + key);
                }
                break;
            case 'attribute':
                if (property.attrName) {
                    appendAttribute(node, 'data-live-attr', property.attrName + ":" + key);
                }
                else {
                    node.setAttribute('data-live-map', key);
                }
                break;
        }
    }
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
            var property = map[prop];
            if (property) {
                switch (property.type) {
                    case 'text':
                        return property.node.textContent;
                    case 'html':
                        return property.node;
                    case 'attribute':
                        return property.node.getAttribute(prop);
                }
            }
        },
        set: function (map, prop, value) {
            var property = map[prop];
            if (property) {
                switch (property.type) {
                    case 'text':
                        property.node.data = value;
                        break;
                    case 'html':
                        try {
                            var newNode = typeof value === 'string' ? domParser.parseFromString(value, 'text/xml') : value;
                            var result = property.node.parentNode.replaceChild(newNode, property.node);
                            property.node = newNode;
                            return result;
                        }
                        catch (err) {
                            console.error("failed to replace node to " + value, err);
                        }
                    case 'attribute':
                        if (property.attrName) {
                            // single attribute
                            if (value === null) {
                                return property.node.removeAttribute(property.attrName);
                            }
                            return property.node.setAttribute(property.attrName, value);
                        }
                        else {
                            // attribute map
                            Object.keys(value).forEach(function (attrName) { return property.node.setAttribute(attrName, value[attrName]); });
                        }
                }
            }
            return true;
        },
    });
}
function init(root, domParser) {
    var set = {};
    initChild(set, root, domParser);
    addReactiveFunctionality(root, set, domParser);
}
exports.init = init;
function initChild(set, node, domParser) {
    if (node.hasAttribute('id')) {
        set[node.getAttribute('id')] = { type: 'html', node: node };
    }
    if (node.hasAttribute('data-live-text')) {
        node
            .getAttribute('data-live-text')
            .split(';')
            .forEach(function (attr) {
            var _a = attr.split(':'), childIndex = _a[0], varName = _a[1];
            set[varName] = { type: 'text', node: node.childNodes[+childIndex] };
        });
    }
    if (node.hasAttribute('data-live-html')) {
        node
            .getAttribute('data-live-html')
            .split(';')
            .forEach(function (attr) {
            var _a = attr.split(':'), childIndex = _a[0], varName = _a[1];
            set[varName] = { type: 'html', node: node.childNodes[+childIndex] };
        });
    }
    if (node.hasAttribute('data-live-map')) {
        set[node.getAttribute('data-live-map')] = { type: 'attribute', node: node };
    }
    if (node.hasAttribute('data-live-attr')) {
        node
            .getAttribute('data-live-attr')
            .split(';')
            .forEach(function (attr) {
            var _a = attr.split(':'), attrName = _a[0], varName = _a[1];
            set[varName] = { type: 'attribute', node: node, attrName: attrName };
        });
    }
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) {
        var child = children.item(i);
        if (child.hasAttribute && !child.hasAttribute('data-live-root')) {
            initChild(set, child, domParser);
        }
    }
}
// feature _defineSet end
function fixHTMLTags(xmlString) {
    return xmlString.replace(/\<(?!area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([a-z|A-Z|_|\-|:|0-9]+)([^>]*)\/\>/, '<$1$2></$1>');
}
