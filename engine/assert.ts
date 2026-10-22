/** Read a value whose existence is required by a validated scene or algorithm invariant. */
export function required<T>(value: T | null | undefined, context = 'Required value is missing'): T {
  if (value === undefined || value === null) throw new Error(context);
  return value;
}
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`);
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
export function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
