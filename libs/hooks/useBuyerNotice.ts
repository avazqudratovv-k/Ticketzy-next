import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { takeBuyerNotice } from '../buyerGate';

const VISIBLE_MS = 6000;

/**
 * The short "only buyer accounts can buy" message next to a button that stays focusable (aria-disabled).
 * Hides after a few seconds, on the next click or tap anywhere else, and on Escape. `anchor` is the button: a click on
 * it keeps the message and restarts the timer. With `fromRedirect`, a message left by a page that sent the member away
 * is shown on arrival.
 */
export default function useBuyerNotice(anchor: RefObject<HTMLElement>, fromRedirect = false) {
	const [visible, setVisible] = useState(false);
	const timer = useRef<number>();

	const hide = useCallback(() => {
		window.clearTimeout(timer.current);
		setVisible(false);
	}, []);

	const show = useCallback(() => {
		window.clearTimeout(timer.current);
		setVisible(true);
		timer.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
	}, []);

	useEffect(() => {
		if (fromRedirect && takeBuyerNotice()) show();
	}, [fromRedirect, show]);

	useEffect(() => {
		if (!visible) return undefined;
		const away = (event: Event) => {
			if (anchor.current?.contains(event.target as Node)) return;
			hide();
		};
		const escape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') hide();
		};
		document.addEventListener('pointerdown', away);
		document.addEventListener('keydown', escape);
		return () => {
			document.removeEventListener('pointerdown', away);
			document.removeEventListener('keydown', escape);
		};
	}, [visible, anchor, hide]);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	return { visible, show, hide };
}
