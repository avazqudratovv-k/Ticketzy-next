import { ApiError, NETWORK_ERROR, parseApiError, serviceUnavailableKey } from '../errors';
import { TFunction } from 'next-i18next';
import { aiCause, AiCause } from '../aiErrors';
import { bookedParams, parseVenueBooked, VenueBooked } from '../venueConflict';

/**
 * Server messages (backend libs/enums/common.enum.ts) shown translated. Keys are in organizer.json under `serverErrors`.
 * Anything not listed is shown as the server sent it.
 */
const KNOWN: Record<string, string> = {
	'This event cannot be edited in its current status!': 'notEditable',
	'This event status change is not allowed from the current status!': 'badTransition',
	'The event needs a title before it can be submitted!': 'submitTitle',
	'The event needs at least one image before it can be submitted!': 'submitImage',
	'The event start and end dates must be in the future to submit it!': 'submitDates',
	'The event needs an active venue before it can be submitted!': 'submitVenue',
	'The event needs at least one ticket type before it can be submitted!': 'submitTicketType',
	'A reserved-seating event needs a venue with a seated section before it can be submitted!': 'submitLayout',
	'Every seated section needs a ticket type with a matching tier key!': 'tierMissing',
	'Only one ticket type of an event can use a tier key!': 'tierDuplicate',
	'A ticket type of a reserved-seating event needs a tier key that matches a seated section!': 'tierKeyRequired',
	'The quantity of a reserved-seating ticket type is computed from its seats and cannot be set!': 'quantityFromSeats',
	'A total quantity is required for this ticket type!': 'quantityRequired',
	'The tier key cannot change after the seats of the event were generated!': 'tierLocked',
	'Your organizer account is waiting for admin approval!': 'notApproved',
	'Not Allowed Request!': 'notAllowed',
	'A reason is required to cancel an event!': 'cancelReasonRequired',
	'This event is already cancelled or ended!': 'alreadyClosed',
	'Update failed!': 'updateFailed',
	'Create failed!': 'createFailed',
	'The service is temporarily unavailable, please try again in a moment!': 'serviceUnavailable',
	'This value is already in use!': 'duplicate',
	'Bad Request': 'badRequest',
	'No data found!': 'noData',
	'Please provide jpg, jpeg or png images!': 'imageFormat',
	'Upload failed!': 'uploadFailed',
	'You are not authenticated, please login first!': 'notAuthenticated',
	'Your account was not verified. Please contact support.': 'notVerified',
	'The venue layout is not valid!': 'layoutInvalid',
	'The venue layout needs at least one section!': 'layoutNoSections',
	'Section keys in a venue layout must be unique!': 'layoutDuplicateKey',
	'Rows and seats per row must be whole numbers between 1 and 100!': 'layoutBadGrid',
	'A standing section needs a capacity of at least 1!': 'layoutCapacity',
	'A seated section needs a tier key!': 'layoutTier',
	'The venue timezone must be a valid IANA timezone!': 'badTimezone',
	'The layout of this venue cannot change because an event that uses it already has seats!': 'layoutLocked',
	'The ticket sales start must be before the ticket sales end!': 'saleStartBeforeEnd',
	'The ticket sales must end no later than the event end!': 'saleEndAfterEventEnd',
	'The ticket sales must start before the event ends!': 'saleStartAfterEventEnd',
	'This event has ended, so tickets can no longer be bought!': 'eventEnded',
	'Ticket sales for this event have not started yet!': 'salesNotStarted',
	'Ticket sales for this event are closed!': 'salesClosed',
};

/** Shared AI cause (libs/aiErrors.ts) to the key under `ai.errors.` in organizer.json. */
const AI_KEYS: Partial<Record<AiCause, string>> = {
	disabled: 'disabled',
	notConfigured: 'disabled',
	rateLimited: 'rateLimited',
	dailyCap: 'dailyCap',
	quotaExhausted: 'quotaExhausted',
	failed: 'failed',
	busy: 'busy',
	timeout: 'busy',
	invalid: 'invalid',
	locales: 'locales',
};

export interface Described {
	/** key under `serverErrors.` or `ai.errors.`, when the message is known */
	key?: string;
	network: boolean;
	/** the server's own words (class-validator sends a list), for unknown messages */
	raw: string;
	code: string;
	/** set for the venue double-booking refusal (key `venueBooked`): the parts of its text */
	booked?: VenueBooked;
}

const flat = (message: unknown): string => (Array.isArray(message) ? message.join(' ') : String(message ?? ''));

export function describeError(err: unknown, kind: 'server' | 'ai' = 'server'): Described {
	const parsed: ApiError = parseApiError(err);
	const raw = flat(parsed.message);
	const booked = kind === 'server' ? parseVenueBooked(raw) : null;
	if (booked) return { key: 'venueBooked', network: false, raw, code: parsed.code, booked };
	const cause = kind === 'ai' ? aiCause({ ...parsed, message: raw }) : undefined;
	const key = kind === 'ai' ? (cause ? AI_KEYS[cause] : undefined) : KNOWN[raw] ?? serviceUnavailableKey(parsed.code);
	return { key, network: parsed.code === NETWORK_ERROR, raw, code: parsed.code };
}

/** The sentence for a described error (organizer namespace): network, known (with the double-booking parts filled in), or the server's own words. */
export const describedText = (t: TFunction, error: Described, locale?: string): string =>
	error.network
		? t('errors.network')
		: error.booked
		? t('serverErrors.venueBooked', bookedParams(error.booked, locale))
		: error.key
		? t(`serverErrors.${error.key}`)
		: error.raw || t('errors.generic');
