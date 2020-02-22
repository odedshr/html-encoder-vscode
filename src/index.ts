import { DOMParser } from 'xmldom';
import { readFileSync } from 'fs';

export default function htmlEncoder(html: string, isTypescript = false) {
	const document: Document = domParser.parseFromString(html.replace(/\n\s+>/g,'>'), 'text/xml');

	// console.debug(html.replace(/\n\s+>/g,'>'));
	const nodeParser = new NodeParser(document);

	return transpile(nodeParser, isTypescript);
}

function transpile(parser: NodeParser, isTypescript: boolean) {
	return readFileSync(getTemplateFile(isTypescript), { encoding: 'utf-8' }).replace(
		/console\.log\(docElm\)[;,]/,
		`this.node = ${parser.toString()};`
	);
}

function getTemplateFile(isTypescript: boolean) {
	return `${__dirname}/JSNode.${isTypescript ? 'ts' : 'js'}`;
}

const domParser = new DOMParser(),
	NodeType = {
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

type subRoutineType = 'loop' | 'if';

class SubRoutine {
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
				return `this._forEach('${iterator}', '${index}','${varName}', () => {
					${this.children.join('\n')}
				});`;

			case 'if':
				return `
					if (this._getValue(this.data, '${this.varName}')) {
						${this.children.join('\n')}
					}`;
		}
	}
}

class NodeParser {
	rootNode: Document;
	output: string;

	constructor(document: Document) {
		this.rootNode = document;
		this.output = this._pareseDocument(document.firstChild);
	}

	_pareseDocument(node: ChildNode): string {
		const output = this._parseNode(node);

		if (output instanceof SubRoutine) {
			return output.toString();
		} else if (Array.isArray(output)) {
			return output.join('\n');
		}

		return output;
	}

	_parseNode(node: ChildNode): string | string[] | SubRoutine {
		switch (node.nodeType) {
			case NodeType.Document:
			case NodeType.DocumentFragment:
				if (node.childNodes.length !== 1) {
					throw Error('document must have exactly one child');
				}

				return this._parseNode(node.firstChild);
			case NodeType.ProcessingInstruction:
				return this._parseProcessInstruction(<ProcessingInstruction>node);
			case NodeType.Text:
				return this._parseTextElement(node);
			case NodeType.Comment:
				return this._parseCommentElement(node);
			default:
				return this._parseHtmlElement(<HTMLElement>node);
		}
	}

	_parseProcessInstruction(node: ProcessingInstruction): string[] | SubRoutine | null {
		const tagName = node.target;

		if (tagName.indexOf('?') === 0) {
			return new SubRoutine('if', tagName.substring(1));
		} else if (tagName.match(/.+@.+/)) {
			return new SubRoutine('loop', tagName);
		} else if (['/@', '/?'].indexOf(tagName) > -1) {
			return null;
		} else if (tagName.indexOf('attr') === 0) {
			return this._getAttributeInstructions(node.nodeValue.split(/\s/));
		} else if (tagName.indexOf('css') === 0) {
			return this._getCssInstructions(node.nodeValue.split(/\s/));
		} else if (tagName.indexOf(':') === 0) {
			return [`elm.appendChild(this._getSubTemplate('${tagName.substring(1)}'))`];
		} else if (tagName.indexOf('==') === 0) {
			return [
				this._getAppendLivableString(
					`this._getHTMLNode(this._getValue(this.data, '${tagName.substring(2)}'))`,
					node.nodeValue,
					'html'
				)
			];
		} else if (tagName.indexOf('=') === 0) {
			return [
				this._getAppendLivableString(
					`docElm.createTextNode(this._getValue(this.data, '${tagName.substring(1)}'))`,
					node.nodeValue,
					'text'
				)
			];
		}

		return [`elm.appendChild(docElm.createProcessingInstruction('${tagName}','${node.nodeValue}'))`];
	}

	_getAppendLivableString(nodeString: string, nodeValue: string, type: string): string {
		const addToSetString =
			nodeValue.indexOf('#') === 0 ? `this.set['${nodeValue.substring(1)}'] = { node, type: '${type}' };` : '';

		return `elm.appendChild((() => { const node = ${nodeString}; ${addToSetString} return node; })());`;
	}

	_parseTextElement(node: ChildNode): string {
		return `docElm.createTextNode(\`${node.textContent}\`)`;
	}

	_parseCommentElement(node: ChildNode): string {
		return `docElm.createComment(\`${node.textContent}\`)`;
	}

	_parseHtmlElement(node: HTMLElement): string {
		let element: string[] = [`const elm = docElm.createElement('${node.tagName}');`];

		this._parseAttributes(node, element);
		element.push(...this._parseChildren(node));

		return this._wrapAndReturnELM(element);
	}

	_wrapAndReturnELM(element: string[]) {
		return `(() => { ${element.join('\n')}\n return elm; })()`;
	}

