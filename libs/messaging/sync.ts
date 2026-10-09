import { ApolloClient } from '@apollo/client';
import { conversationsVar, messagingErrorVar, messagingReadyVar, socketStatusVar } from '../../apollo/store';
import { GET_CONVERSATION, GET_MY_CONVERSATIONS, lastMessagesQuery } from '../../apollo/messaging';
import { GET_MY_NOTIFICATIONS, GET_UNREAD_NOTIFICATION_COUNT } from '../../apollo/user/query';
import { MARK_NOTIFICATION_READ } from '../../apollo/user/mutation';
import { MemberType } from '../enums/member.enum';
import { ChatMessage, Conversation, ConversationEntry, ReadEvent, UnreadEvent } from './types';
import { messagingSocket } from './socket';

/** Poll interval while the socket is not open (the spec's fallback) and the slower safety net while it is. */
export const POLL_FALLBACK_MS = 10_000;
const POLL_LIVE_MS = 30_000;
const LIST_PAGE = 100;
/** 5 pages of 100 conversations; far more than an organizer or the admin team will have */
const LIST_PAGES_MAX = 5;
const PREVIEW_BATCH = 20;

const unreadOf = (conversation: Conversation, memberType: MemberType): number =>
	memberType === MemberType.ADMIN ? conversation.unreadForAdmin : conversation.unreadForOrganizer;

const entries = () => conversationsVar();

function setEntries(next: Record<string, ConversationEntry>): void {
	conversationsVar(next);
}

/** Inserts or replaces one conversation (keeps its preview). */
export function upsertConversation(conversation: Conversation, memberType: MemberType): void {
	const prev = entries()[conversation._id];
	setEntries({
		...entries(),
		[conversation._id]: {
			conversation,
			lastMessage: prev?.lastMessage ?? null,
			unread: unreadOf(conversation, memberType),
			previewFor: prev?.previewFor ?? null,
		},
	});
}

export function setUnread(conversationId: string, unread: number): void {
	const entry = entries()[conversationId];
	if (!entry || entry.unread === unread) return;
	setEntries({ ...entries(), [conversationId]: { ...entry, unread } });
}

/** A message arrived (or was sent): it becomes the preview and moves the conversation up. */
export function applyMessage(message: ChatMessage): boolean {
	const entry = entries()[message.conversationId];
	if (!entry) return false;
	if (entry.lastMessage && entry.lastMessage._id === message._id) return true;
	if (entry.lastMessage && entry.lastMessage.createdAt > message.createdAt) return true;
	setEntries({
		...entries(),
		[message.conversationId]: {
			...entry,
			lastMessage: message,
			conversation: { ...entry.conversation, lastMessageAt: message.createdAt },
		},
	});
	return true;
}

/** The other side read my last message. */
function applyRead(event: ReadEvent, memberId: string, memberType: MemberType): void {
	const entry = entries()[event.conversationId];
	const last = entry?.lastMessage;
	if (!entry || !last || last.readAt || last.senderId !== memberId) return;
	const readerIsOtherSide = memberType === MemberType.ADMIN ? event.readerId === entry.conversation.organizerId : event.readerId !== memberId;
	if (readerIsOtherSide) setEntries({ ...entries(), [event.conversationId]: { ...entry, lastMessage: { ...last, readAt: event.readAt } } });
}

async function loadPreviews(client: ApolloClient<unknown>, ids: string[]): Promise<void> {
	const gen = generation;
	for (let from = 0; from < ids.length; from += PREVIEW_BATCH) {
		const batch = ids.slice(from, from + PREVIEW_BATCH);
		const variables = Object.fromEntries(batch.map((id, i) => [`c${i}`, id]));
		const { data } = await client.query({ query: lastMessagesQuery(batch.length), variables, fetchPolicy: 'network-only' });
		if (gen !== generation) return;
		const next = { ...entries() };
		batch.forEach((id, i) => {
			const entry = next[id];
			if (!entry) return;
			const list: ChatMessage[] = data?.[`m${i}`]?.list ?? [];
			// a live message that arrived meanwhile is newer than this answer
			const last = entry.lastMessage && list[0] && entry.lastMessage.createdAt > list[0].createdAt ? entry.lastMessage : list[0] ?? null;
			next[id] = { ...entry, lastMessage: last, previewFor: entry.conversation.lastMessageAt };
		});
		setEntries(next);
	}
}

let running = false;
/** Bumped on start and stop, so an answer that arrives after a logout is thrown away instead of shown to the next member. */
let generation = 0;

/** Loads the member's conversations, and the newest message of those that changed. Never throws. */
export async function syncConversations(client: ApolloClient<unknown>, memberType: MemberType): Promise<void> {
	if (running) return;
	running = true;
	const gen = generation;
	try {
		const list: Conversation[] = [];
		for (let page = 1; page <= LIST_PAGES_MAX; page += 1) {
			const { data } = await client.query({
				query: GET_MY_CONVERSATIONS,
				variables: { input: { page, limit: LIST_PAGE } },
				fetchPolicy: 'network-only',
			});
			const result = data?.getMyConversations;
			list.push(...(result?.list ?? []));
			const total: number = result?.metaCounter?.[0]?.total ?? 0;
			if (list.length >= total || !result?.list?.length) break;
		}
		if (gen !== generation) return;
		const prev = entries();
		const next: Record<string, ConversationEntry> = {};
		for (const conversation of list) {
			const old = prev[conversation._id];
			// a live unread event may be newer than this answer only if a message came in meanwhile; the list is fresher after a fetch
			next[conversation._id] = {
				conversation,
				lastMessage: old?.lastMessage ?? null,
				unread: unreadOf(conversation, memberType),
				previewFor: old?.previewFor ?? null,
			};
		}
		setEntries(next);
		messagingErrorVar(false);
		messagingReadyVar(true);
		syncRooms();
		const stale = list.filter((c) => next[c._id].previewFor !== c.lastMessageAt).map((c) => c._id);
		if (stale.length) await loadPreviews(client, stale);
	} catch {
		// keep what we have; the page shows an error only when nothing was ever loaded
		if (gen === generation && !messagingReadyVar()) messagingErrorVar(true);
	} finally {
		if (gen === generation) running = false;
	}
}

