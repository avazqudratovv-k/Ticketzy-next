import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isBlockedBuyer, queueBuyerNotice } from '../buyerGate';
import useAuth from './useAuth';

/**
 * Seats and checkout are for buyer accounts. An organizer or admin who opens one of those URLs directly is sent to
 * `target` (the event page, or the event list when the event is not known) with the "only buyer accounts" message.
 * Returns true while that applies, so the page can skip its queries and show its skeleton for the moment it takes.
 */
export default function useBuyerOnlyRedirect(target: string | null): boolean {
	const router = useRouter();
	const { user } = useAuth();
	const blocked = isBlockedBuyer(user);

	useEffect(() => {
		if (!blocked || !target) return;
		queueBuyerNotice();
		router.replace(target);
	}, [blocked, target, router]);

	return blocked;
}
