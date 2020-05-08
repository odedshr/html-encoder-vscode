type subRoutineType = 'loop' | 'if';

export default class SubRoutine {
	type: subRoutineType;
	varName: string;
	children: string[];
	parent: string[];

	constructor(type: subRoutineType, varName: string) {
		this.type = type;
		this.varName = varName;
		this.children = [];
	}

	toString(): string {
		switch (this.type) {
			case 'loop':
				const [iteratorAndIndex, varName] = this.varName.split('@'),
					[iterator, index = '$i'] = iteratorAndIndex.split(':');
				return `self._forEach('${iterator}', '${index}','${varName}', function() {
					${this.children.join('\n')}
				});`;

			case 'if':
				return `
					if (self._getValue(self.data, '${this.varName}')) {
						${this.children.join('\n')}
					}`;
		}
	}
}
