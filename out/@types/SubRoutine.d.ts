declare type subRoutineType = 'loop' | 'if';
export declare class SubRoutineEnd {
}
export declare class SubRoutine {
    type: subRoutineType;
    varName: string;
    children: string[];
    parent: string[];
    liveId?: string;
    functionName: string;
    loopIterator?: string;
    loopIndex?: string;
    isTypescript: boolean;
    constructor(type: subRoutineType, varName: string, isTypescript: boolean, liveId?: string);
    private toCamelCase;
    toString(): string;
    getFunction(): string;
}
export {};