/** Fetches one conversation that is not in the list yet (a link from a notification, or one just started). */
export async function fetchConversation(client: ApolloClient<unknown>, conversationId: string, memberType: MemberType): Promise<Conversation> {
	const { data } = await client.query({ query: GET_CONVERSATION, variables: { conversationId }, fetchPolicy: 'network-only' });
	const conversation: Conversation = data.getConversation;
	upsertConversation(conversation, memberType);
	syncRooms();
	if (!entries()[conversationId]?.lastMessage) loadPreviews(client, [conversationId]).catch(() => undefined);
	return conversation;
}

/** Keeps the background room of every listed conversation, so `unread` and `message` events arrive for all of them. */
const background = new Map<string, () => void>();
function syncRooms(): void {
	const ids = new Set(Object.keys(entries()));
	background.forEach((release, id) => {
		if (!ids.has(id)) {
			release();
			background.delete(id);
		}
	});
	ids.forEach((id) => {
		if (!background.has(id)) background.set(id, messagingSocket.acquire(id));
	});
}

/** The bell reads `getUnreadNotificationCount`; asking again puts the new count into the Apollo cache for it. */
let bellTimer: ReturnType<typeof setTimeout> | null = null;
export function refreshBell(client: ApolloClient<unknown>, delay = 800): void {
	if (bellTimer) clearTimeout(bellTimer);
	// the server creates the notification just after it sends the message
	bellTimer = setTimeout(() => {
		client.query({ query: GET_UNREAD_NOTIFICATION_COUNT, fetchPolicy: 'network-only' }).catch(() => undefined);
	}, delay);
}

/**
 * Opening a thread reads it: the "new message" notifications of that conversation are marked read too, so the
 * bell does not keep counting messages the member has seen. There is no bulk operation by conversation, so the
 * unread ones are found and marked one by one.
 */
export async function markThreadNotificationsRead(client: ApolloClient<unknown>, conversationId: string): Promise<void> {
	try {
		const { data } = await client.query({
			query: GET_MY_NOTIFICATIONS,
			variables: { input: { page: 1, limit: 50, unreadOnly: true } },
			fetchPolicy: 'network-only',
		});
		const mine: { _id: string }[] = (data?.getMyNotifications?.list ?? []).filter(
			(n: { notificationType: string; conversationId?: string | null }) => n.notificationType === 'NEW_MESSAGE' && n.conversationId === conversationId,
		);
		await Promise.allSettled(mine.map((n) => client.mutate({ mutation: MARK_NOTIFICATION_READ, variables: { notificationId: n._id } })));
		if (mine.length) {
			refreshBell(client, 0);
		}
	} catch {
		// the bell catches up on its own poll
	}
}

/**
 * Starts the shared socket and keeps the conversation store in sync: live through socket events, and by polling
 * every 10 seconds while the socket cannot connect (every 30 seconds while it is open, as a safety net).
 * Returns the function that stops everything (logout, role change).
 */
export function startMessaging(client: ApolloClient<unknown>, memberId: string, memberType: MemberType): () => void {
	generation += 1;
	running = false;
	messagingReadyVar(false);
	messagingErrorVar(false);
	setEntries({});
	messagingSocket.start();

	const sync = () => syncConversations(client, memberType);
	const offs = [
		messagingSocket.on('open', sync),
		messagingSocket.on('message', (message: ChatMessage) => {
			// a conversation we do not know yet (an organizer just started it) arrives with the next list
			if (!applyMessage(message)) sync();
			if (message.senderId !== memberId) refreshBell(client);
		}),
		messagingSocket.on('unread', (event: UnreadEvent) => setUnread(event.conversationId, event.unreadCount)),
		messagingSocket.on('read', (event: ReadEvent) => applyRead(event, memberId, memberType)),
	];

	sync();
	let timer: ReturnType<typeof setTimeout>;
	const tick = () => {
		if (document.visibilityState === 'visible') sync();
		timer = setTimeout(tick, socketStatusVar() === 'open' ? POLL_LIVE_MS : POLL_FALLBACK_MS);
	};
	timer = setTimeout(tick, POLL_FALLBACK_MS);
	const onVisible = () => {
		if (document.visibilityState === 'visible') sync();
	};
	document.addEventListener('visibilitychange', onVisible);

	return () => {
		generation += 1;
		running = false;
		clearTimeout(timer);
		if (bellTimer) clearTimeout(bellTimer);
		document.removeEventListener('visibilitychange', onVisible);
		offs.forEach((off) => off());
		background.clear();
		messagingSocket.stop();
		setEntries({});
		messagingReadyVar(false);
		messagingErrorVar(false);
	};
}
