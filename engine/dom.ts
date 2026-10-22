export function element<T extends Element>(id: string, constructor: { new (): T }): T {
  const node = document.getElementById(id);
  if (!(node instanceof constructor)) throw new Error(`Missing or invalid element #${id}`);
  return node;
}
export function control(id: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const node = document.getElementById(id);
  if (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement
  )
    return node;
  throw new Error(`Missing input #${id}`);
}
