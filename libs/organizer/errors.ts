import { ApiError, NETWORK_ERROR, parseApiError } from '../errors';

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
	'Update failed!': 'updateFailed',
	'Create failed!': 'createFailed',
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

const AI: Record<string, string> = {
	'AI features are turned off on this server.': 'disabled',
	'AI features are enabled but not configured on this server.': 'disabled',
	'You are using the AI features too fast, please try again in a minute!': 'rateLimited',
	'The AI service could not answer right now, please try again later!': 'failed',
	'The AI is busy right now, please try again in a moment.': 'busy',
	'The AI service took too long to answer, please try again later!': 'busy',
	'The AI service returned an answer that could not be used!': 'invalid',
	'Choose at least one target language (en, ko, ru, uz)!': 'locales',
};

export interface Described {
	/** key under `serverErrors.` or `ai.errors.`, when the message is known */
	key?: string;
	network: boolean;
	/** the server's own words (class-validator sends a list), for unknown messages */
	raw: string;
	code: string;
}

const flat = (message: unknown): string => (Array.isArray(message) ? message.join(' ') : String(message ?? ''));

export function describeError(err: unknown, kind: 'server' | 'ai' = 'server'): Described {
	const parsed: ApiError = parseApiError(err);
	const raw = flat(parsed.message);
	const table = kind === 'ai' ? AI : KNOWN;
	return { key: table[raw], network: parsed.code === NETWORK_ERROR, raw, code: parsed.code };
}
