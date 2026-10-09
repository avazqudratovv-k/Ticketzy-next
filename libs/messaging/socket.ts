import { socketStatusVar } from '../../apollo/store';
import { getJwtToken } from '../auth/token';
import { isExpired } from '../auth';

/**
 * The one WebSocket of the app (organizer and admin messaging, backend DECISIONS #58). Browsers cannot set headers
 * on a WebSocket, so the token goes in the first message: `{ event: 'auth', data: { token } }`; the server answers
 * `authenticated`. Messages both ways are `{ event, data }`.
 *
 * Reconnects with backoff. While it is not open the app polls (`socketStatusVar` is `fallback`). Closed on logout.
 * Rooms (conversations) are reference counted: the inbox keeps every conversation joined so unread counts are live,
 * and an open thread joins its own on top; `leaveConversation` is sent when nobody needs the room any more.
 */

type Listener = (data: any) => void;

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000, 30000];
/** The server closes with this code when the token or the member is refused: retrying with the same token is pointless. */
const CLOSE_UNAUTHORIZED = 4401;

class MessagingSocket {
	private ws: WebSocket | null = null;
	private wanted = false;
	private authenticated = false;
	private refused = false;
	private attempts = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private listeners = new Map<string, Set<Listener>>();
	private rooms = new Map<string, number>();
	private joined = new Set<string>();

	start(): void {
		if (this.wanted || typeof window === 'undefined') return;
		this.wanted = true;
		this.refused = false;
		this.attempts = 0;
		window.addEventListener('online', this.wake);
		document.addEventListener('visibilitychange', this.wake);
		this.connect();
	}

	/** Logout, or the member is no longer an organizer or admin. */
	stop(): void {
		this.wanted = false;
		this.clearTimer();
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.wake);
			document.removeEventListener('visibilitychange', this.wake);
		}
		const ws = this.ws;
		this.ws = null;
		this.authenticated = false;
		this.joined.clear();
		this.rooms.clear();
		if (ws) {
			ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
			try {
				ws.close(1000, 'logout');
			} catch {
				// already closed
			}
		}
		socketStatusVar('off');
	}

	get isOpen(): boolean {
		return this.authenticated;
	}

	on(event: string, listener: Listener): () => void {
		let set = this.listeners.get(event);
		if (!set) this.listeners.set(event, (set = new Set()));
		set.add(listener);
		return () => set?.delete(listener);
	}

	/** Needs the room. Returns the function that gives it back. */
	acquire(conversationId: string): () => void {
		this.rooms.set(conversationId, (this.rooms.get(conversationId) ?? 0) + 1);
		this.syncRoom(conversationId);
		let released = false;
		return () => {
			if (released) return;
			released = true;
			const left = (this.rooms.get(conversationId) ?? 1) - 1;
			if (left > 0) this.rooms.set(conversationId, left);
			else this.rooms.delete(conversationId);
			this.syncRoom(conversationId);
		};
	}

	typing(conversationId: string, isTyping: boolean): void {
		if (this.joined.has(conversationId)) this.send('typing', { conversationId, isTyping });
	}

	private send(event: string, data: unknown): boolean {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
		this.ws.send(JSON.stringify({ event, data }));
		return true;
	}

	private emit(event: string, data?: unknown): void {
		this.listeners.get(event)?.forEach((listener) => listener(data));
	}

	private syncRoom(conversationId: string): void {
		if (!this.authenticated) return;
		const wanted = this.rooms.has(conversationId);
		if (wanted && !this.joined.has(conversationId)) this.send('joinConversation', { conversationId });
		if (!wanted && this.joined.has(conversationId)) {
			this.send('leaveConversation', { conversationId });
			this.joined.delete(conversationId);
		}
	}

	private connect(): void {
		this.clearTimer();
		const url = process.env.NEXT_PUBLIC_API_WS_URL;
		const token = getJwtToken();
		if (!url || !token || isExpired(token)) {
			this.fail();
			return;
		}
		if (this.attempts === 0) socketStatusVar('connecting');

		let ws: WebSocket;
		try {
			ws = new WebSocket(url);
		} catch {
			this.fail();
			return;
		}
		this.ws = ws;
		ws.onopen = () => ws.send(JSON.stringify({ event: 'auth', data: { token } }));
		ws.onmessage = (message) => this.handle(message.data);
		ws.onerror = () => undefined; // `close` follows and does the work
		ws.onclose = (event) => {
			if (this.ws !== ws) return;
			this.ws = null;
			this.authenticated = false;
			this.joined.clear();
			if (event.code === CLOSE_UNAUTHORIZED) this.refused = true;
			this.fail();
		};
	}

	private handle(raw: unknown): void {
		let parsed: { event?: string; data?: any };
		try {
			parsed = JSON.parse(String(raw));
		} catch {
			return;
		}
		const { event, data } = parsed;
		if (!event) return;
		if (event === 'authenticated') {
			this.authenticated = true;
			this.attempts = 0;
			socketStatusVar('open');
			this.rooms.forEach((_count, id) => this.syncRoom(id));
			this.emit('open');
			return;
		}
		if (event === 'joined' && data?.conversationId) this.joined.add(data.conversationId);
		if (event === 'left' && data?.conversationId) this.joined.delete(data.conversationId);
		this.emit(event, data);
	}

	/** Not connected: poll, and try again later (unless the server refused this member). */
	private fail(): void {
		if (!this.wanted) return;
		const wasOpen = socketStatusVar() === 'open';
		socketStatusVar('fallback');
		if (wasOpen) this.emit('close');
		if (this.refused) return;
		const delay = BACKOFF_MS[Math.min(this.attempts, BACKOFF_MS.length - 1)];
		this.attempts += 1;
		// a little jitter so a restarted server is not hit by every tab at once
		this.timer = setTimeout(() => this.connect(), delay + Math.floor(Math.random() * 400));
	}

	private clearTimer(): void {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
	}

	/** Back online or the tab is visible again: do not wait for the backoff. */
	private wake = (): void => {
		if (!this.wanted || this.ws || this.refused) return;
		if (document.visibilityState === 'hidden') return;
		this.connect();
	};
}

export const messagingSocket = new MessagingSocket();

// A hot reload of this file in development would leave the old socket open next to the new one.
if (typeof window !== 'undefined') {
	const w = window as unknown as { __tzMessagingSocket?: MessagingSocket };
	w.__tzMessagingSocket?.stop();
	w.__tzMessagingSocket = messagingSocket;
}
