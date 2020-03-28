declare abstract class JSNodeAbstract {
    set: object;
    data: object;
    node: ChildNode;
    domParser: DOMParser;
    docElm: Document;
    constructor();
    protected defineSet(): void;
    private getDocElm;
    _getDOMParser(): DOMParser;
    _getSubTemplate(templateName: string): any;
    _getSetProxy(map: {
        [key: string]: any;
    }): {
        [key: string]: any;
    };
    _forEach(iteratorName: string, indexName: string, varName: string, fn: Function): void;
    _getPreceedingOrSelf(elm: HTMLElement): ChildNode;
    _getValue(data: {
        [key: string]: any;
    }, path: string): any;
    _setValue(data: {
        [key: string]: any;
    }, path: string, value: any): void;
    _getHTMLNode(htmlString: string | HTMLElement): HTMLElement | Text;
    _toString(): string;
}
export default class JSNode extends JSNodeAbstract {
    constructor(data: object);
}
export {};
