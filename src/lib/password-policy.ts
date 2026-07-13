/// Client mirror of the backend password policy (`api/src/common/
/// password-policy.ts`, "Forte equilibrada"). The API is authoritative — this
/// exists so the user gets live, specific feedback instead of a round-trip
/// 400. Keep these in lockstep with the backend.
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 72;
export const MIN_PASSWORD_CLASSES = 3;

/// Small subset of the backend blocklist — enough to warn on the obvious
/// ones live. The backend holds the full list and is the real gate, so we
/// only *warn* here (never hard-block on "comum").
const COMMON_HINTS = new Set<string>([
  'password',
  'password1',
  'password123',
  'password1!',
  'passw0rd',
  'p@ssw0rd',
  'qwerty123',
  'senha@123',
  'senha12345',
  'senha123456',
  'mudar@123',
  'bemvindo123',
  'brasil123',
  'admin@123',
  'bikebeach123',
  'bikebeach@123',
]);

export interface PasswordContext {
  email?: string;
  name?: string;
}

export function passwordClasses(pwd: string): {
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
} {
  return {
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    digit: /[0-9]/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
}

export function isIdentityPassword(pwd: string, ctx: PasswordContext): boolean {
  const lower = pwd.trim().toLowerCase();
  if (!lower) return false;
  const cands: string[] = [];
  if (ctx.email) {
    const email = ctx.email.trim().toLowerCase();
    cands.push(email);
    const local = email.split('@')[0];
    if (local) cands.push(local);
  }
  if (ctx.name) {
    const name = ctx.name.trim().toLowerCase();
    cands.push(name, name.replace(/\s+/g, ''));
  }
  return cands.some((c) => c.length >= 3 && c === lower);
}

export function isCommonPassword(pwd: string): boolean {
  return COMMON_HINTS.has(pwd.trim().toLowerCase());
}

/// First blocking reason the password fails the policy, or `null` if it
/// passes the deterministic rules (length, class variety, identity). The
/// common-password check is left to the backend, so this never blocks on it.
/// Messages are plain, everyday pt-BR — no jargon.
export function passwordPolicyIssue(
  pwd: string,
  ctx: PasswordContext = {},
): string | null {
  if (pwd.length < MIN_PASSWORD_LENGTH)
    return `use no mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
  if (pwd.length > MAX_PASSWORD_LENGTH)
    return `use no máximo ${MAX_PASSWORD_LENGTH} caracteres`;
  const c = passwordClasses(pwd);
  const count = [c.lower, c.upper, c.digit, c.symbol].filter(Boolean).length;
  if (count < MIN_PASSWORD_CLASSES)
    return `misture pelo menos ${MIN_PASSWORD_CLASSES} tipos: letra minúscula, LETRA maiúscula, número e símbolo`;
  if (isIdentityPassword(pwd, ctx))
    return 'a senha não pode ser o seu e-mail ou nome';
  return null;
}
