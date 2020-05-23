declare type KeydObject = { [key: string]: any };
declare type Property = { type: 'text' | 'html' | 'attribute'; attrName?: string; node: Element };

// feature _SSR
import { DOMParser } from 'xmldom';
const window = { DOMParser: DOMParser };

// feature _SSR end

export default class JSNode {
	set: { [key: string]: Property } = {};
	data: { [key: string]: any };
	node: ChildNode;
	domParser: DOMParser;
	docElm: Document;

	constructor(data: object) {
		this.domParser = new window.DOMParser();

		this.docElm = this.getDocElm();

		this.data = data;

		const self = this;

		//docElm is used by injected code
		const docElm = this.docElm;
		// main code goes here:
		//@ts-ignore returned value might be DocumentFragment which isn't a childNode, which might cause tsc to complain
		console.log(self, docElm);
		// end of main code

		const originalToString = this.node.toString;
		this.node.toString = () => fixHTMLTags(originalToString.call(this.node));
		return <any>this.node;
	}

	private getDocElm(): Document {
		return typeof document !== 'undefined' ? document : this.domParser.parseFromString('<html></html>', 'text/xml');
	}

	// feature _setDocumentType
	protected _setDocumentType(name: string, publicId: string, systemId: string) {
		const nodeDoctype = this.docElm.implementation.createDocumentType(name, publicId, systemId);
		if (this.docElm.doctype) {
			this.docElm.replaceChild(nodeDoctype, this.docElm.doctype);
		} else {
			this.docElm.insertBefore(nodeDoctype, this.docElm.childNodes[0]);
		}
		// removing empty <html/> and adding this.node instead; I got an error when I tried to use replaceChild here
		this.docElm.removeChild(this.docElm.childNodes[1]);
		this.docElm.appendChild(this.node);
		//@ts-ignore
		this.node = this.docElm;
	}
	// feature _setDocumentType end
	// feature _defineSet
	protected _defineSet(isSSR: boolean) {
		if (Object.keys(this.set).length) {
			if (isSSR) {
				// if node is Document refere to the first child (the <html>);
				(this.node.nodeType === 9 ? this.findHTMLChildren(this.node) : [this.node]).forEach((node: HTMLElement) =>
					node.setAttribute('data-live-root', '')
				);
				addServerReactiveFunctionality(this.set);
			} else {
				addReactiveFunctionality(this.node, this.set, this.domParser);
			}
		}
	}

	private findHTMLChildren(root: ChildNode): HTMLElement[] {
		return <HTMLElement[]>Array.from(root.childNodes).filter((child) => !!(<HTMLElement>child).setAttribute);
	}

