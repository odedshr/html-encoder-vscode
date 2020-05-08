"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = SubRoutine;
