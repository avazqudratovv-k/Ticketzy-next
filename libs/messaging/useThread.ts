import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { GET_MESSAGES, SEND_MESSAGE } from '../../apollo/messaging';
import { describeMessagingError, MessagingError } from './errors';
import { mergeMessages, otherSideRead } from './format';
import { messagingSocket } from './socket';
import { applyMessage, POLL_FALLBACK_MS } from './sync';
import { useSocketStatus } from './hooks';
import { ChatMessage, Conversation, ReadEvent, ThreadMessage, TypingEvent } from './types';

export const THREAD_PAGE = 30;
const TYPING_SHOW_MS = 6000;
const TYPING_SEND_EVERY_MS = 2500;
const TYPING_IDLE_MS = 3500;

interface Me {
	id: string;
	isAdmin: boolean;
}

/**
 * One open conversation: its messages (oldest first), live additions from the shared socket, the older pages,
 * sending with a local copy that shows sending / failed, read receipts and typing. While the socket is not open
 * it polls the newest page every 10 seconds.
 */
export default function useThread(conversationId: string, conversation: Conversation | undefined, me: Me) {
	const client = useApolloClient();
	const socketStatus = useSocketStatus();
	const [messages, setMessages] = useState<ThreadMessage[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<MessagingError | null>(null);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [olderError, setOlderError] = useState<MessagingError | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [typingIds, setTypingIds] = useState<string[]>([]);
	const pages = useRef(0);
	const localSeq = useRef(0);
	const conversationRef = useRef(conversation);
	conversationRef.current = conversation;

	const fetchPage = useCallback(
		async (page: number): Promise<{ list: ChatMessage[]; total: number }> => {
			const { data } = await client.query({
				query: GET_MESSAGES,
				variables: { conversationId, input: { page, limit: THREAD_PAGE } },
				fetchPolicy: 'network-only',
			});
			return { list: data.getMessages.list, total: data.getMessages.metaCounter?.[0]?.total ?? 0 };
		},
		[client, conversationId],
	);

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const { list, total } = await fetchPage(1);
			pages.current = 1;
			setMessages((current) => mergeMessages(current, [...list].reverse()));
			setHasMore(total > THREAD_PAGE);
		} catch (err) {
			setLoadError(describeMessagingError(err));
		} finally {
			setLoading(false);
		}
	}, [fetchPage]);

	// A new thread starts from nothing.
	useEffect(() => {
		setMessages([]);
		setHasMore(false);
		setOlderError(null);
		pages.current = 0;
		load();
	}, [conversationId, load]);

	const loadOlder = useCallback(async () => {
		if (loadingOlder || !pages.current) return;
		setLoadingOlder(true);
		setOlderError(null);
		try {
			// Offsets shift when new messages arrive; the merge drops the few that repeat.
			const { list, total } = await fetchPage(pages.current + 1);
			pages.current += 1;
			setMessages((current) => mergeMessages(current, [...list].reverse()));
			setHasMore(pages.current * THREAD_PAGE < total);
		} catch (err) {
			setOlderError(describeMessagingError(err));
		} finally {
			setLoadingOlder(false);
		}
	}, [fetchPage, loadingOlder]);

	// The room of this thread (joined on top of the inbox's own).
	useEffect(() => messagingSocket.acquire(conversationId), [conversationId]);

	// Live events.
	useEffect(() => {
		const timers = new Map<string, ReturnType<typeof setTimeout>>();
		const showTyping = (memberId: string, on: boolean) => {
			clearTimeout(timers.get(memberId));
			timers.delete(memberId);
			if (on) timers.set(memberId, setTimeout(() => showTyping(memberId, false), TYPING_SHOW_MS));
			setTypingIds((ids) => (on ? (ids.includes(memberId) ? ids : [...ids, memberId]) : ids.filter((id) => id !== memberId)));
		};
		const offs = [
			messagingSocket.on('message', (message: ChatMessage) => {
				if (message.conversationId !== conversationId) return;
				setMessages((current) => {
					let next = current;
					if (message.senderId === me.id) {
						// my own message came back from the server before the mutation answered: drop its local copy
						const index = current.findIndex((m) => m.local === 'sending' && m.body === message.body);
						if (index >= 0) next = current.filter((_m, i) => i !== index);
					}
					return mergeMessages(next, [message]);
				});
				showTyping(message.senderId, false);
			}),
			messagingSocket.on('read', (event: ReadEvent) => {
				const conv = conversationRef.current;
				if (event.conversationId !== conversationId || !conv || !otherSideRead(conv, event.readerId, me.id, me.isAdmin)) return;
				setMessages((current) => current.map((m) => (m.senderId === me.id && !m.readAt && !m.local ? { ...m, readAt: event.readAt } : m)));
			}),
			messagingSocket.on('typing', (event: TypingEvent) => {
				if (event.conversationId !== conversationId || event.memberId === me.id) return;
				showTyping(event.memberId, event.isTyping);
			}),
			// back after a gap: what was missed is in the newest page
			messagingSocket.on('open', () => {
				fetchPage(1)
					.then(({ list }) => setMessages((current) => mergeMessages(current, [...list].reverse())))
					.catch(() => undefined);
			}),
		];
		return () => {
			offs.forEach((off) => off());
			timers.forEach((timer) => clearTimeout(timer));
			setTypingIds([]);
		};
	}, [conversationId, me.id, me.isAdmin, fetchPage]);

	// Fallback: the socket cannot connect, so ask every 10 seconds.
	useEffect(() => {
		if (socketStatus === 'open' || socketStatus === 'off') return undefined;
		const id = window.setInterval(() => {
			if (document.visibilityState !== 'visible') return;
			fetchPage(1)
				.then(({ list }) => setMessages((current) => mergeMessages(current, [...list].reverse())))
				.catch(() => undefined);
		}, POLL_FALLBACK_MS);
		return () => window.clearInterval(id);
	}, [socketStatus, fetchPage]);

	const deliver = useCallback(
		async (localId: string, body: string) => {
			try {
				const { data } = await client.mutate({ mutation: SEND_MESSAGE, variables: { conversationId, body } });
				const saved: ChatMessage = data.sendMessage;
				setMessages((current) => mergeMessages(current.filter((m) => m._id !== localId), [saved]));
				applyMessage(saved);
			} catch (err) {
				const { key, raw, network } = describeMessagingError(err);
				setMessages((current) => current.map((m) => (m._id === localId ? { ...m, local: 'failed', error: { key, raw, network } } : m)));
			}
		},
		[client, conversationId],
	);

	const send = useCallback(
		(body: string) => {
			const text = body.trim();
			if (!text) return;
			localSeq.current += 1;
			const localId = `local-${localSeq.current}`;
			const local: ThreadMessage = {
				_id: localId,
				conversationId,
				senderId: me.id,
				body: text,
				readAt: null,
				createdAt: new Date().toISOString(),
				local: 'sending',
			};
			setMessages((current) => [...current, local]);
			return deliver(localId, text);
		},
		[conversationId, me.id, deliver],
	);

	const retry = useCallback(
		(localId: string) => {
			const target = messages.find((m) => m._id === localId);
			if (!target) return;
			setMessages((current) => current.map((m) => (m._id === localId ? { ...m, local: 'sending', error: undefined } : m)));
			deliver(localId, target.body);
		},
		[messages, deliver],
	);

	const discard = useCallback((localId: string) => setMessages((current) => current.filter((m) => m._id !== localId)), []);

	// Typing: tell the room now and then while the member types, and once when they stop.
	const typing = useRef({ last: 0, idle: undefined as ReturnType<typeof setTimeout> | undefined });
	const notifyTyping = useCallback(
		(active: boolean) => {
			const state = typing.current;
			clearTimeout(state.idle);
			if (active) {
				if (Date.now() - state.last > TYPING_SEND_EVERY_MS) {
					messagingSocket.typing(conversationId, true);
					state.last = Date.now();
				}
				state.idle = setTimeout(() => notifyTyping(false), TYPING_IDLE_MS);
			} else if (state.last) {
				messagingSocket.typing(conversationId, false);
				state.last = 0;
			}
		},
		[conversationId],
	);
	useEffect(() => () => notifyTyping(false), [notifyTyping]);

	return {
		messages,
		loading,
		loadError,
		reload: load,
		loadOlder,
		loadingOlder,
		olderError,
		hasMore,
		send,
		retry,
		discard,
		sending: messages.some((m) => m.local === 'sending'),
		typingIds,
		notifyTyping,
	};
}
