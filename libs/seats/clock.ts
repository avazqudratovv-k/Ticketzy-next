import { useEffect, useState } from 'react';

/**
 * The server's clock minus this device's clock, in ms. The hold deadline is a server time, so the countdown is
 * `deadline - (Date.now() + skew)`. `holdSeats` answers with `serverTime`, which is the only place the API tells us
 * the time; the skew is remembered for the tab session so a page reload keeps counting correctly.
 */
const SKEW_KEY = 'tz:clock-skew';
let skew: number | null = null;

export function getClockSkew(): number {
	if (skew !== null) return skew;
	try {
		const stored = sessionStorage.getItem(SKEW_KEY);
		skew = stored !== null && Number.isFinite(Number(stored)) ? Number(stored) : 0;
	} catch {
		skew = 0;
	}
	return skew;
}

/** `sentAt` and `receivedAt` are device times around the request; the midpoint approximates when the server answered. */
export function updateClockSkew(serverTime: string, sentAt: number, receivedAt: number) {
	const server = new Date(serverTime).getTime();
	if (!Number.isFinite(server)) return;
	skew = server - (sentAt + receivedAt) / 2;
	try {
		sessionStorage.setItem(SKEW_KEY, String(skew));
	} catch {
		// the skew is only an optimisation for the next page load
	}
}

export const serverNow = () => Date.now() + getClockSkew();

/** Milliseconds left until a server deadline, ticking every 250 ms; `null` while there is no deadline. */
export function useRemainingMs(deadline: string | null | undefined): number | null {
	const [now, setNow] = useState(() => serverNow());
	useEffect(() => {
		if (!deadline) return undefined;
		setNow(serverNow());
		const id = window.setInterval(() => setNow(serverNow()), 250);
		const onVisible = () => setNow(serverNow());
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			window.clearInterval(id);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [deadline]);
	if (!deadline) return null;
	return Math.max(0, new Date(deadline).getTime() - now);
}

export function formatCountdown(ms: number): string {
	const total = Math.ceil(ms / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
