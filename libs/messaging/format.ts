import { daysAgo, formatEventTime, formatViewerDate } from '../format';
import { ChatMessage, Conversation, ConversationParty, ThreadMessage } from './types';

/** Backend limit (`MESSAGE_MAX_LENGTH` in conversation.service.ts); it is not in the schema, so it is repeated here. */
export const MESSAGE_MAX_LENGTH = 2000;

const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const partyName = (party?: ConversationParty | null): string => party?.memberFullName || party?.memberNick || '';

/** "13:05" in the viewer's zone and language. */
export const formatClock = (iso: string, locale?: string) => formatEventTime(iso, locale, viewerZone());

export type DayLabel = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'date'; text: string };

export function dayLabel(iso: string, locale?: string): DayLabel {
	const days = daysAgo(iso);
	if (days === 0) return { kind: 'today' };
	if (days === 1) return { kind: 'yesterday' };
	return { kind: 'date', text: formatViewerDate(iso, locale) };
}

/** The day a message belongs to on the viewer's clock, as a sortable key. */
export const dayKey = (iso: string): string => {
	const date = new Date(iso);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export interface DayGroup {
	key: string;
	iso: string;
	messages: ThreadMessage[];
}

/** Oldest first in, grouped by calendar day out. */
export function groupByDay(messages: ThreadMessage[]): DayGroup[] {
	const groups: DayGroup[] = [];
	for (const message of messages) {
		const key = dayKey(message.createdAt);
		const last = groups[groups.length - 1];
		if (last && last.key === key) last.messages.push(message);
		else groups.push({ key, iso: message.createdAt, messages: [message] });
	}
	return groups;
}

/** Messages from one sender closer together than this share one name-and-time line (F360). */
export const CLUSTER_GAP_MS = 5 * 60_000;

export interface MessageCluster {
	key: string;
	senderId: string;
	messages: ThreadMessage[];
}

/** One day's messages (oldest first) in runs by sender: a new run starts when the sender changes or the gap to the previous message is over `gapMs`. */
export function clusterMessages(messages: ThreadMessage[], gapMs = CLUSTER_GAP_MS): MessageCluster[] {
	const clusters: MessageCluster[] = [];
	for (const message of messages) {
		const last = clusters[clusters.length - 1];
		const previous = last?.messages[last.messages.length - 1];
		const close = previous && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <= gapMs;
		if (last && previous && last.senderId === message.senderId && close) last.messages.push(message);
		else clusters.push({ key: message._id, senderId: message.senderId, messages: [message] });
	}
	return clusters;
}

const byTime = (a: ChatMessage, b: ChatMessage) => a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id);

/** Adds messages to a thread without duplicates (a message can arrive from the mutation, the socket and a poll). */
export function mergeMessages(current: ThreadMessage[], incoming: ChatMessage[]): ThreadMessage[] {
	if (!incoming.length) return current;
	const byId = new Map<string, ThreadMessage>();
	current.forEach((message) => byId.set(message._id, message));
	incoming.forEach((message) => {
		const old = byId.get(message._id);
		// keep a readAt we already know: a poll answer can be older than a `read` event
		byId.set(message._id, { ...message, readAt: message.readAt ?? old?.readAt ?? null });
	});
	const saved = Array.from(byId.values()).filter((message) => !message.local).sort(byTime);
	const pending = Array.from(byId.values()).filter((message) => message.local);
	return [...saved, ...pending];
}

/** A message of mine, as the server stored it, replaces the local copy that was shown while sending. */
export const isMine = (message: ChatMessage, memberId: string) => message.senderId === memberId;

export function otherSideRead(conversation: Conversation, readerId: string, memberId: string, isAdmin: boolean): boolean {
	return isAdmin ? readerId === conversation.organizerId : readerId !== memberId;
}