	_parseAttributes(node: HTMLElement, element: string[]) {
		return Array.from(node.attributes || []).forEach((attr: Attr) => {
			this._rememberForEasyAccess(attr, element);
			element.push(`elm.setAttribute('${attr.nodeName}','${attr.nodeValue}')`);
		});
	}

	_rememberForEasyAccess(attr: Attr, element: string[]) {
		if (attr.nodeName.toLowerCase() === 'id') {
			element.push(`this.set['${attr.nodeValue}'] = { node: elm, type: 'attribute' };`);
		}
	}

	_parseChildren(node: HTMLElement): string[] {
		//@ts-ignore
		const childNodes = Array.from(node.childNodes || [])
		const stack: SubRoutine[] = [];
		let children: string[] = [] as string[];

		// console.debug(`-- parsing ${node.tagName}: ${this._getChildrenDecription(childNodes)}`);
		
		childNodes.forEach((childNode: ChildNode) => {
			const parsed = this._parseNode(childNode);

			if (parsed instanceof SubRoutine) {
				parsed.parent = children;
				stack.push(parsed);

				//from now on, add to the subroutines' children list;
				children = parsed.children;
			} else if (parsed === null) {
				const subRoutine = stack.pop();

				if (!subRoutine) {
					throw Error(`end of subRoutine without start: ${this._getChildrenDecription(childNodes)}`)
				}
				children = subRoutine.parent;
				children.push(subRoutine.toString());
			} else if (Array.isArray(parsed)) {
				children.push(...parsed);
			} else {
				children.push(`elm.appendChild(${parsed})`);
			}
		});

		return children;
	}

	_getChildrenDecription(children:ChildNode[]):string {
		return JSON.stringify(children.map(node=>{
			switch (node.nodeType) {
				case NodeType.Document:
				case NodeType.DocumentFragment:
					return 'doc'
				case NodeType.ProcessingInstruction:
					return (<ProcessingInstruction>node).target;
				case NodeType.Text:
					return `t{${node.textContent}}`;
				case NodeType.Comment:
					return `t{${node.textContent}}`;
				default:
					return (<HTMLElement>node).tagName;
			};
		}))
	}

	// value is `condition?attrName=varName`
	_parseAttrValue(value: string) {
		const matches = value.match(/((.+)\?)?([^=.]+)(=(.+))?/);
		return { condition: matches[2], attrName: matches[3], varName: matches[5] };
	}

	_getAttributeInstructions(attributes: string[]) {
		const instructions = ['{ let node = this._getPreceedingOrSelf(elm), tmpAttrs;'];

		let liveId: string;

		if (attributes[attributes.length - 1].indexOf('#') === 0) {
			liveId = attributes.pop().substring(1);
		}

		attributes.forEach(attrValue => {
			const { condition, attrName, varName } = this._parseAttrValue(attrValue);

			if (condition) {
				instructions.push(`if (this._getValue(this.data, '${condition}')) {`);
			}

			if (varName) {
				instructions.push(
					`node.setAttribute('${attrName}', this._getValue(this.data, '${varName.replace(/[\'"]/g, "\\'")}'));`
				);
				if (liveId) {
					instructions.push(
						`this.set['${liveId}#${attrName}'] = { node, type: 'attribute', 'attrName': '${attrName}'}`
					);
				}
			} else {
				const addToLiveList = liveId
					? `this.set[\`${liveId}#\${k}\`] = { node, type: 'attribute', 'attrName': k };`
					: '';
				instructions.push(`tmpAttrs = this._getValue(this.data, '${attrName}');`);
				instructions.push(`for (let k in tmpAttrs) { node.setAttribute(k, tmpAttrs[k]);${addToLiveList} }`);
			}
			if (condition) {
				instructions.push('}');
			}
		});

		instructions.push('}');

		return instructions;
	}

	// value is `condition?cssName`
	_parseCssValue(value: string) {
		const matches = value.match(/((.+)\?)?([^=.]+)/);
		return { condition: matches[2], varName: matches[3] };
	}

	_getCssInstructions(classes: string[]) {
		const instructions = [
			`{ let tmpElm = this._getPreceedingOrSelf(elm), tmpCss = tmpElm.getAttribute('class') || '',
		target = tmpCss.length ? tmpCss.split(/\s/) : [];`
		];

		classes.forEach(varValue => {
			const { condition, varName } = this._parseCssValue(varValue);

			if (condition) {
				instructions.push(`if (this._getValue(this.data, '${condition}')) {`);
			}

			instructions.push(`tmpCss = this._getValue(this.data, '${varName}');
				(Array.isArray(tmpCss) ? tmpCss : [tmpCss]).forEach(css => target.push(css));
			`);

			if (condition) {
				instructions.push('}');
			}
		});
		instructions.push(`tmpElm.setAttribute('class', target.join(' ')); }`);

		return instructions;
	}

	toString(): string {
		return this.output;
	}
}
