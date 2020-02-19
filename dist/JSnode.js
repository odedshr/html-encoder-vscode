'use strict';

var JSNode = /** @class */ (function () {
    function JSNode(data) {
        this.set = {};
        this.domParser = this._getDOMParser();
        //docElm is used by injected code
        var docElm = typeof document !== 'undefined' ? document : this.domParser.parseFromString('<html></html>', 'text/xml');
        this.data = data;
        // main code goes here:
        console.log(docElm);
        // end of main code
        if (Object.keys(this.set).length) {
            Object.defineProperty(this.node, 'set', {
                value: this._getSetProxy(this.set),
                configurable: true,
                writable: true
            });
        }
        return this.node;
    }
    JSNode.prototype._getDOMParser = function () {
        var _get = function (item, key) { return item[key]; };
        if (this.constructor.hasOwnProperty('DOMParser')) {
            return new (_get(this.constructor, 'DOMParser'))();
        }
        else {
            return new DOMParser();
        }
    };
    JSNode.prototype._getSubTemplate = function (templateName) {
        var Template = this._getValue(this.data, templateName);
        return new Template(this.data);
    };
    JSNode.prototype._getSetProxy = function (map) {
        var _this = this;
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
                            var newNode = typeof value === 'string' ? _this.domParser.parseFromString(value, 'text/xml') : value;
                            return property.node.parentNode.replaceChild(newNode, property.node);
                        case 'attribute':
                            if (value === null) {
                                return property.node.removeAttribute(prop);
                            }
                            return property.node.setAttribute(prop, value);
                    }
                }
                return true;
            }
        });
    };
    JSNode.prototype._forEach = function (iteratorName, indexName, varName, fn) {
        var orig = {
            iterator: this._getValue(this.data, iteratorName),
            index: this._getValue(this.data, indexName)
        };
        var list = this._getValue(this.data, varName);
        for (var k in list) {
            this._setValue(this.data, indexName, k);
            this._setValue(this.data, iteratorName, list[k]);
            fn();
        }
        this._setValue(this.data, iteratorName, orig.iterator);
        this._setValue(this.data, indexName, orig.index);
    };
    JSNode.prototype._getFirstOrSelf = function (elm) {
        if (elm.lastChild && elm.lastChild.nodeType === 1) {
            return elm.lastChild;
        }
        return elm;
    };
    JSNode.prototype._getValue = function (data, path) {
        if (path.match(/^(['"].*(\1))$/)) {
            return path.substring(1, path.length - 1);
        }
        return path[0] === '!'
            ? !this._getValue(data, path.substr(1))
            : path
                .split('.')
                .reduce(function (ptr, step) { return (ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined); }, data);
    };
    JSNode.prototype._setValue = function (data, path, value) {
        var pathParts = path.split('.');
        var varName = pathParts.pop();
        pathParts.reduce(function (ptr, step) { return (ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined); }, data)[varName] = value;
    };
    JSNode.prototype._toString = function () {
        return this.toString();
    };
    return JSNode;
}());

module.exports = JSNode;
