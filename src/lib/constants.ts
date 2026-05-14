/// System-wide constants kept in sync with the backend.

/// PIX discount applied to one-off pack purchases (whole percent).
/// Matches `PIX_DISCOUNT_PERCENT` in `api/src/common/constants.ts`. Promoted
/// from `Unit.pixDiscountPercent` to a global constant in 2026-05.
export const PIX_DISCOUNT_PERCENT = 5;

/// Late check-in tolerance for the user-facing flow (minutes after class
/// start). Matches the `Unit.lateCheckinToleranceMinutes` default — kept
/// hidden from the admin form.
export const LATE_CHECKIN_TOLERANCE_MINUTES = 5;

/// Credit-card installment policy. Must match the backend constants in
/// `api/src/common/constants.ts` so the financed total the UI quotes
/// before submit is exactly what the backend charges. `CARD_INSTALLMENT_FREE_LIMIT`
/// = max parcelas sem juros; above that the customer pays
/// `CARD_MONTHLY_INTEREST` compounded.
export const CARD_INSTALLMENT_FREE_LIMIT = 3;
export const CARD_MONTHLY_INTEREST = 0.0299;

/// Mirror of the backend `computeFinancedTotalCents`. Lives client-side so
/// the installment dropdown can show the exact value the user will be
/// charged. Sem juros até `CARD_INSTALLMENT_FREE_LIMIT`; compound monthly
/// above that. Round to whole cents to match the backend.
export function computeFinancedTotalCents(
  cashCents: number,
  installments: number,
): number {
  if (installments <= CARD_INSTALLMENT_FREE_LIMIT) return cashCents;
  // Only apply interest for installments AFTER the free limit (4+).
  // For 4x: 1 month of interest; for 5x: 2 months; for 6x: 3 months.
  const monthsWithInterest = installments - CARD_INSTALLMENT_FREE_LIMIT;
  const factor = Math.pow(1 + CARD_MONTHLY_INTEREST, monthsWithInterest);
  return Math.round(cashCents * factor);
}
