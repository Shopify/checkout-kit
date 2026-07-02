export type Shape = readonly ['ref', string] | readonly ['arr', string] | readonly ['map'] | readonly ['key', string];
export declare const SHAPES: Record<string, Record<string, Shape>>;
export type RequiredKind = 'string' | 'number' | 'boolean' | 'any';
export declare const REQUIRED: Record<string, ReadonlyArray<readonly [string, RequiredKind]>>;
