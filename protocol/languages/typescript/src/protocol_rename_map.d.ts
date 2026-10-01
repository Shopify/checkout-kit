export type RenameChild = [0, number] | [1, RenameChild] | [2, RenameChild] | [3, ...RenameChild[]];
export type RenameEntry = [number] | [number, RenameChild];
export declare function decodeRenameMap(encoded: string): RenameEntry[][];
