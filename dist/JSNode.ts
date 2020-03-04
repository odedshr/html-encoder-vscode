class JSNode {
  set: object;
  data: object;
  node: ChildNode;
  domParser: DOMParser;
  docElm: Document;

  constructor(data: object) {
    this.set = {};
    this.domParser = this._getDOMParser();

    //docElm is used by injected code

    this.docElm =
      typeof document !== 'undefined'
        ? document
        : this.domParser.parseFromString('<html></html>', 'text/xml');
    const docElm = this.docElm;

    this.data = data;
    // main code goes here:
    console.log(docElm);
    // end of main code

    if (Object.keys(this.set).length) {
      Object.defineProperty(this.node, 'set', {
        value: this._getSetProxy(this.set),
        configurable: true,
        writable: true
      });
    }

    return <any>this.node;
  }

  _getDOMParser(): DOMParser {
    const _get = (item: { [key: string]: any }, key: string) => item[key];

    if (this.constructor.hasOwnProperty('DOMParser')) {
      return new (_get(this.constructor, 'DOMParser'))();
    } else {
      return new DOMParser();
    }
  }

  _getSubTemplate(templateName: string) {
    const Template = this._getValue(this.data, templateName);
    return new Template(this.data);
  }

  _getSetProxy(map: { [key: string]: any }) {
    return new Proxy(map, {
      get: (map, prop: string) => {
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
      set: (map: { [key: string]: any }, prop: string, value: any) => {
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
                    ? this.domParser.parseFromString(value, 'text/xml')
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
      }
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
      index: this._getValue(this.data, indexName)
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

  _getPreceedingOrSelf(elm: HTMLElement) {
    //@ts-ignore
    const children = Array.from(elm.childNodes);
    children.reverse();

    return children.find(child => child.nodeType === 1) || elm;
  }

  _getValue(data: { [key: string]: any }, path: string): any {
    if (path.match(/^(['"].*(\1))$/)) {
      return path.substring(1, path.length - 1);
    }

    return path[0] === '!'
      ? !this._getValue(data, path.substr(1))
      : path
          .split('.')
          .reduce(
            (ptr: { [key: string]: any }, step: string) =>
              ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined,
            data
          );
  }

  _setValue(data: { [key: string]: any }, path: string, value: any) {
    const pathParts = path.split('.');
    const varName = pathParts.pop();
    pathParts.reduce(
      (ptr: { [key: string]: any }, step) =>
        ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined,
      data
    )[varName] = value;
  }

  _getHTMLNode(htmlString: string | HTMLElement) {
    if (!(typeof htmlString === 'string')) {
      return htmlString;
    }

    if (!htmlString.match(/<(.*?)>.*<\/(\1)>/)) {
      return this.docElm.createTextNode(htmlString);
    } else if (!htmlString.match(/^<(.*?)>.*<\/(\1)>$/)) {
      // htmlString is text that has html tags in it, we need to wrap it
      htmlString = `<span>${htmlString}</span>`;
    }

    try {
      console.log('parsing ', htmlString);
      return <HTMLElement>(
        this.domParser.parseFromString(htmlString, 'text/xml').firstChild
      );
    } catch (err) {
      console.error(`failed to parse string: ${htmlString}`, err);
      return this.docElm.createTextNode(htmlString);
    }
  }

  _toString() {
    return this.toString();
  }
}
export default JSNode;
