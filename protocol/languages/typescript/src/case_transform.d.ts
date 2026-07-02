/** Remap snake_case wire payloads to the camelCase shape consumers read. */
export declare function camelizeKeys<T>(value: unknown, typeName: string): T;
/** Remap camelCase result objects back to the snake_case wire shape. */
export declare function snakeifyKeys(value: unknown, typeName: string): unknown;
