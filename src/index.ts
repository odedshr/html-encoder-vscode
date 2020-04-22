import { DOMParser } from 'xmldom';
import { readFileSync } from 'fs';

const domParser = new DOMParser();
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

class NodeParser {
  rootNode: Document;
  output: string[] = [];

  constructor(document: Document) {
    this.rootNode = document;

    if (!document || !document.firstChild) {
      // not content at all
      this.output.push(`docElm.createDocumentFragment()`);
    } else {
      const children: ChildNode[] = Array.from(document.childNodes);
      const docType: ChildNode | boolean =
        children[0].nodeType === NodeType.DocumentType
          ? children.shift()
          : false;
      if (children.length > 1) {
        this.output.push(
          this.wrapAndReturnELM([
            `const elm = docElm.createDocumentFragment()`,
            ...children.map(
              (node) => `elm.appendChild(${this.parseDocument(node)})`
            ),
          ])
        );
      } else {
        this.output.push(this.parseDocument(children.pop()));
      }
      if (docType) {
        this.output.push(this.parseDocument(docType));
      }
    }
  }

  private parseDocument(node: ChildNode): string {
    const output = this.parseNode(node);

    if (output instanceof SubRoutine) {
      return output.toString();
    } else if (Array.isArray(output)) {
      return output.join('\n');
    }

    return output;
  }

