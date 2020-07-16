type subRoutineType = 'loop' | 'if';

let count = 1;

export function resetCounter() {
  count = 1;
}

export class SubRoutineEnd { }
export class SubRoutine {
  type: subRoutineType;
  varName: string;
  children: string[];
  parent: string[] = [];
  liveId?: string;
  functionName: string;
  loopIterator?: string;
  loopIndex?: string;
  isTypescript: boolean;

  constructor(type: subRoutineType, varName: string, isTypescript: boolean, liveId?: string) {
    this.type = type;
    this.isTypescript = isTypescript;
    this.varName = varName;
    this.children = [];

    if (varName.charAt(varName.length - 1) === '#') {
      this.varName = varName.substr(0, varName.length - 1);
      this.liveId = this.varName.split('@').pop();
    } else if (liveId && liveId.charAt(0) === '#') {
      this.liveId = liveId.substring(1);
    }
    this.functionName = this.toCamelCase(`${type} ${this.varName.replace(/\W/g, ' ')}${this.liveId || ''}_${count++}`);
  }

  private toCamelCase(str: string) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match: string, index: number) {
      if (+match === 0) {
        return ""; // or if (/\s+/.test(match)) for white spaces
      }
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
  }

  toString(): string {
    switch (this.type) {
      case 'loop':
        const [iteratorAndIndex, varName] = this.varName.split('@');
        const [iterator, index = '$i'] = iteratorAndIndex.split(':');
        this.loopIterator = iterator;
        this.loopIndex = index;
        const liveLoopString = this.liveId
          ? `self.register('${this.liveId}', { type: 'loop', node: elm, details: { startAt, fn, fnName: '${this.functionName}', items, nodes } });\n`
          : '';
        return `{ 
          const fn = self.funcs.${this.functionName}.bind({},self, docElm, elm);
					const startAt = elm.childNodes.length;
          const items = clone(self._getValue(self.data, '${varName}')) || [];
					const nodes = fn(items);
					${liveLoopString}
				}`;
      case 'if':
        const liveIfString = this.liveId
          ? `self.register('${this.liveId}', { type: 'conditional', node: elm, details: { startAt, fn, fnName: '${this.functionName}', nodes, flag } });\n`
          : '';
        return ` {
          const startAt = elm.childNodes.length;
					const fn = self.funcs.${this.functionName}.bind({},self, docElm, elm);
					const flag = !!self._getValue(self.data, '${this.varName}');
					const nodes = flag ? fn() : [];

					${liveIfString}
				}`;
    }
  }

  getFunction(): string {
    switch (this.type) {
      case 'loop':
        const loopArgs = this.isTypescript ? 'self:JSNode, docElm:Document, elm:Node, items:any' : 'self, docElm, elm, items';
        return `${this.functionName} (${loopArgs}) {
          const fn = function() {
            ${this.children.join('\n')}
          };

          return self._forEach('${this.loopIterator}', '${this.loopIndex}', elm, fn, items);
        }`;

      case 'if':
        const ifArgs = this.isTypescript ? 'self:JSNode, docElm:Document, elm:Node' : 'self, docElm, elm';
        return `${this.functionName} (${ifArgs}) {
          const fn = function () { ${this.children.join('\n')} };
	        return getAddedChildren(elm, fn);
        }`;

    }
  }
}
