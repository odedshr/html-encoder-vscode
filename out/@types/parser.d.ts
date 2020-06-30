export default class NodeParser {
    rootNode: Document;
    output: string[];
    functions: string[];
    isTypescript: boolean;
    constructor(document: Document, isTypescript: boolean);
    private parseDocument;
    private parseNode;
    private parseProcessInstruction;
    private _addSimpleNode;
    private _getAppendLivableString;
    private parseDocumentType;
    private parseTextElement;
    private parseCommentElement;
    private parseHtmlElement;
    private wrapAndReturnELM;
    private parseAttributes;
    private rememberForEasyAccess;
    private parseChildren;
    private getChildrenDescription;
    _parseAttrValue(value: string): {
        condition: string;
        attrName: string;
        varName: string;
        liveId: string | false;
    };
    _extractLiveId(attrName: string): string | false;
    _getAttributeInstructions(attributes: string[]): string[];
    _parseCssValue(value: string): {
        condition: string;
        varName: string;
    } | {
        condition?: undefined;
        varName?: undefined;
    };
    _getCssInstructions(classes: string[]): string[];
    toString(): string;
    getFunctions(): string;
}
