declare type KeydObject = {
    [key: string]: any;
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
        [key: string]: any;
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
    _getSetProxy(map: KeydObject): KeydObject;
    _getSubTemplate(templateName: string): any;
    _forEach(iteratorName: string, indexName: string, varName: string, fn: Function): void;
    _getPreceedingOrSelf(elm: HTMLElement): HTMLElement;
    _getValue(data: KeydObject, path: string): any;
    _setValue(data: KeydObject, path: string, value: any): void;
    _getHTMLNode(htmlString: string | HTMLElement): HTMLElement | Text;
}
export {};
