import { TargetType } from './htmlEncoder';
export declare type Target = {
    path: string;
    type: TargetType;
    ssr: boolean;
};
export declare const allTargetsPattern: RegExp;
export default function findTargets(sourcePath: string, fullText: string): Target[];
