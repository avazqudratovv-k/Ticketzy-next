import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { userVar } from '../../../apollo/store';
import { MARK_APPROVAL_CELEBRATION_DONE } from '../../../apollo/user/mutation';
import { GET_MY_ACCOUNT_STATE } from '../../../apollo/user/query';
import { MemberStatus, MemberType } from '../../enums/member.enum';
import { UNREAD_POLL_MS } from '../../hooks/useUnreadCount';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../routes';
import { MyAccountState } from '../../types/account';
import SplashOverlay from './SplashOverlay';

type StateData = { getMyAccountState: MyAccountState };

/** Per tab and member: the celebration was started here. Survives a reload (sessionStorage) so a slow mark-done call cannot replay it. */
const keyOf = (memberId: string) => `tz-approval-splash:${memberId}`;
const startedThisLoad = new Set<string>();

const wasStarted = (memberId: string): boolean => {
	if (startedThisLoad.has(memberId)) return true;
	try {
		return sessionStorage.getItem(keyOf(memberId)) === '1';
	} catch {
		return false;
	}
};

const markStarted = (memberId: string) => {
	startedThisLoad.add(memberId);
	try {
		sessionStorage.setItem(keyOf(memberId), '1');
	} catch {
		// storage blocked: the in-memory set above still limits it to one play per page load
	}
};

/** The server says the flag is off again, so a later approval (a reinstated organizer) may celebrate in this tab. */
const clearStarted = (memberId: string) => {
	startedThisLoad.delete(memberId);
	try {
		sessionStorage.removeItem(keyOf(memberId));
	} catch {
		// nothing stored
	}
};

/**
 * Mounted once in `_app` (F352). While an organizer is signed in it reads `getMyAccountState` on load and then every 30 s while the
 * tab is visible, keeps the stored profile's status in step (so the pending banner and locks go away live), and when the server says
 * the account is ACTIVE with `approvalCelebrationPending` it plays the approval splash once and calls `markApprovalCelebrationDone`.
 * The server flag is the source of truth (never replays on another device); the per-tab guard stops a slow mutation from replaying it.
 */
const ApprovalCelebration = () => {
	const { t } = useTranslation('common');
	const router = useRouter();
	const client = useApolloClient();
	const { user } = useAuth();
	const enabled = user?.memberType === MemberType.ORGANIZER;
	const [playing, setPlaying] = useState(false);
	const marking = useRef(false);
	const pathname = useRef(router.pathname);
	pathname.current = router.pathname;

	const { data, startPolling, stopPolling, refetch } = useQuery<StateData>(GET_MY_ACCOUNT_STATE, {
		skip: !enabled,
		fetchPolicy: 'network-only',
		errorPolicy: 'ignore',
	});
	const state = enabled ? data?.getMyAccountState : undefined;

	// Poll like the bell does: while the tab is visible, once more when it comes back
	useEffect(() => {
		if (!enabled) return undefined;
		const sync = () => {
			if (document.visibilityState === 'visible') {
				refetch().catch(() => undefined);
				startPolling(UNREAD_POLL_MS);
			} else {
				stopPolling();
			}
		};
		if (document.visibilityState === 'visible') startPolling(UNREAD_POLL_MS);
		document.addEventListener('visibilitychange', sync);
		return () => {
			document.removeEventListener('visibilitychange', sync);
			stopPolling();
		};
	}, [enabled, startPolling, stopPolling, refetch]);

	// The stored profile follows the server status (PENDING to ACTIVE unlocks Create event without a reload)
	useEffect(() => {
		if (!user || !state || state.memberStatus === MemberStatus.DELETE || state.memberStatus === user.memberStatus) return;
		userVar({ ...user, memberStatus: state.memberStatus as MemberStatus });
	}, [user, state]);

	const markDone = useCallback(() => {
		if (marking.current) return;
		marking.current = true;
		client
			.mutate<{ markApprovalCelebrationDone: MyAccountState }>({ mutation: MARK_APPROVAL_CELEBRATION_DONE })
			.then(({ data: result }) => {
				const next = result?.markApprovalCelebrationDone;
				if (next) client.writeQuery({ query: GET_MY_ACCOUNT_STATE, data: { getMyAccountState: { __typename: 'MyAccountState', ...next } } });
			})
			.catch(() => undefined) // the flag stays on the server; the next poll tries again without replaying
			.finally(() => {
				marking.current = false;
			});
	}, [client]);

	useEffect(() => {
		if (!user || !state) return;
		if (!state.approvalCelebrationPending) {
			clearStarted(user._id);
			return;
		}
		if (state.memberStatus !== MemberStatus.ACTIVE) return;
		if (!wasStarted(user._id)) {
			markStarted(user._id);
			setPlaying(true);
		}
		markDone();
	}, [user, state, markDone]);

	// Signing out while it plays removes it
	useEffect(() => {
		if (!user) setPlaying(false);
	}, [user]);

	const end = useCallback(() => {
		setPlaying(false);
		// The organizer who waited on the "awaiting approval" screen goes on to the dashboard
		if (pathname.current === ROUTES.signup) router.push(ROUTES.organizerDashboard);
	}, [router]);

	return (
		<>
			<p className="tz-sr" role="status" aria-live="polite">
				{playing ? t('approval.message') : ''}
			</p>
			{playing && <SplashOverlay message={t('approval.message')} onEnd={end} />}
		</>
	);
};

export default ApprovalCelebration;
