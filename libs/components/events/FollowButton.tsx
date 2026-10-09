import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Check, Plus } from 'phosphor-react';
import { SUBSCRIBE, UNSUBSCRIBE } from '../../../apollo/user/mutation';
import { GET_ORGANIZER_FOLLOW } from '../../../apollo/user/query';
import useAuth from '../../hooks/useAuth';
import { MemberType } from '../../enums/member.enum';
import { formatNumber } from '../../format';
import { loginUrl } from '../../routes';
import { parseApiError } from '../../errors';

interface Props {
	organizerId: string;
	/** Used in the accessible name: "Follow {name}". */
	name: string;
}

/** Backend message when there is no follow to remove (already unfollowed elsewhere). */
const NO_DATA = 'No data found!';

/**
 * Follow / Following for an organizer (`subscribe` / `unsubscribe`). The count and the state come from `getMember`
 * (`memberFollowers`, `meFollowed`) and are changed in the cache first, then restored if the call fails.
 * The backend lets any signed-in member follow another member's organizer account; the buttons are offered to buyers
 * only because only buyers have a "Following" list (decision F211).
 */
const FollowButton = ({ organizerId, name }: Props) => {
	const { t } = useTranslation('events');
	const router = useRouter();
	const client = useApolloClient();
	const { user, ready } = useAuth();
	const [failed, setFailed] = useState<string | null>(null);
	const [subscribe] = useMutation(SUBSCRIBE);
	const [unsubscribe] = useMutation(UNSUBSCRIBE);
	const [busy, setBusy] = useState(false);

	const { data, refetch } = useQuery(GET_ORGANIZER_FOLLOW, {
		variables: { memberId: organizerId },
		fetchPolicy: 'cache-and-network',
		skip: !organizerId,
	});
	const member = data?.getMember;
	if (!member || !ready) return <span className="follow follow--skel tz-skel" aria-hidden="true" />;

	const count: number = member.memberFollowers ?? 0;
	const following = Boolean(member.meFollowed?.[0]?.myFollowing);
	const cacheId = client.cache.identify({ __typename: 'Member', _id: organizerId });

	const write = (followers: number, value: boolean) =>
		client.cache.modify({
			id: cacheId,
			fields: {
				memberFollowers: () => followers,
				meFollowed: () =>
					user
						? [{ __typename: 'MeFollowed', followingId: organizerId, followerId: user._id, myFollowing: value }]
						: [],
			},
		});

	const toggle = async () => {
		if (!user || busy) return;
		const wasFollowing = following;
		const before = count;
		setFailed(null);
		setBusy(true);
		write(Math.max(0, before + (wasFollowing ? -1 : 1)), !wasFollowing);
		try {
			await (wasFollowing ? unsubscribe : subscribe)({
				variables: { input: organizerId },
				// the list in the account area is reloaded if it is open, and dropped from the cache otherwise
				refetchQueries: ['GetMyFollowings'],
			});
			client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'getMemberFollowings' });
			client.cache.gc();
			refetch().catch(() => undefined);
		} catch (err) {
			const { message } = parseApiError(err);
			if (wasFollowing && message === NO_DATA) {
				// there was nothing to remove: the wanted state is already true
				write(Math.max(0, before - 1), false);
			} else {
				write(before, wasFollowing);
				setFailed(message === 'Self subscription is denied!' ? 'self' : message === 'Only organizers can be followed!' ? 'organizerOnly' : wasFollowing ? 'unfollow' : 'follow');
				refetch().catch(() => undefined);
			}
		} finally {
			setBusy(false);
		}
	};

	const countText = (
		<span className="follow__count">{t('follow.followers', { count, n: formatNumber(count, router.locale) })}</span>
	);

	let action: React.ReactNode;
	let reason: string | null = null;
	if (!user) {
		action = (
			<Button component={Link} href={loginUrl(router.asPath)} variant="outlined" size="small" startIcon={<Plus size={16} />}>
				{t('follow.signIn')}
			</Button>
		);
	} else if (user._id === organizerId) {
		reason = t('follow.own');
	} else if (user.memberType !== MemberType.USER) {
		reason = t('follow.buyersOnly');
	} else {
		action = (
			<Button
				variant={following ? 'outlined' : 'contained'}
				size="small"
				disabled={busy}
				aria-pressed={following}
				aria-label={t(following ? 'follow.unfollowLabel' : 'follow.followLabel', { name })}
				startIcon={
					busy ? (
						<CircularProgress size={14} color="inherit" aria-hidden="true" />
					) : following ? (
						<Check size={16} aria-hidden="true" />
					) : (
						<Plus size={16} aria-hidden="true" />
					)
				}
				onClick={toggle}
			>
				{t(following ? 'follow.following' : 'follow.follow')}
			</Button>
		);
	}

	return (
		<div className="follow">
			<div className="follow__row">
				{action}
				{countText}
			</div>
			{reason && <p className="follow__hint">{reason}</p>}
			{failed && (
				<p className="follow__hint follow__hint--error" role="alert">
					{t(`follow.errors.${failed}`)}
				</p>
			)}
			<span className="tz-sr" role="status" aria-live="polite">
				{busy ? t('follow.working') : ''}
			</span>
		</div>
	);
};

export default FollowButton;
