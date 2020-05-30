declare type subRoutineType = 'loop' | 'if';
export default class SubRoutine {
    type: subRoutineType;
    varName: string;
    children: string[];
    parent: string[];
    liveId?: string;
    functionName: string;
    loopIterator?: string;
    loopIndex?: string;
    constructor(type: subRoutineType, varName: string, liveId?: string);
    toString(): string;
    getFunction(): string;
}
export {};
