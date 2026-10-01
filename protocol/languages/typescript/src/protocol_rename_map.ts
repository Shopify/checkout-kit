export type RenameChild =
  | [0, number]
  | [1, RenameChild]
  | [2, RenameChild]
  | [3, ...RenameChild[]];

export type RenameEntry = [number] | [number, RenameChild];

export function decodeRenameMap(encoded: string): RenameEntry[][] {
  let offset = 0;
  const readSymbol = (): number => {
    const code = encoded.charCodeAt(offset++);
    return code - 33 - (code > 34 ? 1 : 0) - (code > 92 ? 1 : 0);
  };
  const readValue = (): number => {
    const value = readSymbol();
    return value === 91 ? readValue() * 91 + readSymbol() : value;
  };
  const readChild = (type = readValue() - 1): RenameChild => {
    if (type === 0) return [type, readValue()];
    if (type === 3) {
      return [type, ...Array.from({length: readValue()}, () => readChild())];
    }
    return [type as 1 | 2, readChild()];
  };
  return Array.from({length: readValue()}, () =>
    Array.from({length: readValue()}, () => {
      const field = readValue();
      const type = readValue();
      return type === 0 ? [field] : [field, readChild(type - 1)];
    }),
  );
}
