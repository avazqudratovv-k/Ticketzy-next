import { EventItem } from './event';

/** The fields of an event the assistant card shows (the ASK_ASSISTANT selection). */
export type AssistantEvent = Pick<
	EventItem,
	'_id' | 'eventCategory' | 'eventTitle' | 'eventTranslations' | 'eventImages' | 'eventMinPrice' | 'startAt' | 'endAt' | 'venueData'
>;

export interface AssistantMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	/** Only on assistant messages: the events the answer is based on, for cards. */
	events?: AssistantEvent[];
}

/** What went wrong, as the UI words it (libs/assistant/errors.ts maps the backend's messages to these). */
export type AssistantErrorKind =
	| 'unavailable'
	| 'rateLimit'
	| 'quotaExhausted'
	| 'dailyCap'
	| 'busy'
	| 'failed'
	| 'timeout'
	| 'invalid'
	| 'notAllowed'
	| 'network';
