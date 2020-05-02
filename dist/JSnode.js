"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var JSNode = /** @class */ (function () {
    function JSNode(data, domParserInstance) {
        var _this = this;
        this.set = {};
        this.domParser = this.getDOMParser(domParserInstance);
        this.docElm = this.getDocElm();
        this.data = data;
        var self = this;
        //docElm is used by injected code
        var docElm = this.docElm;
        // main code goes here:
        //@ts-ignore returned value might be DocumentFragment which isn't a childNode, which might cause tsc to complain
        console.log(self, docElm);
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
    JSNode.prototype._defineSet = function () {
        if (Object.keys(this.set).length) {
            Object.defineProperty(this.node, 'set', {
                value: this._getSetProxy(this.set),
                configurable: true,
                writable: true,
            });
        }
    };
    JSNode.prototype._getSetProxy = function (map) {
        var domParser = this.domParser;
        return new Proxy(map, {
            get: function (map, prop) {
                var property = map[prop];
                if (property) {
                    switch (property.type) {
                        case 'text':
                            return property.node.data;
                        case 'html':
                            return property.node;
                        case 'attribute':
                            return property.node;
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
                                return property.node.parentNode.replaceChild(newNode, property.node);
                            }
                            catch (err) {
                                console.error("failed to replace node to " + value, err);
                            }
                        case 'attribute':
                            if (value === null) {
                                return property.node.removeAttribute(prop);
                            }
                            return property.node.setAttribute(prop, value);
                    }
                }
                return true;
            },
        });
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
function fixHTMLTags(xmlString) {
    return xmlString.replace(/\<(?!area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([a-z|A-Z|_|\-|:|0-9]+)([^>]*)\/\>/, '<$1$2></$1>');
}
