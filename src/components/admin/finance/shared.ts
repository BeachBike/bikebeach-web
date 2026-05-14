import type { CreditSource, PaymentMethodCode } from '@/api/admin';

/// Colors + labels used everywhere in the financeiro tab AND in the PDF
/// renderer. The PDF can't read CSS variables, so we expose hex values
/// here too (mirrors `--color-*` in index.css).

export const SOURCE_LABEL: Record<CreditSource, string> = {
  PURCHASE_PACK: 'pacotes / avulsas',
  SUBSCRIPTION_CYCLE: 'mensalistas',
  ADMIN_GRANT: 'cortesias',
  REFUND: 'estornos',
  TRANSFER: 'transferências',
};

export const SOURCE_COLOR_CSS: Record<CreditSource, string> = {
  PURCHASE_PACK: 'var(--color-clay)',
  SUBSCRIPTION_CYCLE: 'var(--color-sea)',
  ADMIN_GRANT: 'var(--color-sand-2)',
  REFUND: 'var(--color-ink-3)',
  TRANSFER: 'var(--color-sun)',
};

export const SOURCE_COLOR_HEX: Record<CreditSource, string> = {
  PURCHASE_PACK: '#d85d34',
  SUBSCRIPTION_CYCLE: '#2d6a6a',
  ADMIN_GRANT: '#cdb888',
  REFUND: '#6e614f',
  TRANSFER: '#f2a65a',
};

export const METHOD_COLOR_CSS: Record<PaymentMethodCode, string> = {
  PIX: 'var(--color-sea)',
  CREDIT_CARD: 'var(--color-clay)',
  DEBIT_CARD: 'var(--color-sun)',
};

export const METHOD_COLOR_HEX: Record<PaymentMethodCode, string> = {
  PIX: '#2d6a6a',
  CREDIT_CARD: '#d85d34',
  DEBIT_CARD: '#f2a65a',
};

/// Brand palette as hex so the PDF document can reference it directly.
export const BRAND_HEX = {
  cream: '#f6efe2',
  cream2: '#ece2cd',
  sand: '#dcc9a1',
  sand2: '#cdb888',
  clay: '#d85d34',
  clayD: '#b5431f',
  sun: '#f2a65a',
  sea: '#2d6a6a',
  ink: '#221c16',
  ink2: '#4a3f35',
  ink3: '#6e614f',
} as const;
