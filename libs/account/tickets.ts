import { AccountEvent, AccountTicket, TicketStatus } from '../types/account';

/** What a ticket card says. EXPIRED is a label for a still-VALID ticket whose event is over; the server never sets it. */
export type TicketState = 'valid' | 'used' | 'refunded' | 'cancelled' | 'expired';

export const eventIsOver = (event?: Pick<AccountEvent, 'eventStatus' | 'endAt'> | null): boolean =>
	Boolean(event) && (event!.eventStatus === 'ENDED' || new Date(event!.endAt).getTime() <= Date.now());

export function ticketState(ticket: Pick<AccountTicket, 'ticketStatus' | 'eventData'>): TicketState {
	const status: TicketStatus = ticket.ticketStatus;
	if (status === 'USED') return 'used';
	if (status === 'REFUNDED') return 'refunded';
	if (status === 'CANCELLED') return 'cancelled';
	return eventIsOver(ticket.eventData) ? 'expired' : 'valid';
}

export const TICKET_BADGE: Record<TicketState, 'success' | 'neutral' | 'info' | 'danger'> = {
	valid: 'success',
	used: 'neutral',
	refunded: 'info',
	cancelled: 'danger',
	expired: 'neutral',
};
