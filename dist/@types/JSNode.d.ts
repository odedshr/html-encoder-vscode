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
declare abstract class JSNodeAbstract {
    set: {
        [key: string]: any;
    };
    data: {
        [key: string]: any;
    };
    node: ChildNode;
    domParser: DOMParser;
    docElm: Document;
    constructor(domParserInstance?: DOMParser);
    protected defineSet(): void;
    protected setDocumentType(name: string, publicId: string, systemId: string): void;
    private getDocElm;
    private getDOMParser;
    _getSubTemplate(templateName: string): any;
    _getSetProxy(map: KeydObject): KeydObject;
    _forEach(iteratorName: string, indexName: string, varName: string, fn: Function): void;
    _getPreceedingOrSelf(elm: HTMLElement): HTMLElement;
    _getValue(data: KeydObject, path: string): any;
    _setValue(data: KeydObject, path: string, value: any): void;
    _getHTMLNode(htmlString: string | HTMLElement): HTMLElement | Text;
}
export default class JSNode extends JSNodeAbstract {
    constructor(data: object, domParser?: DOMParser);
}
export {};
