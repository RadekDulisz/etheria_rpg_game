export const TEST_ACCOUNT_EMAILS = new Set([
  'test@gmail.com',
  'tester.max@example.com',
]);

export function isTestAccount(email?: string | null): boolean {
  return Boolean(email && TEST_ACCOUNT_EMAILS.has(email.trim().toLowerCase()));
}
