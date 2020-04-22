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

abstract class JSNodeAbstract {
  set: object;
  data: object;
  node: ChildNode;
  domParser: DOMParser;
  docElm: Document;

  constructor(domParserInstance?: DOMParser) {
    this.set = {};
    this.domParser = this.getDOMParser(domParserInstance);

    this.docElm = this.getDocElm();
  }

  protected defineSet() {
    if (Object.keys(this.set).length) {
      Object.defineProperty(this.node, 'set', {
        value: this._getSetProxy(this.set),
        configurable: true,
        writable: true,
      });
    }
  }

  protected setDocumentType(name: string, publicId: string, systemId: string) {
    const nodeDoctype = this.docElm.implementation.createDocumentType(
      name,
      publicId,
      systemId
    );
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

  private getDocElm(): Document {
    return typeof document !== 'undefined'
      ? document
      : this.domParser.parseFromString('<html></html>', 'text/xml');
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

  _getSubTemplate(templateName: string) {
    const Template = this._getValue(this.data, templateName);
    return new Template(this.data);
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
                const newNode =
                  typeof value === 'string'
                    ? domParser.parseFromString(value, 'text/xml')
                    : value;
                return property.node.parentNode.replaceChild(
                  newNode,
                  property.node
                );
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

  _forEach(
    iteratorName: string,
    indexName: string,
    varName: string,
    fn: Function
  ) {
    const orig = {
      iterator: this._getValue(this.data, iteratorName),
      index: this._getValue(this.data, indexName),
    };
    const list = this._getValue(this.data, varName);

    for (let k in list) {
      this._setValue(this.data, indexName, k);
      this._setValue(this.data, iteratorName, list[k]);
      fn();
    }
    this._setValue(this.data, iteratorName, orig.iterator);
    this._setValue(this.data, indexName, orig.index);
  }

  _getPreceedingOrSelf(elm: HTMLElement): HTMLElement {
    //@ts-ignore
    const children = Array.from(elm.childNodes);
    children.reverse();

    return (children.find(function (child) {
      return child.nodeType === 1;
    }) || elm) as HTMLElement;
  }

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

  _setValue(data: KeydObject, path: string, value: any) {
    const pathParts = path.split('.');
    const varName = pathParts.pop();
    pathParts.reduce(function (ptr: { [key: string]: any }, step) {
      return ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined;
    }, data)[varName] = value;
  }

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
      return <HTMLElement>(
        this.domParser.parseFromString(htmlString, 'text/xml').firstChild
      );
    } catch (err) {
      console.error(`failed to parse string: ${htmlString}`, err);
      return this.docElm.createTextNode(htmlString);
    }
  }
}

export default class JSNode extends JSNodeAbstract {
  constructor(data: object, domParser?: DOMParser) {
    super(domParser);

    this.data = data;

    const self = this;

    //docElm is used by injected code
    const docElm = this.docElm;
    // main code goes here:
    console.log(docElm);
    // end of main code

    this.defineSet();
    return <any>this.node;
  }
}