  private parseNode(node: ChildNode): string | string[] | SubRoutine {
    switch (node.nodeType) {
      case NodeType.DocumentType:
        return this.parseDocumentType(<DocumentType>node);
      case NodeType.Document:
      case NodeType.DocumentFragment:
        if (node.childNodes.length !== 1) {
          throw Error('document must have exactly one child');
        }

        return this.parseNode(node.firstChild);
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

  private parseProcessInstruction(
    node: ProcessingInstruction
  ): string[] | SubRoutine | null {
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
      return [
        `elm.appendChild(self._getSubTemplate('${tagName.substring(1)}'))`,
      ];
    } else if (tagName.indexOf('==') === 0) {
      return [
        this._getAppendLivableString(
          `self._getHTMLNode(self._getValue(self.data, '${tagName.substring(
            2
          )}'))`,
          node.nodeValue,
          'html'
        ),
      ];
    } else if (tagName.indexOf('=') === 0) {
      return [
        this._getAppendLivableString(
          `docElm.createTextNode(self._getValue(self.data, '${tagName.substring(
            1
          )}'))`,
          node.nodeValue,
          'text'
        ),
      ];
    }

    return [
      `elm.appendChild(docElm.createProcessingInstruction('${tagName}','${node.nodeValue}'))`,
    ];
  }

  _getAppendLivableString(
    nodeString: string,
    nodeValue: string,
    type: string
  ): string {
    const addToSetString =
      nodeValue.indexOf('#') === 0
        ? `self.set['${nodeValue.substring(1)}'] = { node, type: '${type}' };`
        : '';

    return `elm.appendChild((function () { const node = ${nodeString}; ${addToSetString} return node; })());`;
  }

  private parseDocumentType(node: DocumentType): string {
    return `self.setDocumentType('${node.name}','${
      node.publicId ? node.publicId : ''
    }','${node.systemId ? node.systemId : ''}')`;
  }

  private parseTextElement(node: ChildNode): string {
    return `docElm.createTextNode(\`${node.textContent}\`)`;
  }

  private parseCommentElement(node: ChildNode): string {
    return `docElm.createComment(\`${node.textContent}\`)`;
  }

  private parseHtmlElement(node: HTMLElement): string {
    let element: string[] = [
      `const elm = docElm.createElement('${node.tagName}');`,
    ];

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
      element.push(`elm.setAttribute('${attr.nodeName}','${attr.nodeValue}')`);
    });
  }

  private rememberForEasyAccess(attr: Attr, element: string[]) {
    if (attr.nodeName.toLowerCase() === 'id') {
      element.push(
        `self.set['${attr.nodeValue}'] = { node: elm, type: 'attribute' };`
      );
    }
  }

  private parseChildren(node: HTMLElement): string[] {
    const childNodes = Array.from(node.childNodes || []);
    const stack: SubRoutine[] = [];
    let children: string[] = [] as string[];

    // console.debug(`-- parsing ${node.tagName}: ${this._getChildrenDecription(childNodes)}`);

    childNodes.forEach((childNode: ChildNode) => {
      const parsed = this.parseNode(childNode);

      if (parsed instanceof SubRoutine) {
        parsed.parent = children;
        stack.push(parsed);

        //from now on, add to the subroutines' children list;
        children = parsed.children;
      } else if (parsed === null) {
        const subRoutine = stack.pop();

        if (!subRoutine) {
          throw Error(
            `end of subRoutine without start: ${this.getChildrenDecription(
              childNodes
            )}`
          );
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

  private getChildrenDecription(children: ChildNode[]): string {
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

  // value is `condition?attrName=varName`
  _parseAttrValue(value: string) {
    const matches = value.match(/((.+)\?)?([^=.]+)(=(.+))?/);
    return { condition: matches[2], attrName: matches[3], varName: matches[5] };
  }

  _getAttributeInstructions(attributes: string[]) {
    const instructions = [
      '{ let node = self._getPreceedingOrSelf(elm), tmpAttrs;',
    ];

    let liveId: string;

    if (attributes[attributes.length - 1].indexOf('#') === 0) {
      liveId = attributes.pop().substring(1);
    }

    attributes.forEach((attrValue) => {
      const { condition, attrName, varName } = this._parseAttrValue(attrValue);

      if (condition) {
        instructions.push(`if (self._getValue(self.data, '${condition}')) {`);
      }

      if (varName) {
        instructions.push(
          `node.setAttribute('${attrName}', self._getValue(self.data, '${varName.replace(
            /[\'"]/g,
            "\\'"
          )}'));`
        );
        if (liveId) {
          instructions.push(
            `self.set['${liveId}#${attrName}'] = { node, type: 'attribute', 'attrName': '${attrName}'}`
          );
        }
      } else {
        const addToLiveList = liveId
          ? `self.set[\`${liveId}#\${k}\`] = { node, type: 'attribute', 'attrName': k };`
          : '';
        instructions.push(
          `tmpAttrs = self._getValue(self.data, '${attrName}');`
        );
        instructions.push(
          `for (let k in tmpAttrs) { node.setAttribute(k, tmpAttrs[k]);${addToLiveList} }`
        );
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
      `{ let tmpElm = self._getPreceedingOrSelf(elm), tmpCss = tmpElm.getAttribute('class') || '',
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
    return this.output.join(';');
  }
}

// function parseFromString(html: string): Document {
// 	const res = domParser.parseFromString(html, 'text/xml');
// 	if (!res) {
// 		return domParser.parseFromString(`<pre>${html.replace(/\</g, '&lt;')}</pre>`, 'text/xml');
// 	}

// 	console.log(Object.keys(res));
// 	return res;
// }

function transpile(parser: NodeParser, isTypescript: boolean) {
  return readFileSync(getTemplateFile(isTypescript), {
    encoding: 'utf-8',
  }).replace(/console\.log\(docElm\)[;,]/, `this.node = ${parser.toString()};`);
}

function getTemplateFile(isTypescript: boolean) {
  return `${__dirname}/JSNode.${isTypescript ? 'ts' : 'js'}`;
}

export default function htmlEncoder(html: string, isTypescript = false) {
  const document: Document = domParser.parseFromString(
    html.replace(/\n\s+>/g, '>'),
    'text/xml'
  );

  // console.debug(html.replace(/\n\s+>/g,'>'));
  const nodeParser = new NodeParser(document);

  return transpile(nodeParser, isTypescript);
}
