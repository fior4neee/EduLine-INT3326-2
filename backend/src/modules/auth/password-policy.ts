// Password rules: 8–32 characters, at least 1 uppercase letter, 1 number,
// and 1 special (non-alphanumeric) character.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 32;

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,32}$/;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be 8–32 characters and include an uppercase letter, a number, and a special character.';

export function passwordPolicyViolations(password: string): string[] {
  const violations: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) violations.push('min_length');
  if (password.length > PASSWORD_MAX_LENGTH) violations.push('max_length');
  if (!/[A-Z]/.test(password)) violations.push('uppercase');
  if (!/\d/.test(password)) violations.push('number');
  if (!/[^A-Za-z0-9]/.test(password)) violations.push('special');
  return violations;
}
