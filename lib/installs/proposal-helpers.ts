/**
 * Generate a URL-safe share token for public proposal links.
 * Uses crypto.randomUUID + base36 encoding for a short, unique token.
 */
export function generateShareToken(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  // Take first 16 hex chars and convert to base36 for shorter URL
  const num = BigInt('0x' + uuid.slice(0, 16));
  return num.toString(36);
}

/**
 * Calculate monthly financing payment (standard amortization formula).
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateFinancingMonthly(
  principal: number,
  annualApr: number,
  termMonths: number,
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualApr <= 0) return Math.round((principal / termMonths) * 100) / 100;

  const monthlyRate = annualApr / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const payment = principal * (monthlyRate * factor) / (factor - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Format a currency value for display.
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format a date for proposal display.
 */
export function formatProposalDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate estimated annual energy savings between old and new SEER.
 * Based on average 2000 cooling hours/year and $0.13/kWh.
 */
export function estimateAnnualSavings(
  tonnage: number,
  oldSeer: number,
  newSeer: number,
  costPerKwh: number = 0.13,
  coolingHoursPerYear: number = 2000,
): number {
  if (oldSeer <= 0 || newSeer <= 0 || tonnage <= 0) return 0;
  const btuPerHour = tonnage * 12000;
  const oldKwh = (btuPerHour / (oldSeer * 1000)) * coolingHoursPerYear;
  const newKwh = (btuPerHour / (newSeer * 1000)) * coolingHoursPerYear;
  const savings = (oldKwh - newKwh) * costPerKwh;
  return Math.max(0, Math.round(savings));
}
