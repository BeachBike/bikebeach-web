/// System-wide constants kept in sync with the backend.

/// PIX discount applied to one-off pack purchases (whole percent).
/// Matches `PIX_DISCOUNT_PERCENT` in `api/src/common/constants.ts`. Promoted
/// from `Unit.pixDiscountPercent` to a global constant in 2026-05.
export const PIX_DISCOUNT_PERCENT = 5;

/// Late check-in tolerance for the user-facing flow (minutes after class
/// start). Matches the `Unit.lateCheckinToleranceMinutes` default — kept
/// hidden from the admin form.
export const LATE_CHECKIN_TOLERANCE_MINUTES = 5;
