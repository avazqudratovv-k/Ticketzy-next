/**
 * The commission an organizer is on (backend DECISIONS #47, `libs/commission.ts`): an admin override wins while it has no
 * end date or the end date is in the future; otherwise 10 percent, 7 percent from 5 completed events and 5 percent from 20
 * (a count of exactly 5 or 20 already gets the lower rate).
 */
export const COMMISSION_TIERS = [
	{ from: 0, rate: 10 },
	{ from: 5, rate: 7 },
	{ from: 20, rate: 5 },
] as const;

export interface CommissionOverride {
	rate: number;
	endsAt?: string | null;
	reason?: string | null;
}

export const automaticRate = (completedEvents: number) => [...COMMISSION_TIERS].reverse().find((tier) => completedEvents >= tier.from)?.rate ?? COMMISSION_TIERS[0].rate;

export interface CommissionState {
	/** the rate that applies to new sales now */
	rate: number;
	/** the rate by completed events, ignoring any override */
	automatic: number;
	overrideActive: boolean;
	override: CommissionOverride | null;
	/** index in COMMISSION_TIERS of the automatic tier */
	tierIndex: number;
	next: { rate: number; from: number; remaining: number } | null;
}

export function commissionState(completedEvents: number, override?: CommissionOverride | null, now = Date.now()): CommissionState {
	const tierIndex = COMMISSION_TIERS.reduce((found, tier, index) => (completedEvents >= tier.from ? index : found), 0);
	const upcoming = COMMISSION_TIERS[tierIndex + 1];
	const active = Boolean(override && (!override.endsAt || new Date(override.endsAt).getTime() > now));
	return {
		rate: active && override ? override.rate : COMMISSION_TIERS[tierIndex].rate,
		automatic: COMMISSION_TIERS[tierIndex].rate,
		overrideActive: active,
		override: override ?? null,
		tierIndex,
		next: upcoming ? { rate: upcoming.rate, from: upcoming.from, remaining: upcoming.from - completedEvents } : null,
	};
}
