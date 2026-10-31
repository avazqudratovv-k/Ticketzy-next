/**
 * Refund policy of an event or order and the refund deadline. `getRefundDeadline` is a port of the backend's function of
 * the same name (ticketzy `libs/refund-policy.ts`, DECISIONS #129) and must give the same instant to the millisecond;
 * `yarn check:refund-deadline` runs the backend's own boundary cases against it.
 */
export type RefundPolicyType = 'REFUNDABLE' | 'NON_REFUNDABLE';

export interface RefundPolicy {
	policyType: RefundPolicyType;
	/** REFUNDABLE: 1 to 30; 0 for NON_REFUNDABLE */
	daysBefore: number;
}

export const DEFAULT_REFUND_DAYS = 1;
export const MAX_REFUND_DAYS = 30;
export const DEFAULT_REFUND_POLICY: RefundPolicy = { policyType: 'REFUNDABLE', daysBefore: DEFAULT_REFUND_DAYS };

/** An event or order saved before policies reads as refundable until the day before. */
export const readRefundPolicy = (source: { refundPolicy?: Partial<RefundPolicy> | null } | null | undefined): RefundPolicy => {
	const stored = source?.refundPolicy;
	if (!stored?.policyType) return { ...DEFAULT_REFUND_POLICY };
	if (stored.policyType === 'NON_REFUNDABLE') return { policyType: 'NON_REFUNDABLE', daysBefore: 0 };
	return { policyType: 'REFUNDABLE', daysBefore: stored.daysBefore ?? DEFAULT_REFUND_DAYS };
};

export const isNonRefundable = (source: { refundPolicy?: Partial<RefundPolicy> | null } | null | undefined): boolean =>
	readRefundPolicy(source).policyType === 'NON_REFUNDABLE';

/** Offset of `timeZone` from UTC at the instant `at`, in milliseconds. */
const getZoneOffsetMs = (at: Date, timeZone: string): number => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
	}).formatToParts(at);
	const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value);
	const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
	return asUtc - Math.floor(at.getTime() / 1000) * 1000;
};

/** The instant (UTC) at which the calendar day year-month-day starts in `timeZone`; two passes keep DST changes right. */
const getZonedDayStart = (year: number, month: number, day: number, timeZone: string): Date => {
	const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
	const first = guess - getZoneOffsetMs(new Date(guess), timeZone);
	const second = guess - getZoneOffsetMs(new Date(first), timeZone);
	return new Date(second);
};

/** The year, month and day of `at` as they are on the wall clock in `timeZone`. */
const getZonedDate = (at: Date, timeZone: string): { year: number; month: number; day: number } => {
	const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(at);
	const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value);
	return { year: get('year'), month: get('month'), day: get('day') };
};

/**
 * The last moment a buyer may still refund: the end of 23:59 on the day that is `daysBefore` days before the event starts
 * (1 = the day before), on the wall clock of the venue's timezone. Returned as a UTC instant.
 */
export const getRefundDeadline = (startAt: Date | string, venueTimezone: string, daysBefore: number = DEFAULT_REFUND_DAYS): Date => {
	const { year, month, day } = getZonedDate(new Date(startAt), venueTimezone);
	// the first moment of the day after the last refundable day; Date.UTC rolls a day below 1 into the month before
	const firstMomentAfter = getZonedDayStart(year, month, day - (Math.max(1, daysBefore) - 1), venueTimezone);
	return new Date(firstMomentAfter.getTime() - 1);
};

export const isBeforeRefundDeadline = (startAt: Date | string, venueTimezone: string, now: Date = new Date(), daysBefore: number = DEFAULT_REFUND_DAYS): boolean =>
	now.getTime() <= getRefundDeadline(startAt, venueTimezone, daysBefore).getTime();

/** What the buyer may do with an order or event, from its policy snapshot. */
export type RefundState =
	| { kind: 'NON_REFUNDABLE' }
	| { kind: 'OPEN'; deadline: Date; daysBefore: number }
	| { kind: 'CLOSED'; deadline: Date; daysBefore: number };

export const getRefundState = (
	source: { refundPolicy?: Partial<RefundPolicy> | null } | null | undefined,
	startAt: Date | string,
	venueTimezone: string,
	now: Date = new Date(),
): RefundState => {
	const policy = readRefundPolicy(source);
	if (policy.policyType === 'NON_REFUNDABLE') return { kind: 'NON_REFUNDABLE' };
	const deadline = getRefundDeadline(startAt, venueTimezone, policy.daysBefore);
	return { kind: now.getTime() <= deadline.getTime() ? 'OPEN' : 'CLOSED', deadline, daysBefore: policy.daysBefore };
};
