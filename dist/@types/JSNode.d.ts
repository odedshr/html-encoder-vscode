declare type KeydObject = {
    [key: string]: any;
};
declare type Property = {
    type: 'text' | 'html' | 'attribute';
    attrName: string;
    node: HTMLElement;
};
interface DOMParser {
    parseFromString(str: string, type: SupportedType): Document;
}
declare var DOMParser: {
    prototype: DOMParser;
    new (): DOMParser;
};
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
    constructor(data: object, domParserInstance?: DOMParser);
    private getDocElm;
    private getDOMParser;
    protected _setDocumentType(name: string, publicId: string, systemId: string): void;
    protected _defineSet(): void;
    _getSetProxy(map: {
        [key: string]: Property;
    }): {
        [key: string]: Property;
    };
    _getSubTemplate(templateName: string): any;
    _forEach(iteratorName: string, indexName: string, varName: string, fn: Function): void;
    _getPreceedingOrSelf(elm: HTMLElement): HTMLElement;
    _getValue(data: KeydObject, path: string): any;
    _setValue(data: KeydObject, path: string, value: any): void;
    _getHTMLNode(htmlString: string | HTMLElement): HTMLElement | Text;
}
export {};
