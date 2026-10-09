export const PAYOUT_STATUSES = ['NOT_YET_DUE', 'DUE', 'PAID_OUT', 'NOTHING_TO_PAY'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
export const isPayoutStatus = (value: string): value is PayoutStatus => (PAYOUT_STATUSES as readonly string[]).includes(value);

export const PAYOUTS_PAGE_SIZE = 10;
export const PAYOUT_NOTE_MAX = 300;

export interface PayoutRow {
	eventId: string;
	eventTitle: string;
	payoutDate: string;
	payoutStatus: PayoutStatus;
	gross: number;
	commission: number;
	net: number;
	orderCount: number;
	paidAt?: string | null;
	/** admin list only */
	organizerNick?: string | null;
	organizerEmail?: string | null;
	paidBy?: string | null;
	note?: string | null;
}

export interface PayoutTotals {
	totalPaidOut: number;
	totalDue: number;
	totalUpcoming: number;
}

/** Tone of the chip per status; the icon is chosen in PayoutStatusChip so the status never rests on colour alone */
export const PAYOUT_TONE: Record<PayoutStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
	NOT_YET_DUE: 'info',
	DUE: 'warning',
	PAID_OUT: 'success',
	NOTHING_TO_PAY: 'neutral',
};
