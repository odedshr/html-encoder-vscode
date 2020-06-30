import { SubRoutine, SubRoutineEnd } from './SubRoutine';

const NodeType = {
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
  Notation: 12,
};

export default class NodeParser {
  rootNode: Document;
  output: string[] = [];
  functions: string[] = [];
  isTypescript: boolean;

  constructor(document: Document, isTypescript: boolean) {
    this.rootNode = document;
    this.isTypescript = isTypescript;

    if (!document || !document.firstChild) {
      // not content at all
      this.output.push(`docElm.createDocumentFragment();`);
    } else {
      const children: ChildNode[] = Array.from(document.childNodes);
      const docType: ChildNode | false | undefined =
        children[0].nodeType === NodeType.DocumentType ? children.shift() : false;
      if (children.length > 1) {
        this.output.push(
          this.wrapAndReturnELM([
            `const elm = docElm.createDocumentFragment();`,
            ...children.map((node) => `elm.appendChild(${this.parseDocument(node)});`),
          ])
        );
      } else {
        const child = children.pop();
        child && this.output.push(this.parseDocument(child));
      }
      if (docType) {
        this.output.push(this.parseDocument(docType));
      }
    }
  }

  private parseDocument(node: ChildNode): string {
    const output = this.parseNode(node);

    if (output instanceof SubRoutine || output instanceof SubRoutineEnd) {
      return output.toString();
    } else if (Array.isArray(output)) {
      return output.join('\n');
    }

    return output;
  }

  private parseNode(node: ChildNode): string | string[] | SubRoutine | SubRoutineEnd {
    switch (node.nodeType) {
      case NodeType.DocumentType:
        return this.parseDocumentType(<DocumentType>node);
      case NodeType.Document:
      case NodeType.DocumentFragment:
        if (node.childNodes.length !== 1) {
          throw Error('document must have exactly one child');
        }

        return node.firstChild ? this.parseNode(node.firstChild) : '';
      case NodeType.ProcessingInstruction:
        return this.parseProcessInstruction(<ProcessingInstruction>node);
      case NodeType.Text:
        return this.parseTextElement(node);
      case NodeType.Comment:
        return this.parseCommentElement(node);
      default:
        return this.parseHtmlElement(<HTMLElement>node);
    }
  }

  private parseProcessInstruction(node: ProcessingInstruction): string[] | SubRoutine | SubRoutineEnd {
    const tagName = node.target;
    const nodeValue = node.nodeValue || '';
    if (tagName.indexOf('?') === 0) {
      return new SubRoutine('if', tagName.substring(1), this.isTypescript, nodeValue);
    } else if (tagName.match(/.+@.+/)) {
      return new SubRoutine('loop', tagName, this.isTypescript, nodeValue);
    } else if (['/@', '/?'].indexOf(tagName) > -1) {
      return new SubRoutineEnd();
    } else if (tagName.indexOf('attr') === 0) {
      return this._getAttributeInstructions(nodeValue.split(/\s/));
    } else if (tagName.indexOf('css') === 0) {
      return this._getCssInstructions(nodeValue.split(/\s/));
    } else if (tagName.indexOf(':') === 0) {
      return [`elm.appendChild(self._getSubTemplate('${tagName.substr(1)}'));`];
    } else if (tagName.indexOf('==') === 0) {
      return [this._addSimpleNode('self._getHTMLNode', tagName.substr(2), nodeValue, 'html')];
    } else if (tagName.indexOf('=') === 0) {
      return [this._addSimpleNode('docElm.createTextNode', tagName.substr(1), nodeValue, 'text')];
    }

    return [`elm.appendChild(docElm.createProcessingInstruction('${tagName}','${nodeValue}'));`];
  }

  private _addSimpleNode(funcName: string, tagName: string, nodeValue: string, type: 'html' | 'text'): string {
    const nodeString = `${funcName}(self._getValue(self.data, '${tagName.replace(/#$/, '')}'))`;
    const updatableString = this._getAppendLivableString(tagName, nodeValue, type);

    return `elm.appendChild((function () { const node = ${nodeString}; ${updatableString} return node; })());`;
  }

  private _getAppendLivableString(tagName: string, nodeValue: string, type: string): string {
    let varName: string | false = false;
    if (tagName.charAt(tagName.length - 1) === '#') {
      varName = tagName.substr(0, tagName.length - 1);
    } else if (nodeValue.charAt(0) === '#') {
      varName = nodeValue.substr(1);
    }

    return varName ? `self.register('${varName}',{ node, type: '${type}' });` : '';
  }

  private parseDocumentType(node: DocumentType): string {
    return `self._setDocumentType('${node.name}','${node.publicId ? node.publicId : ''}','${
      node.systemId ? node.systemId : ''
      }');`;
  }

  private parseTextElement(node: ChildNode): string {
    return `docElm.createTextNode(\`${node.textContent}\`)`;
  }

  private parseCommentElement(node: ChildNode): string {
    return `docElm.createComment(\`${node.textContent}\`)`;
  }

  private parseHtmlElement(node: HTMLElement): string {
    let element: string[] = [`const elm = docElm.createElement('${node.tagName}');`];

    this.parseAttributes(node, element);
    element.push(...this.parseChildren(node));

    return this.wrapAndReturnELM(element);
  }

  private wrapAndReturnELM(element: string[]) {
    return `(function () { ${element.join('\n')}\n return elm; })()`;
  }

