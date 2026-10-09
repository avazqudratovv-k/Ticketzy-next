import { CommissionOverride } from './types';

/**
 * Platform commission rates in percent. They mirror the backend (libs/commission.ts, DECISIONS #47): 10 base, 7 from 5 completed
 * events, 5 from 20. The server computes the real rate when an order is priced; this copy only explains it on screen.
 */
export const BASE_COMMISSION_RATE = 10;
export const COMMISSION_TIERS = [
	{ minCompletedEvents: 20, rate: 5 },
	{ minCompletedEvents: 5, rate: 7 },
	{ minCompletedEvents: 0, rate: BASE_COMMISSION_RATE },
] as const;

export type TierId = 'base' | 'tier2' | 'tier3';

export const tierRate = (completed: number): number => COMMISSION_TIERS.find((tier) => completed >= tier.minCompletedEvents)?.rate ?? BASE_COMMISSION_RATE;
export const tierIdOf = (completed: number): TierId => (completed >= 20 ? 'tier3' : completed >= 5 ? 'tier2' : 'base');

/** An override wins while it has no end date or the end date is in the future (same rule as the backend). */
export const overrideActive = (override: CommissionOverride | null | undefined, now = Date.now()): boolean =>
	Boolean(override && typeof override.rate === 'number' && (!override.endsAt || new Date(override.endsAt).getTime() > now));

export type RateSource = 'override' | 'tier';

export function effectiveRate(member: { completedEvents?: number; commissionOverride?: CommissionOverride | null }, now = Date.now()): { rate: number; source: RateSource } {
	if (member.commissionOverride && overrideActive(member.commissionOverride, now)) return { rate: member.commissionOverride.rate, source: 'override' };
	return { rate: tierRate(member.completedEvents ?? 0), source: 'tier' };
}

/** The backend accepts 0 to 100 (INVALID_COMMISSION_RATE). Up to two decimals are shown and sent. */
export function parseRate(text: string): { ok: true; value: number } | { ok: false; error: 'empty' | 'range' } {
	const cleaned = text.trim().replace(',', '.');
	if (!cleaned) return { ok: false, error: 'empty' };
	const value = Number(cleaned);
	if (!Number.isFinite(value) || value < 0 || value > 100) return { ok: false, error: 'range' };
	return { ok: true, value: Math.round(value * 100) / 100 };
}
