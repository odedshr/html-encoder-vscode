declare type KeydObject = { [key: string]: any };
declare type Property = { type: 'text' | 'html' | 'attribute'; attrName?: string; node: Element };

interface DOMParser {
	parseFromString(str: string, type: SupportedType): Document;
}

declare var DOMParser: {
	prototype: DOMParser;
	new (): DOMParser;
};

export default class JSNode {
	set: { [key: string]: Property } = {};
	data: { [key: string]: any };
	node: ChildNode;
	domParser: DOMParser;
	docElm: Document;

	constructor(data: object, domParserInstance?: DOMParser, isSSR = false) {
		this.domParser = this.getDOMParser(domParserInstance);

		this.docElm = this.getDocElm();

		this.data = data;

		const self = this;

		//docElm is used by injected code
		const docElm = this.docElm;
		// main code goes here:
		//@ts-ignore returned value might be DocumentFragment which isn't a childNode, which might cause tsc to complain
		console.log(self, docElm, isSSR);
		// end of main code

		const originalToString = this.node.toString;
		this.node.toString = () => fixHTMLTags(originalToString.call(this.node));
		return <any>this.node;
	}

	private getDocElm(): Document {
		return typeof document !== 'undefined' ? document : this.domParser.parseFromString('<html></html>', 'text/xml');
	}

	private getDOMParser(domParserInstance?: DOMParser): DOMParser {
		if (domParserInstance) {
			return domParserInstance;
		}

		const _get = function (item: KeydObject, key: string) {
			return item[key];
		};

		if (this.constructor.hasOwnProperty('DOMParser')) {
			return new (_get(this.constructor, 'DOMParser'))();
		}
		if (typeof window !== 'undefined' && window.DOMParser) {
			return new window.DOMParser();
		} else {
			throw new ReferenceError('DOMParser is not defined');
		}
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
				for (let key in this.set) {
					const property = this.set[key];
					const node = <HTMLElement>property.node;
					switch (property.type) {
						case 'text':
							(<HTMLElement>node.parentNode).setAttribute('data-live-text', key);
							break;
						case 'html':
							if (!(node.getAttribute('id') === key)) {
								node.setAttribute('data-live-html', key);
							}
							break;
						case 'attribute':
							if (property.attrName) {
								const value = [`${property.attrName}:${key}`];
								if (node.hasAttribute('data-live-attr')) {
									value.unshift(node.getAttribute('data-live-attr'));
								}
								node.setAttribute(`data-live-attr`, value.join(';'));
							} else {
								node.setAttribute('data-live-map', key);
							}
							break;
					}
				}
			} else {
				addReactiveFunctionality(this.node, this.set, this.domParser);
			}
		}
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
	root
		.querySelectorAll('[data-live-text]')
		.forEach((node) => (set[node.getAttribute('data-live-text')] = { type: 'text', node: <Element>node.firstChild }));
	root
		.querySelectorAll('[data-live-html], [id]')
		.forEach((node) => (set[node.getAttribute('data-live-text')] = { type: 'html', node }));
	root
		.querySelectorAll('[data-live-map]')
		.forEach((node) => (set[node.getAttribute('data-live-map')] = { type: 'attribute', node }));
	root.querySelectorAll('[data-live-attr]').forEach((node) =>
		node
			.getAttribute('data-live-attr')
			.split(';')
			.forEach((attr) => {
				const [attrName, varName] = attr.split(':');
				set[varName] = { type: 'attribute', node, attrName };
			})
	);

	addReactiveFunctionality(root, set, domParser);
}
// feature _defineSet end

function fixHTMLTags(xmlString: string) {
	return xmlString.replace(
		/\<(?!area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([a-z|A-Z|_|\-|:|0-9]+)([^>]*)\/\>/,
		'<$1$2></$1>'
	);
}
