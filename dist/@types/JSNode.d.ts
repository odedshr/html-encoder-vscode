declare type KeydObject = {
    [key: string]: any;
};
declare type Property = {
    type: 'text' | 'html' | 'attribute';
    attrName?: string;
    node: Element;
};
import { DOMParser } from 'xmldom';
export default class JSNode {
    set: {
        [key: string]: Property;
    };
    data: {
        [key: string]: any;
    };
    node: ChildNode;
    domParser: DOMParser;
    docElm: Document;
    constructor(data: object);
    private getDocElm;
    protected _setDocumentType(name: string, publicId: string, systemId: string): void;
    protected _defineSet(isSSR: boolean): void;
    private findHTMLChildren;
    _getSubTemplate(templateName: string): any;
    _forEach(iteratorName: string, indexName: string, varName: string, fn: Function): void;
    _getPreceedingOrSelf(elm: HTMLElement): HTMLElement;
    _getValue(data: KeydObject, path: string): any;
    _setValue(data: KeydObject, path: string, value: any): void;
    _getHTMLNode(htmlString: string | HTMLElement): HTMLElement | Text;
}
export declare function init(root: Element, domParser: DOMParser): void;
export {};
