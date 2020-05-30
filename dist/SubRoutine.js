"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SubRoutine = /** @class */ (function () {
    function SubRoutine(type, varName, liveId) {
        this.type = type;
        this.varName = varName;
        this.children = [];
        if (varName.charAt(varName.length - 1) === '#') {
            this.varName = varName.substr(0, varName.length - 1);
            this.liveId = this.varName.split('@').pop();
        }
        else if (liveId && liveId.charAt(0) === '#') {
            this.liveId = liveId.substring(1);
        }
        this.functionName = type + "_" + this.varName.replace(/\W/g, '') + "_" + (this.liveId || '');
    }
    SubRoutine.prototype.toString = function () {
        switch (this.type) {
            case 'loop':
                var _a = this.varName.split('@'), iteratorAndIndex = _a[0], varName = _a[1];
                var _b = iteratorAndIndex.split(':'), iterator = _b[0], _c = _b[1], index = _c === void 0 ? '$i' : _c;
                this.loopIterator = iterator;
                this.loopIndex = index;
                var liveLoopString = this.liveId
                    ? "self.register('" + this.liveId + "', { type: 'loop', node: elm, details: { startAt, fn, items, nodes } });\n"
                    : '';
                return "{ \n\t\t\t\t\tconst fn = " + this.functionName + ".bind({},self, docElm, elm);\n\t\t\t\t\tconst startAt = elm.childNodes.length;\n\t\t\t\t\tconst items = clone(self._getValue(self.data, '" + varName + "'));\n\t\t\t\t\tconst nodes = fn(items);\n\t\t\t\t\t" + liveLoopString + "\n\t\t\t\t}";
            case 'if':
                var liveIfString = this.liveId
                    ? "self.register('" + this.liveId + "', { type: 'conditional', node: elm, details: { startAt, fn, nodes, flag } });\n"
                    : '';
                return " {\n\t\t\t\t\tconst startAt = elm.childNodes.length;\n\t\t\t\t\tconst fn = " + this.functionName + ".bind({},self, docElm, elm);\n\t\t\t\t\tconst flag = !!self._getValue(self.data, '" + this.varName + "')\n\t\t\t\t\tconst nodes = flag ? [fn()] : [];\n\t\t\t\t\t" + liveIfString + "\n\t\t\t\t}";
        }
    };
    SubRoutine.prototype.getFunction = function () {
        switch (this.type) {
            case 'loop':
                return "function " + this.functionName + " (self, docElm, elm, items) {\n\treturn self._forEach('" + this.loopIterator + "', '" + this.loopIndex + "',items, elm, function() { \n\t\t" + this.children.join('\n') + "\n\t});\n}";
            case 'if':
                return "function " + this.functionName + " (self, docElm, elm) {\n\treturn getAddedChildren(elm, function () { " + this.children.join('\n') + " })\n}";
        }
    };
    return SubRoutine;
}());
exports.default = SubRoutine;
