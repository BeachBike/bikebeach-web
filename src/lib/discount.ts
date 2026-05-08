/// Helpers for the C3 time-windowed discount campaign.
///
/// A discount is "active" right now when:
///   - all 3 fields (percent, startsAt, endsAt) are present
///   - `now` lies in [startsAt, endsAt]

export interface DiscountCampaign {
  discountPercent: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
}

export interface ResolvedDiscount {
  percent: number;
  startsAt: Date;
  endsAt: Date;
  /// `priceCents` after applying the campaign discount.
  discountedCents: number;
  /// Cents shaved off the original price.
  savingsCents: number;
}

/// Returns the resolved campaign when the discount is currently active for
/// the given price; `null` otherwise (no campaign, malformed, or outside
/// the window).
export function resolveDiscount(
  priceCents: number,
  c: DiscountCampaign,
  now: Date = new Date(),
): ResolvedDiscount | null {
  if (c.discountPercent == null) return null;
  if (!c.discountStartsAt || !c.discountEndsAt) return null;
  const startsAt = new Date(c.discountStartsAt);
  const endsAt = new Date(c.discountEndsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return null;
  }
  if (now < startsAt || now > endsAt) return null;
  const percent = Math.max(0, Math.min(100, c.discountPercent));
  const savingsCents = Math.round((priceCents * percent) / 100);
  return {
    percent,
    startsAt,
    endsAt,
    discountedCents: Math.max(0, priceCents - savingsCents),
    savingsCents,
  };
}

/// Returns the campaign when configured (regardless of window) — for the
/// admin drawer preview which should show the discount even if it hasn't
/// started yet.
export function previewDiscount(
  priceCents: number,
  c: DiscountCampaign,
): ResolvedDiscount | null {
  if (c.discountPercent == null) return null;
  if (!c.discountStartsAt || !c.discountEndsAt) return null;
  const startsAt = new Date(c.discountStartsAt);
  const endsAt = new Date(c.discountEndsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return null;
  }
  const percent = Math.max(0, Math.min(100, c.discountPercent));
  const savingsCents = Math.round((priceCents * percent) / 100);
  return {
    percent,
    startsAt,
    endsAt,
    discountedCents: Math.max(0, priceCents - savingsCents),
    savingsCents,
  };
}

/// Format `Date → "DD/MM"`. Used in badges like "−10% até 30/05".
export function shortDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
