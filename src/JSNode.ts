declare type KeyedObject = { [key: string]: any };
declare type Property = {
  type: 'text' | 'html' | 'attribute' | 'loop' | 'conditional';
  node: Element;
  attrName?: string;
  details?: subRoutineInstructions;
};
declare type subRoutineInstructions = {
  startAt: number;
  fn?: (value: any) => ChildNode[];
  items?: any;
  flag?: boolean;
  nodes?: ChildNode[][];
};

// feature _SSR
// _SSR()
import { DOMParser } from 'xmldom';
const window = { DOMParser: DOMParser };
// feature _SSR end

export function getNode(data: { [key: string]: any } = {}): Node {
  return <Node><unknown>new JSNode(data);
}

export function initNode(existingNode: ChildNode): Node {
  return <Node><unknown>new JSNode({}, existingNode);
}

export default class JSNode {
  set: { [key: string]: Property[] } = {};
  data: { [key: string]: any };
  node: ChildNode;
  domParser: DOMParser;
  docElm: Document;

  constructor(data: object, existingNode?: ChildNode) {
    this.domParser = new window.DOMParser();

    this.docElm = this.getDocElm();

    this.data = data;

    if (existingNode) {
      this.node = this.initExitingElement(existingNode);
    } else {
      this.node = this.fillNode();
    }

    const self = this;
    const originalToString = this.node.toString;
    this.node.toString = () => self.fixHTMLTags(originalToString.call(this.node));
    return <any>this.node;
  }

  private initExitingElement(node: ChildNode) {
    const self = this;
    if (node.nodeType === 9) {
      Array.from(node.childNodes)
        .filter((child: ChildNode) => !!(<HTMLElement>child).setAttribute)
        .forEach((child: ChildNode) => initChild(self, <HTMLElement>child));
    } else {
      initChild(self, <Element>node);
    }
    // feature _defineSet
    addReactiveFunctionality(<Element>node, this.set, this.domParser);
    // feature _defineSet end

    return node;
  }

  private fillNode(): ChildNode {
    const self = this;

    //docElm is used by injected code
    const docElm = this.docElm;
    // main code goes here:
    //@ts-ignore returned value might be DocumentFragment which isn't a childNode, which might cause tsc to complain
    console.log(self, docElm);
    // end of main code
    return this.node;
  }

  private getDocElm(): Document {
    return typeof document !== 'undefined' ? document : this.domParser.parseFromString('<html></html>', 'text/xml');
  }

