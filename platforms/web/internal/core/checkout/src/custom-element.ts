/**
 * The base class for Checkout Kit elements. Server rendering has no DOM, so this is a
 * stand-in there: modules that define elements stay safe to import, and elements are only
 * constructed in a browser.
 */
export const HTMLElementBase: typeof HTMLElement =
  globalThis.HTMLElement ?? (Object as unknown as typeof HTMLElement);

/**
 * Defines `element` as `name` in `registry`, and returns the class registered for `name`.
 *
 * Registering a name `element` (or a subclass of it) already owns returns that class. A
 * registry accepts each constructor only once, so a name other than `defaultName` gets its
 * own subclass.
 *
 * @throws {Error} If another element already owns `name`.
 */
export function registerCustomElement<T extends CustomElementConstructor>(
  element: T,
  name: string,
  defaultName: string,
  registry: CustomElementRegistry,
): T {
  const existing = registry.get(name);
  if (existing !== undefined) {
    if (existing === element || existing.prototype instanceof element) return existing as T;
    throw new Error(`Cannot register <${name}>: another element already uses that name.`);
  }
  const defined = name === defaultName ? element : class extends element {};
  registry.define(name, defined);
  return defined;
}
