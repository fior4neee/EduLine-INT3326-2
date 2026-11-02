// Same rules as backend/src/modules/auth/password-policy.ts. Keep the two in sync.

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,32}$/;

export const PASSWORD_RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: "8–32 ký tự", test: (p) => p.length >= 8 && p.length <= 32 },
  { label: "1 chữ in hoa", test: (p) => /[A-Z]/.test(p) },
  { label: "1 chữ số", test: (p) => /\d/.test(p) },
  { label: "1 ký tự đặc biệt", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;
