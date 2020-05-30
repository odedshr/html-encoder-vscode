type subRoutineType = 'loop' | 'if';

export default class SubRoutine {
	type: subRoutineType;
	varName: string;
	children: string[];
	parent: string[];
	liveId?: string;
	functionName: string;
	loopIterator?: string;
	loopIndex?: string;

	constructor(type: subRoutineType, varName: string, liveId?: string) {
		this.type = type;
		this.varName = varName;
		this.children = [];

		if (varName.charAt(varName.length - 1) === '#') {
			this.varName = varName.substr(0, varName.length - 1);
			this.liveId = this.varName.split('@').pop();
		} else if (liveId && liveId.charAt(0) === '#') {
			this.liveId = liveId.substring(1);
		}
		this.functionName = `${type}_${this.varName.replace(/\W/g, '')}_${this.liveId || ''}`;
	}

	toString(): string {
		switch (this.type) {
			case 'loop':
				const [iteratorAndIndex, varName] = this.varName.split('@');
				const [iterator, index = '$i'] = iteratorAndIndex.split(':');
				this.loopIterator = iterator;
				this.loopIndex = index;
				const liveLoopString = this.liveId
					? `self.register('${this.liveId}', { type: 'loop', node: elm, details: { startAt, fn, items, nodes } });\n`
					: '';

				return `{ 
					const fn = ${this.functionName}.bind({},self, docElm, elm);
					const startAt = elm.childNodes.length;
					const items = clone(self._getValue(self.data, '${varName}'));
					const nodes = fn(items);
					${liveLoopString}
				}`;
			case 'if':
				const liveIfString = this.liveId
					? `self.register('${this.liveId}', { type: 'conditional', node: elm, details: { startAt, fn, nodes, flag } });\n`
					: '';
				return ` {
					const startAt = elm.childNodes.length;
					const fn = ${this.functionName}.bind({},self, docElm, elm);
					const flag = !!self._getValue(self.data, '${this.varName}')
					const nodes = flag ? [fn()] : [];
					${liveIfString}
				}`;
		}
	}

	getFunction(): string {
		switch (this.type) {
			case 'loop':
				return `function ${this.functionName} (self, docElm, elm, items) {
	return self._forEach('${this.loopIterator}', '${this.loopIndex}',items, elm, function() { 
		${this.children.join('\n')}
	});
}`;

			case 'if':
				return `function ${this.functionName} (self, docElm, elm) {
	return getAddedChildren(elm, function () { ${this.children.join('\n')} })
}`;
		}
	}
}
