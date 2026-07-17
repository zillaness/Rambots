/** Join truthy class names into a single className string. */
export function cx(...parts: unknown[]): string {
  return parts.filter(Boolean).join(' ');
}
