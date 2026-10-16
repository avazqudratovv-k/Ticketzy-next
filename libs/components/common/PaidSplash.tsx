import { useEffect, useState } from 'react';
import SplashOverlay from './SplashOverlay';

/** An order counts as "just paid" when it was paid within this window. */
const FRESH_MS = 5 * 60 * 1000;

const keyOf = (orderId: string) => `tz-paid-splash:${orderId}`;
/** Fallback when sessionStorage fails: at most once per page load. */
const playedThisLoad = new Set<string>();

const alreadyPlayed = (orderId: string): boolean => {
	if (playedThisLoad.has(orderId)) return true;
	try {
		return sessionStorage.getItem(keyOf(orderId)) === '1';
	} catch {
		return false;
	}
};

const markPlayed = (orderId: string) => {
	playedThisLoad.add(orderId);
	try {
		sessionStorage.setItem(keyOf(orderId), '1');
	} catch {
		// storage blocked: the in-memory set above still limits it to one play per page load
	}
};

/**
 * The splash of an order that has just become PAID (F347). Decides once per order, after hydration, then shows `SplashOverlay`.
 * Decorative: the role="status" text on the page is the announcement.
 */
const PaidSplash = ({ orderId, paid, paidAt }: { orderId: string; paid: boolean; paidAt?: string | null }) => {
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		if (!paid || !orderId || !paidAt) return;
		const age = Date.now() - new Date(paidAt).getTime();
		if (!Number.isFinite(age) || age > FRESH_MS || alreadyPlayed(orderId)) return;
		markPlayed(orderId);
		setPlaying(true);
	}, [paid, orderId, paidAt]);

	return playing ? <SplashOverlay onEnd={() => setPlaying(false)} /> : null;
};

export default PaidSplash;
