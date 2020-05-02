declare type window = {
	DOMParser: Function;
};

declare type KeydObject = { [key: string]: any };

interface DOMParser {
	parseFromString(str: string, type: SupportedType): Document;
}

declare var DOMParser: {
	prototype: DOMParser;
	new (): DOMParser;
};

export default class JSNode {
	set: { [key: string]: any };
	data: { [key: string]: any };
	node: ChildNode;
	domParser: DOMParser;
	docElm: Document;

	constructor(data: object, domParserInstance?: DOMParser) {
		this.set = {};
		this.domParser = this.getDOMParser(domParserInstance);

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
	protected _defineSet() {
		if (Object.keys(this.set).length) {
			Object.defineProperty(this.node, 'set', {
				value: this._getSetProxy(this.set),
				configurable: true,
				writable: true,
			});
		}
	}

	_getSetProxy(map: KeydObject) {
		const domParser = this.domParser;
		return new Proxy(map, {
			get: function (map, prop: string) {
				const property = map[prop];
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
								return property.node.parentNode.replaceChild(newNode, property.node);
							} catch (err) {
								console.error(`failed to replace node to ${value}`, err);
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
function fixHTMLTags(xmlString: string) {
	return xmlString.replace(
		/\<(?!area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([a-z|A-Z|_|\-|:|0-9]+)([^>]*)\/\>/,
		'<$1$2></$1>'
	);
}