  // feature register
  public register(key: string, value: Property) {
    if (!this.set[key]) {
      this.set[key] = [];
    }
    this.set[key].push(value);
  }
  // feature register end

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
        // if node is Document refer to the first child (the <html>);
        (this.node.nodeType === 9 ? this.findHTMLChildren(this.node) : [this.node]).forEach((node: ChildNode) =>
          (<HTMLElement>node).setAttribute('data-live-root', '')
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
  _forEach(iteratorName: string, indexName: string, list: any, parent: Node, fn: () => ChildNode[]): ChildNode[][] {
    const self = this;
    const orig = {
      iterator: self._getValue(this.data, iteratorName),
      index: self._getValue(this.data, indexName),
    };
    const items: ChildNode[][] = [];

    for (let id in list) {
      self._setValue(this.data, indexName, id);
      self._setValue(this.data, iteratorName, list[id]);
      items.push(getAddedChildren(parent, fn));
    }
    self._setValue(this.data, iteratorName, orig.iterator);
    self._setValue(this.data, indexName, orig.index);
    return items;
  }
  // feature _forEach end

  // feature _getPrecedingOrSelf
  _getPrecedingOrSelf(elm: HTMLElement): HTMLElement {
    //@ts-ignore
    const children = Array.from(elm.childNodes);
    children.reverse();

    return (children.find(function (child) {
      return child.nodeType === 1;
    }) || elm) as HTMLElement;
  }
  // feature _getPrecedingOrSelf end
  // feature _getValue
  _getValue(data: KeyedObject, path: string): any {
    if (path.match(/^(['"].*(\1))$/)) {
      return path.substring(1, path.length - 1);
    }

    return path[0] === '!'
      ? !this._getValue(data, path.substr(1))
      : path.split('.').reduce(function (ptr: KeyedObject, step: string) {
        return ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined;
      }, data);
  }
  // feature _getValue end

  // feature _setValue
  _setValue(data: KeyedObject, path: string, value: any) {
    const pathParts = path.split('.');
    const varName = pathParts.pop();
    if (varName) {
      pathParts.reduce(function (ptr: { [key: string]: any }, step) {
        return ptr && ptr.hasOwnProperty(step) ? ptr[step] : undefined;
      }, data)[varName] = value;
    }
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
      return <HTMLElement>this.domParser.parseFromString(htmlString, 'text/xml').firstChild;
    } catch (err) {
      console.error(`failed to parse string: ${htmlString}`, err);
      return this.docElm.createTextNode(htmlString);
    }
  }
  // feature _getHTMLNode end

  // feature fixHTMLTags
  private fixHTMLTags(xmlString: string) {
    return xmlString.replace(
      /\<(?!area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([a-z|A-Z|_|\-|:|0-9]+)([^>]*)\/\>/gm,
      '<$1$2></$1>'
    );
  }
  // feature fixHTMLTags end
}

// functions go here

// feature clone
function clone(item: any) {
  return typeof item === 'object' ? Object.freeze(Array.isArray(item) ? [...item] : { ...item }) : item;
}
// feature clone end

// feature getAddedChildren
function getAddedChildren(parent: Node, fn: () => void): ChildNode[] {
  const items = [];
  const beforeChildCount = parent.childNodes.length;
  fn();
  const afterChildCount = parent.childNodes.length;
  for (let i = beforeChildCount; i < afterChildCount; i++) {
    items.push(parent.childNodes.item(i));
  }
  return items;
}
// feature getAddedChildren end

function initChild(self: JSNode, node: Element) {
  if (!!node.hasAttribute) {
    const nodeId = node.getAttribute('id');
    nodeId && self.register(nodeId, { type: 'html', node });

    const dataLiveText = node.getAttribute('data-live-text');
    dataLiveText &&
      dataLiveText.split(';').forEach((attr) => {
        const [childIndex, varName] = attr.split('|');
        while (node.childNodes.length <= +childIndex) {
          node.appendChild(document.createTextNode(''));
        }
        self.register(varName, { type: 'text', node: <Element>node.childNodes[+childIndex] });
      });

    const dataLiveHtml = node.getAttribute('data-live-html');
    dataLiveHtml &&
      dataLiveHtml.split(';').forEach((attr) => {
        const [childIndex, varName] = attr.split('|');
        self.register(varName, { type: 'html', node: <Element>node.childNodes[+childIndex] });
      });

    const dataLiveMap = node.getAttribute('data-live-map');
    dataLiveMap && self.register(dataLiveMap, { type: 'attribute', node });

    const dataLiveAttr = node.getAttribute('data-live-attr');
    dataLiveAttr &&
      dataLiveAttr.split(';').forEach((attr) => {
        const [attrName, varName] = attr.split('|');
        self.register(varName, { type: 'attribute', node, attrName });
      });

    if (node.hasAttribute('data-live-loop')) {
      const nodes = getSubroutineChildren(node, 'data-live-loop-child');
      const dataLiveLoop = node.getAttribute('data-live-loop');
      dataLiveLoop &&
        dataLiveLoop.split(';').forEach((attr) => {
          const [startAt, varName, fnName, stringValue] = attr.split('|');
          const fn = eval(fnName).bind({}, self, self.docElm, node);
          self.register(varName, {
            type: 'loop',
            node,
            details: { startAt: +startAt, items: JSON.parse(stringValue), nodes: nodes[varName], fn },
          });
        });
    }

    const dataLiveIf = node.getAttribute('data-live-if');
    if (dataLiveIf) {
      const nodes = getSubroutineChildren(node, 'data-live-if-child');
      dataLiveIf.split(';').forEach((attr) => {
        const [startAt, varName, fnName, flag] = attr.split('|');
        const fn = eval(fnName).bind({}, self, self.docElm, node);
        self.register(varName, {
          type: 'conditional',
          node,
          details: { startAt: +startAt, flag: flag === 'true', nodes: nodes[varName], fn },
        });
      });
    }
  }

  Array.from(node.childNodes)
    .filter(
      (child: ChildNode) => !!(<HTMLElement>child).hasAttribute && !(<HTMLElement>child).hasAttribute('data-live-root')
    )
    .forEach((child: ChildNode) => initChild(self, <HTMLElement>child));
}

// feature _defineSet
function addServerReactiveFunctionality(set: { [key: string]: Property[] } = {}) {
  for (let key in set) {
    set[key].forEach((property: Property) => {
      const node = <HTMLElement>property.node;
      const parentNode: HTMLElement = <HTMLElement>node.parentNode;
      switch (property.type) {
        case 'text':
          appendAttribute(parentNode, 'data-live-text', `${indexOfChild(parentNode.childNodes, node)}|${key}`);
          break;
        case 'html':
          if (!node.getAttribute || !(node.getAttribute('id') === key)) {
            const parentNode: HTMLElement = <HTMLElement>node.parentNode;
            appendAttribute(parentNode, 'data-live-html', `${indexOfChild(parentNode.childNodes, node)}|${key}`);
          }
          break;
        case 'attribute':
          if (property.attrName) {
            appendAttribute(node, 'data-live-attr', `${property.attrName}|${key}`);
          } else {
            node.setAttribute('data-live-map', key);
          }
          break;
        case 'loop':
          if (property.details) {
            const { fn = () => [], startAt, items, nodes = [] } = property.details;
            appendAttribute(
              node,
              'data-live-loop',
              `${startAt}|${key}|${fn.name.replace(/bound /, '')}|${JSON.stringify(items)}`
            );
            nodes.forEach((collection, i) =>
              collection.forEach((item) => appendAttribute(<HTMLElement>item, 'data-live-loop-child', `${key}|${i}`))
            );
          }
          break;
        case 'conditional':
          if (property.details) {
            const { fn = () => { }, startAt, flag, nodes = [] } = property.details;
            appendAttribute(node, 'data-live-if', `${startAt}|${key}|${fn.name.replace(/bound /, '')}|${flag}`);
            nodes.forEach((collection, i) =>
              collection.forEach((item) => appendAttribute(<HTMLElement>item, 'data-live-if-child', `${key}|${i}`))
            );
          }
          break;
      }
    });
  }
}

function indexOfChild(childNodes: NodeListOf<ChildNode>, child: ChildNode) {
  return Array.prototype.indexOf.call(childNodes, child);
}

function appendAttribute(node: HTMLElement, attributeName: string, newChild: string) {
  const value = [newChild];
  const attribute = node.getAttribute(attributeName);
  attribute !== null && value.unshift(attribute);
  node.setAttribute(attributeName, value.filter((v) => v.length).join(';'));
}

function addReactiveFunctionality(node: ChildNode, set: { [key: string]: Property[] } = {}, domParser: DOMParser) {
  Object.defineProperty(node, 'set', {
    value: getSetProxy(set, domParser),
    configurable: true,
    writable: true,
  });
}

function getSetProxy(map: { [key: string]: Property[] }, domParser: DOMParser) {
  return new Proxy(map, {
    get: function (map, prop: string) {
      const property = map[prop][0];
      if (property) {
        switch (property.type) {
          case 'text':
            return property.node.textContent;
          case 'html':
            return property.node;
          case 'attribute':
            return property.attrName && (<Element>property.node).getAttribute(property.attrName);
          case 'loop':
            return property?.details?.items;
          case 'conditional':
            return property?.details?.flag;
        }
      }
    },
    set: function (map: KeyedObject, prop: string, value: any) {
      map[prop].forEach((property: Property) => {
        switch (property.type) {
          case 'text':
            (<any>property.node).data = value;
            break;
          case 'html':
            try {
              const newNode = typeof value === 'string' ? domParser.parseFromString(value, 'text/xml') : value;
              if (property.node && property.node.parentNode) {
                property.node.parentNode.replaceChild(newNode, property.node);
              }
              property.node = newNode;
            } catch (err) {
              console.error(`failed to replace node to ${value}`, err);
            }
            break;
          case 'attribute':
            if (property.attrName) {
              // single attribute
              if (value === null) {
                property.node.removeAttribute(property.attrName);
              } else {
                property.node.setAttribute(property.attrName, value);
              }
            } else {
              // attribute map
              Object.keys(value).forEach((attrName) => property.node.setAttribute(attrName, value[attrName]));
            }
            break;
          case 'loop':
            updateLoop(property, value);
            break;
          case 'conditional':
            updateConditional(property, value);
            break;
        }
      });
      return true;
    },
  });
}

function countElementsUntilIndex(items: ChildNode[][], index: number) {
  let acc = 0;
  for (let i = 0; i < index; i++) {
    acc += items[i].length;
  }
  return acc;
}

function updateLoop(property: Property, value: any) {
  if (property.details) {
    const parent = property.node;
    const { fn = () => [], items, nodes = [], startAt } = property.details;
    const instructions: DiffInstructions = diff(items, value);

    const removedChildren: ChildNode[][] = instructions.removed.map((i) => {
      nodes[i].forEach((node) => parent.removeChild(node));
      return nodes[i];
    });

    fn(instructions.added).forEach((children: any) => nodes.push(children));

    const updatedNodes = nodes.filter((node) => !removedChildren.includes(node));
    instructions.positions.forEach((newIndex, i) => {
      if (newIndex !== -1) {
        const newP = countElementsUntilIndex(updatedNodes, newIndex);
        const sibling = parent.childNodes.item(startAt + newP);
        if (sibling !== updatedNodes[i][0]) {
          updatedNodes[i].forEach((child) => parent.insertBefore(child, sibling));
        }
      }
    });

    property.details.nodes = updatedNodes;
    property.details.items = clone(value);
  }
}

type DiffInstructions = {
  removed: number[];
  added: ChildNode[];
  positions: number[];
};

function diff(source: any[], target: any[]): DiffInstructions {
  const placed: boolean[] = target.map(() => false);
  const output: DiffInstructions = {
    removed: [],
    added: [],
    positions: [],
  };

  source.forEach((item, from) => {
    const position = target.findIndex((targetItem, j) => targetItem === item && !placed[j]);
    if (position === -1) {
      output.removed.push(from);
    } else {
      output.positions.push(position);
      placed[position] = true;
    }
  });

  output.removed = output.removed.sort().reverse();

  target.forEach((item, position) => {
    if (!placed[position]) {
      output.positions.push(position);
      output.added.push(item);
    }
  });

  return output;
}

function updateConditional(property: Property, value: boolean) {
  if (property.details) {
    const parent = property.node;
    let updatedNodes: ChildNode[][] = [];
    const { fn = () => [], flag, nodes = [], startAt } = property.details;

    if (flag && !value) {
      while (nodes[0].length) {
        const child = nodes[0].pop();
        child && parent.removeChild(child);
      }
    } else if (!flag && value) {
      updatedNodes = [fn(value)];
      if (parent.childNodes.length < startAt) {
        property.details.startAt = parent.childNodes.length - updatedNodes[0].length;
      } else {
        const sibling = parent.childNodes.item(startAt);
        updatedNodes[0].forEach((node) => parent.insertBefore(node, sibling));
      }
    }

    property.details.nodes = updatedNodes;
    property.details.flag = value;
  }
}

// feature _defineSet end
// feature getSubroutineChildren
function getSubroutineChildren(node: ChildNode, attribute: string): { [key: string]: ChildNode[][] } {
  const output: { [key: string]: ChildNode[][] } = {};
  Array.from(node.childNodes).forEach((child: ChildNode) => {
    if ((<HTMLElement>child).hasAttribute(attribute)) {
      const [key, collection] = ((<HTMLElement>child).getAttribute(attribute) || '').split('|');
      if (!output[key]) {
        output[key] = [];
      }
      if (!output[key][+collection]) {
        output[key][+collection] = [];
      }
      output[key][+collection].push(child);
    }
  });
  return output;
}
// feature getSubroutineChildren end
