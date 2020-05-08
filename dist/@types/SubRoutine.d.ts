declare type subRoutineType = 'loop' | 'if';
export default class SubRoutine {
    type: subRoutineType;
    varName: string;
    children: string[];
    parent: string[];
    constructor(type: subRoutineType, varName: string);
    toString(): string;
}
export {};
