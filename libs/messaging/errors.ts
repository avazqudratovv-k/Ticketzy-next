import { ApiError, NETWORK_ERROR, parseApiError, serviceUnavailableKey } from '../errors';

/** Server messages (backend libs/enums/common.enum.ts) shown translated. Keys are under `serverErrors` in messages.json. */
const KNOWN: Record<string, string> = {
	'You are not allowed to use this conversation!': 'notAllowed',
	'Your account can only use the support conversation!': 'supportOnly',
	'You can only start a conversation about your own event!': 'eventNotYours',
	'Only organizers can start a conversation!': 'organizersOnly',
	'An admin can only start a conversation with an organizer!': 'adminOrganizersOnly',
	'The message cannot be empty!': 'empty',
	'A message can have at most 2000 characters!': 'tooLong',
	'You are sending messages too fast, please slow down!': 'tooFast',
	'No data found!': 'noData',
	'You are not authenticated, please login first!': 'notAuthenticated',
	'Allowed only for members with specific role': 'notAllowed',
	'Not Allowed Request!': 'notAllowed',
	'Something went wrong!': 'generic',
};

export interface MessagingError {
	key?: string;
	network: boolean;
	raw: string;
	code: string;
}

export function describeMessagingError(err: unknown): MessagingError {
	const parsed: ApiError = parseApiError(err);
	const raw = Array.isArray(parsed.message) ? (parsed.message as string[]).join(' ') : String(parsed.message ?? '');
	return { key: KNOWN[raw] ?? serviceUnavailableKey(parsed.code), network: parsed.code === NETWORK_ERROR, raw, code: parsed.code };
}
