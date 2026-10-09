import { makeVar } from '@apollo/client';
import { initializeApollo } from '../../apollo/client';
import { ASK_ASSISTANT } from '../../apollo/user/mutation';
import { AssistantErrorKind, AssistantEvent, AssistantMessage } from '../types/assistant';
import { toEventLocale } from '../events';
import { ASSISTANT_CLIENT_TIMEOUT_MS, ASSISTANT_MAX_HISTORY, ASSISTANT_MAX_MESSAGE_LENGTH, assistantErrorKind, TIMEOUT_CODE } from './errors';

const STORAGE_KEY = 'ticketzy-assistant';

export interface AssistantState {
	/** Member id, or `guest`. A chat belongs to one identity and is dropped when it changes (logout, another login). */
	owner: string | null;
	messages: AssistantMessage[];
	pending: boolean;
	/** When the open request started, for the "taking a while" note. */
	pendingSince: number | null;
	error: AssistantErrorKind | null;
	open: boolean;
}

const EMPTY: AssistantState = { owner: null, messages: [], pending: false, pendingSince: null, error: null, open: false };

/** Only the conversation is kept for the session (sessionStorage); a request in flight, an error and the open state are not. */
const load = (): AssistantState => {
	if (typeof window === 'undefined') return EMPTY;
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return EMPTY;
		const data = JSON.parse(raw) as { owner?: unknown; messages?: unknown };
		if (typeof data.owner !== 'string' || !Array.isArray(data.messages)) return EMPTY;
		const messages = data.messages.filter(
			(m): m is AssistantMessage =>
				m && (m.role === 'user' || m.role === 'assistant') && typeof m.id === 'string' && typeof m.content === 'string',
		);
		return { ...EMPTY, owner: data.owner, messages };
	} catch {
		return EMPTY;
	}
};

const save = (state: AssistantState) => {
	try {
		if (!state.messages.length) sessionStorage.removeItem(STORAGE_KEY);
		else sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ owner: state.owner, messages: state.messages }));
	} catch {
		// private mode or full storage: the chat then lives in memory only
	}
};

export const assistantVar = makeVar<AssistantState>(EMPTY);

let hydrated = false;
/** Reads the stored chat once on the client (not at import, so server and first client render agree). */
export function hydrateAssistant() {
	if (hydrated || typeof window === 'undefined') return;
	hydrated = true;
	assistantVar(load());
}

const update = (patch: Partial<AssistantState>) => {
	const next = { ...assistantVar(), ...patch };
	assistantVar(next);
	if ('messages' in patch || 'owner' in patch) save(next);
};

let requestId = 0;
let controller: AbortController | null = null;

const abortRequest = () => {
	requestId += 1;
	controller?.abort();
	controller = null;
};

export const setAssistantOpen = (open: boolean) => update({ open });

/** "New chat", logout and a change of member all end up here. */
export function resetAssistant(owner: string | null = assistantVar().owner) {
	abortRequest();
	update({ owner, messages: [], pending: false, pendingSince: null, error: null });
}

/** Called with the signed-in member's id (or `guest`) once the session is known; a different owner starts a clean chat. */
export function syncAssistantOwner(owner: string) {
	hydrateAssistant();
	if (assistantVar().owner !== owner) resetAssistant(owner);
}

const clip = (text: string) => text.slice(0, ASSISTANT_MAX_MESSAGE_LENGTH);

/**
 * The last turns before the question, for the backend. A user message without an answer (a failed try) is left out,
 * and assistant text is clipped to the 1000 characters the history accepts (an answer can be 2000).
 */
export function buildHistory(before: AssistantMessage[]) {
	const turns: { role: 'USER' | 'ASSISTANT'; content: string }[] = [];
	before.forEach((message, index) => {
		if (message.role === 'user' && before[index + 1]?.role !== 'assistant') return;
		turns.push({ role: message.role === 'user' ? 'USER' : 'ASSISTANT', content: clip(message.content) });
	});
	return turns.slice(-ASSISTANT_MAX_HISTORY);
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Asks about the last user message in `messages`. */
async function ask(messages: AssistantMessage[], locale: string | undefined) {
	const question = messages[messages.length - 1];
	abortRequest();
	const id = requestId;
	const abort = new AbortController();
	controller = abort;
	const timer = setTimeout(() => abort.abort(), ASSISTANT_CLIENT_TIMEOUT_MS);
	update({ messages, pending: true, pendingSince: Date.now(), error: null });

	try {
		const { data } = await initializeApollo().mutate<{ askAssistant: { answer: string; events: AssistantEvent[] } }>({
			mutation: ASK_ASSISTANT,
			variables: {
				input: {
					message: question.content.trim(),
					history: buildHistory(messages.slice(0, -1)),
					locale: toEventLocale(locale),
				},
			},
			fetchPolicy: 'no-cache',
			context: { fetchOptions: { signal: abort.signal } },
		});
		if (id !== requestId) return;
		const result = data?.askAssistant;
		if (!result) throw new Error('empty');
		const answer: AssistantMessage = {
			id: newId(),
			role: 'assistant',
			content: result.answer,
			...(result.events?.length ? { events: result.events } : {}),
		};
		update({ messages: [...assistantVar().messages, answer], pending: false, pendingSince: null });
	} catch (err) {
		if (id !== requestId) return;
		// an abort by the timer is a timeout; an abort by "New chat" never gets here (the request id moved on)
		const kind = abort.signal.aborted ? assistantErrorKind({ code: TIMEOUT_CODE, message: 'timeout' }) : assistantErrorKind(err);
		update({ pending: false, pendingSince: null, error: kind });
	} finally {
		clearTimeout(timer);
		if (controller === abort) controller = null;
	}
}

export const MAX_LENGTH = ASSISTANT_MAX_MESSAGE_LENGTH;

/** Sends a new question. Returns false when nothing was sent (empty, too long, or an answer is still on its way). */
export function sendAssistantMessage(text: string, locale: string | undefined): boolean {
	const state = assistantVar();
	const content = text.trim();
	if (!content || content.length > MAX_LENGTH || state.pending) return false;
	void ask([...state.messages, { id: newId(), role: 'user', content }], locale);
	return true;
}

/** Asks again about the last, unanswered question. */
export function retryAssistant(locale: string | undefined) {
	const state = assistantVar();
	const last = state.messages[state.messages.length - 1];
	if (state.pending || last?.role !== 'user') return;
	void ask(state.messages, locale);
}

/** Drops the unanswered question after a final error (not allowed, invalid) so it does not stay in the list. */
export function discardFailedQuestion() {
	const state = assistantVar();
	const last = state.messages[state.messages.length - 1];
	update({ messages: last?.role === 'user' ? state.messages.slice(0, -1) : state.messages, error: null });
}