	// feature _defineSet end
	// feature _getSubTemplate
	_getSubTemplate(templateName: string) {
		const self = this;
		const Template = self._getValue(this.data, templateName);
		return new Template(this.data);
	}
	// feature _getSubTemplate end
	// feature _forEach
	_forEach(iteratorName: string, indexName: string, varName: string, fn: Function) {
		const self = this;
		const orig = {
			iterator: self._getValue(this.data, iteratorName),
			index: self._getValue(this.data, indexName),
		};
		const list = self._getValue(this.data, varName);

		for (let k in list) {
			self._setValue(this.data, indexName, k);
			self._setValue(this.data, iteratorName, list[k]);
			fn();
		}
		self._setValue(this.data, iteratorName, orig.iterator);
		self._setValue(this.data, indexName, orig.index);
	}
	// feature _forEach end
	// feature _getPreceedingOrSelf
	_getPreceedingOrSelf(elm: HTMLElement): HTMLElement {
		//@ts-ignore
		const children = Array.from(elm.childNodes);
		children.reverse();

		return (children.find(function (child) {
			return child.nodeType === 1;
		}) || elm) as HTMLElement;
	}
	// feature _getPreceedingOrSelf end
	// feature _getValue
	_getValue(data: KeydObject, path: string): any {
		if (path.match(/^(['"].*(\1))$/)) {
			return path.substring(1, path.length - 1);
		}

		return path[0] === '!'
			? !this._getValue(data, path.substr(1))
			: path.split('.').reduce(function (ptr: KeydObject, step: string) {
					return ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined;
			  }, data);
	}
	// feature _getValue end
	// feature _setValue
	_setValue(data: KeydObject, path: string, value: any) {
		const pathParts = path.split('.');
		const varName = pathParts.pop();
		pathParts.reduce(function (ptr: { [key: string]: any }, step) {
			return ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined;
		}, data)[varName] = value;
	}
	// feature _setValue end
	// feature _getHTMLNode
	_getHTMLNode(htmlString: string | HTMLElement) {
		if (!(typeof htmlString === 'string')) {
			return htmlString;
		}

		if (!htmlString.match(/<(.*?)>.*<\/(\1)>/)) {
			return this.docElm.createTextNode(htmlString);
		} else if (!htmlString.match(/^<(.*?)>.*<\/(\1)>$/)) {
			// htmlString is text that has html tags in it, we need to wrap it
			htmlString = `<span>${htmlString.replace(/& /g, '&amp; ')}</span>`;
		}

		try {
			// console.debug ('parsing ', htmlString);
			return <HTMLElement>this.domParser.parseFromString(htmlString, 'text/xml').firstChild;
		} catch (err) {
			console.error(`failed to parse string: ${htmlString}`, err);
			return this.docElm.createTextNode(htmlString);
		}
	}
	// feature _getHTMLNode end
}

// feature _defineSet
function addServerReactiveFunctionality(set: { [key: string]: Property } = {}) {
	for (let key in set) {
		const property = set[key];
		const node = <HTMLElement>property.node;
		switch (property.type) {
			case 'text':
				const parentNode: HTMLElement = <HTMLElement>node.parentNode;
				appendAttribute(parentNode, 'data-live-text', `${Array.from(parentNode.childNodes).indexOf(node)}:${key}`);
				break;
			case 'html':
				if (!node.getAttribute || !(node.getAttribute('id') === key)) {
					const parentNode: HTMLElement = <HTMLElement>node.parentNode;
					appendAttribute(parentNode, 'data-live-html', `${Array.from(parentNode.childNodes).indexOf(node)}:${key}`);
				}
				break;
			case 'attribute':
				if (property.attrName) {
					appendAttribute(node, 'data-live-attr', `${property.attrName}:${key}`);
				} else {
					node.setAttribute('data-live-map', key);
				}
				break;
		}
	}
}

function appendAttribute(node: HTMLElement, attributeName: string, newChild: string) {
	const value = [newChild];
	if (node.hasAttribute(attributeName)) {
		value.unshift(node.getAttribute(attributeName));
	}
	node.setAttribute(attributeName, value.join(';'));
}

function addReactiveFunctionality(node: ChildNode, set: { [key: string]: Property } = {}, domParser: DOMParser) {
	Object.defineProperty(node, 'set', {
		value: getSetProxy(set, domParser),
		configurable: true,
		writable: true,
	});
}

function getSetProxy(map: { [key: string]: Property }, domParser: DOMParser) {
	return new Proxy(map, {
		get: function (map, prop: string) {
			const property = map[prop];
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
		set: function (map: KeydObject, prop: string, value: any) {
			const property = map[prop];

			if (property) {
				switch (property.type) {
					case 'text':
						property.node.data = value;
						break;
					case 'html':
						try {
							const newNode = typeof value === 'string' ? domParser.parseFromString(value, 'text/xml') : value;
							const result = property.node.parentNode.replaceChild(newNode, property.node);
							property.node = newNode;
							return result;
						} catch (err) {
							console.error(`failed to replace node to ${value}`, err);
						}
					case 'attribute':
						if (property.attrName) {
							// single attribute
							if (value === null) {
								return property.node.removeAttribute(property.attrName);
							}

							return property.node.setAttribute(property.attrName, value);
						} else {
							// attribute map
							Object.keys(value).forEach((attrName) => property.node.setAttribute(attrName, value[attrName]));
						}
				}
			}
			return true;
		},
	});
}

export function init(root: Element, domParser: DOMParser) {
	const set: { [key: string]: Property } = {};
	initChild(set, root, domParser);
	addReactiveFunctionality(root, set, domParser);
}

function initChild(set: { [key: string]: Property }, node: Element, domParser: DOMParser) {
	if (!!node.hasAttribute) {
		if (node.hasAttribute('id')) {
			set[node.getAttribute('id')] = { type: 'html', node };
		}

		if (node.hasAttribute('data-live-text')) {
			node
				.getAttribute('data-live-text')
				.split(';')
				.forEach((attr) => {
					const [childIndex, varName] = attr.split(':');
					set[varName] = { type: 'text', node: <Element>node.childNodes[+childIndex] };
				});
		}

		if (node.hasAttribute('data-live-html')) {
			node
				.getAttribute('data-live-html')
				.split(';')
				.forEach((attr) => {
					const [childIndex, varName] = attr.split(':');
					set[varName] = { type: 'html', node: <Element>node.childNodes[+childIndex] };
				});
		}

		if (node.hasAttribute('data-live-map')) {
			set[node.getAttribute('data-live-map')] = { type: 'attribute', node };
		}

		if (node.hasAttribute('data-live-attr')) {
			node
				.getAttribute('data-live-attr')
				.split(';')
				.forEach((attr) => {
					const [attrName, varName] = attr.split(':');
					set[varName] = { type: 'attribute', node, attrName };
				});
		}
	}

	const children = node.childNodes;
	for (let i = 0; i < children.length; i++) {
		const child: Element = <Element>children.item(i);
		if (!!child.hasAttribute) {
			if (!child.hasAttribute('data-live-root')) {
				initChild(set, child, domParser);
			}
		}
	}
}

// feature _defineSet end

function fixHTMLTags(xmlString: string) {
	return xmlString.replace(
		/\<(?!area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([a-z|A-Z|_|\-|:|0-9]+)([^>]*)\/\>/,
		'<$1$2></$1>'
	);
}
