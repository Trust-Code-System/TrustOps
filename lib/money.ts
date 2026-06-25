/**
 * Money helpers.
 *
 * NON-NEGOTIABLE: money is stored and computed as integer minor units (kobo).
 * 100 kobo = ₦1. We never use floats for money math. Naira is only ever
 * reconstructed at display time. A `Kobo` is a branded integer to make it hard
 * to accidentally pass a naira float where kobo is expected.
 */

export type Kobo = number & { readonly __brand: "Kobo" };

const KOBO_PER_NAIRA = 100;

/** Assert a value is a safe, non-negative-capable integer count of kobo. */
export function asKobo(value: number): Kobo {
  if (!Number.isInteger(value)) {
    throw new Error(`Money must be an integer number of kobo, got ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Money value out of safe integer range: ${value}`);
  }
  return value as Kobo;
}

/**
 * Parse a user-entered naira string/number into integer kobo.
 * Accepts "2,480.50", "2480.5", 2480.5. Rounds to the nearest kobo so that
 * float artefacts (e.g. 2480.1 * 100 = 248009.9999) never leak in.
 */
export function nairaToKobo(input: string | number): Kobo {
  const naira =
    typeof input === "number"
      ? input
      : Number(String(input).replace(/[,\s₦]/g, ""));
  if (!Number.isFinite(naira)) {
    throw new Error(`Invalid naira amount: ${String(input)}`);
  }
  return asKobo(Math.round(naira * KOBO_PER_NAIRA));
}

/** Convert kobo to a naira number (display/formatting only — never for math). */
export function koboToNaira(kobo: Kobo | number): number {
  return kobo / KOBO_PER_NAIRA;
}

/**
 * Format kobo as a ₦ string with thousands separators and 2 decimals.
 * e.g. 248000000 -> "₦2,480,000.00".
 */
export function formatNaira(
  kobo: Kobo | number,
  opts: { withSymbol?: boolean } = {},
): string {
  const { withSymbol = true } = opts;
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(koboToNaira(kobo));
  return withSymbol ? `₦${formatted}` : formatted;
}

/** Sum a list of kobo amounts, staying in integer space. */
export function sumKobo(amounts: Array<Kobo | number>): Kobo {
  return asKobo(amounts.reduce((acc, n) => acc + n, 0));
}

/** quantity * unitPrice, both integers, result in kobo. */
export function lineTotal(quantity: number, unitPriceKobo: Kobo | number): Kobo {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Quantity must be a positive integer, got ${quantity}`);
  }
  return asKobo(quantity * unitPriceKobo);
}