  private parseAttributes(node: HTMLElement, element: string[]) {
    return Array.from(node.attributes || []).forEach((attr: Attr) => {
      this.rememberForEasyAccess(attr, element);
      element.push(`elm.setAttribute('${attr.nodeName}','${attr.nodeValue}');`);
    });
  }

  private rememberForEasyAccess(attr: Attr, element: string[]) {
    if (attr.nodeName.toLowerCase() === 'id') {
      element.push(`self.register('${attr.nodeValue}', { node: elm, type: 'html' });`);
    }
  }

  private parseChildren(node: HTMLElement): string[] {
    const childNodes = Array.from(node.childNodes || []);
    const stack: SubRoutine[] = [];
    let children: string[] = [] as string[];

    // console.debug(`-- parsing ${node.tagName}: ${this._getChildrenDescription(childNodes)}`);

    childNodes.forEach((childNode: ChildNode) => {
      const parsed = this.parseNode(childNode);

      if (parsed instanceof SubRoutine) {
        parsed.parent = children;
        stack.push(parsed);

        //from now on, add to the subroutines' children list;
        children = parsed.children;
      } else if (parsed instanceof SubRoutineEnd) {
        const subRoutine = stack.pop();

        if (!subRoutine) {
          throw Error(`end of subRoutine without start: ${this.getChildrenDescription(childNodes)}`);
        }
        children = subRoutine.parent;
        children.push(subRoutine.toString());
        this.functions.push(subRoutine.getFunction());
      } else if (Array.isArray(parsed)) {
        children.push(...parsed);
      } else {
        children.push(`elm.appendChild(${parsed});`);
      }
    });

    return children;
  }

  private getChildrenDescription(children: ChildNode[]): string {
    return JSON.stringify(
      children.map((node) => {
        switch (node.nodeType) {
          case NodeType.Document:
          case NodeType.DocumentFragment:
            return 'doc';
          case NodeType.ProcessingInstruction:
            return (<ProcessingInstruction>node).target;
          case NodeType.Text:
            return `t{${node.textContent}}`;
          case NodeType.Comment:
            return `t{${node.textContent}}`;
          default:
            return (<HTMLElement>node).tagName;
        }
      })
    );
  }

  _parseAttrValue(value: string) {
    // value is `condition?attrName=varName`
    const matches = value.match(/((.+)\?)?([^=.]+)(=(.+))?/) || [];
    const condition = matches[2];
    const varName = matches[5];
    let liveId = this._extractLiveId(matches[3]);
    let attrName = matches[3].split('#')[0];

    return { condition, attrName, varName, liveId };
  }

  _extractLiveId(attrName: string) {
    if (attrName.indexOf('#') > -1) {
      const liveId = attrName.split('#')[1];
      const pattern = liveId.match(/^{(.*)}$/);
      if (pattern) {
        return `self._getValue(self.data, '${pattern[1]}')`;
      } else if (liveId.length) {
        return `'${liveId}'`;
      } else {
        return `'${attrName.substring(0, attrName.indexOf('#'))}'`;
      }
    }
    return false;
  }

  _getAttributeInstructions(attributes: string[]) {
    const instructions = ['{ let node = self._getPrecedingOrSelf(elm), tmpAttrs;'];

    attributes.forEach((attrValue) => {
      const { condition, attrName, varName, liveId } = this._parseAttrValue(attrValue);

      if (condition) {
        instructions.push(`if (self._getValue(self.data, '${condition}')) {`);
      }

      if (varName) {
        instructions.push(
          `node.setAttribute('${attrName}', self._getValue(self.data, '${varName.replace(/[\'"]/g, "\\'")}'));`
        );
        if (liveId) {
          instructions.push(`self.register(${liveId}, { node, type: 'attribute', 'attrName': '${attrName}'});`);
        }
      } else {
        if (liveId) {
          instructions.push(`self.register(${liveId},{ node, type: 'attribute' });`);
        }
        //no variable provided; setting attributeMap
        const addToLiveList = liveId
          ? `self.register(\`${liveId}#\${k}\`, { node, type: 'attribute', 'attrName': k });`
          : '';
        instructions.push(`tmpAttrs = self._getValue(self.data, '${attrName}');`);
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
    return matches !== null ? { condition: matches[2], varName: matches[3] } : {};
  }

  _getCssInstructions(classes: string[]) {
    const instructions = [
      `{ let tmpElm = self._getPrecedingOrSelf(elm), tmpCss = tmpElm.getAttribute('class') || '',
		target = tmpCss.length ? tmpCss.split(/\s/) : [];`,
    ];

    classes.forEach((varValue) => {
      const { condition, varName } = this._parseCssValue(varValue);

      if (condition) {
        instructions.push(`if (self._getValue(self.data, '${condition}')) {`);
      }

      instructions.push(`tmpCss = self._getValue(self.data, '${varName}');
				(Array.isArray(tmpCss) ? tmpCss : [tmpCss]).forEach(function (css) { target.push(css); });
			`);

      if (condition) {
        instructions.push('}');
      }
    });
    instructions.push(`tmpElm.setAttribute('class', target.join(' ')); }`);

    return instructions;
  }

  toString(): string {
    return this.output.join('\n');
  }

  getFunctions(): string {
    return this.functions.join('\n');
  }
}
