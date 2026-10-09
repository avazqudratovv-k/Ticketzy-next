import { ApolloError } from '@apollo/client';
import { ApiError, NETWORK_ERROR, parseApiError } from '../errors';
import { parseVenueBooked, VenueBooked } from '../venueConflict';

/**
 * Server messages (backend libs/enums/common.enum.ts) shown translated. Keys are under `serverErrors` in admin.json.
 * Anything not listed is shown as the server sent it.
 */
const KNOWN: Record<string, string> = {
	'This event status change is not allowed from the current status!': 'eventTransition',
	'This organizer status change is not allowed from the current status!': 'organizerTransition',
	'Organizers cannot approve their own events!': 'ownEvent',
	'A reason is required to reject an event!': 'eventRejectReason',
	'A reason is required to cancel an event!': 'eventCancelReason',
	'A reason is required to reject an organizer!': 'organizerRejectReason',
	'A reason is required to suspend an organizer!': 'organizerSuspendReason',
	'A reason is required to set a commission override!': 'commissionReason',
	'The commission rate must be between 0 and 100!': 'commissionRate',
	'The commission override end date must be in the future!': 'commissionEnd',
	'A reason is required to clear a commission override!': 'commissionClearReason',
	'This organizer has no commission override to clear!': 'noOverride',
	'The start date must not be after the end date!': 'dateRange',
	'Admins cannot change their own status or role!': 'ownAccess',
	'The status and role of an admin account cannot be changed!': 'adminAccess',
	'The admin role cannot be assigned through the API, admin accounts are created only by the server seed!': 'assignAdmin',
	'No organizer found!': 'noOrganizer',
	'Organizer status and role are changed with the organizer operations, not with updateMemberByAdmin!': 'useOrganizerOperations',
	'This event is already cancelled or ended!': 'eventClosed',
	'Only the orders of a cancelled event can be refunded this way!': 'notCancelled',
	'The venue layout is not valid!': 'layoutInvalid',
	'Every seated section needs a ticket type with a matching tier key!': 'tierMissing',
	'Only one ticket type of an event can use a tier key!': 'tierDuplicate',
	'A reserved-seating event needs a venue with a seated section before it can be submitted!': 'needsLayout',
	'The seats of this event could not be generated, nothing was changed!': 'seatGeneration',
	'This event cannot be edited in its current status!': 'notEditable',
	'This event has already been paid out!': 'payoutAlreadyPaid',
	'The payout date of this event has not been reached yet!': 'payoutNotDue',
	'There is nothing to pay out for this event!': 'payoutNothing',
	'No event found for this payout!': 'payoutNoEvent',
	'The start of the payout date range must not be after its end!': 'payoutDateRange',
	'No data found!': 'noData',
	'Update failed!': 'updateFailed',
	'Not Allowed Request!': 'notAllowed',
	'Allowed only for members with specific role': 'notAllowed',
	'You are not authenticated, please login first!': 'notAuthenticated',
	'Bad Request': 'badRequest',
	'Something went wrong!': 'generic',
};

/** AI check failures (backend `AI_*` messages). The check is advisory, so none of these block a decision. */
const AI: Record<string, string> = {
	'AI features are turned off on this server.': 'disabled',
	'AI features are enabled but not configured on this server.': 'notConfigured',
	'You are using the AI features too fast, please try again in a minute!': 'rateLimited',
	'The AI service could not answer right now, please try again later!': 'failed',
	'The AI is busy right now, please try again in a moment.': 'busy',
	'The AI service took too long to answer, please try again later!': 'timeout',
	'The AI service returned an answer that could not be used!': 'invalid',
	'The AI check did not run for this event.': 'notChecked',
};

export interface AdminError {
	key?: string;
	network: boolean;
	raw: string;
	code: string;
	/** set for the venue double-booking refusal (key `venueBooked`) */
	booked?: VenueBooked;
}

const flat = (message: unknown): string => (Array.isArray(message) ? message.join(' ') : String(message ?? ''));

export function describeAdminError(err: unknown, kind: 'server' | 'ai' = 'server'): AdminError {
	const parsed: ApiError = parseApiError(err);
	const raw = flat(parsed.message);
	const booked = kind === 'server' ? parseVenueBooked(raw) : null;
	if (booked) return { key: 'venueBooked', network: false, raw, code: parsed.code, booked };
	return { key: (kind === 'ai' ? AI : KNOWN)[raw], network: parsed.code === NETWORK_ERROR, raw, code: parsed.code };
}

/** The AI message stored on an event when the check did not run (`eventModeration.reason`) is one of the AI messages. */
export const aiKeyOf = (message?: string | null): string | undefined => (message ? AI[message] : undefined);

/**
 * `getEventsByAdmin` answers "No data found!" for an empty list (and for a page past the end). That is an empty result, not a failure.
 */
export function isOnlyNoData(error: ApolloError | undefined): boolean {
	if (!error) return false;
	const list = error.graphQLErrors ?? [];
	return !error.networkError && list.length > 0 && list.every((e) => e.message === 'No data found!');
}
