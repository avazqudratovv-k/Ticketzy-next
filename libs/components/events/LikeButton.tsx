import { MouseEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { Heart } from 'phosphor-react';
import { LIKE_TARGET_EVENT } from '../../../apollo/user/mutation';
import useAuth from '../../hooks/useAuth';
import { formatNumber } from '../../format';
import { loginUrl } from '../../routes';
import { parseApiError } from '../../errors';

interface Props {
	eventId: string;
	likes: number;
	liked: boolean;
	/** `card` is the compact heart on an event card (no outline); `page` is the pill on the event page. */
	variant?: 'page' | 'card';
}

/**
 * Like toggle: signed-out visitors are sent to log in and come back to this page. The heart and the count are drawn from the
 * event's `meLiked` / `eventLikes` in the Apollo cache, so every card and the event page change together: the optimistic
 * answer flips them at once, the real answer of `likeTargetEvent` (same fields) confirms them, and a failed call is rolled back.
 */
const LikeButton = ({ eventId, likes, liked, variant = 'page' }: Props) => {
	const { t } = useTranslation('events');
	const router = useRouter();
	const { user } = useAuth();
	const [failed, setFailed] = useState(false);
	const [like, { loading }] = useMutation(LIKE_TARGET_EVENT);

	const toggle = async (e: MouseEvent) => {
		// the heart sits on a card that is a link: only the like happens
		e.preventDefault();
		e.stopPropagation();
		if (!user) {
			router.push(loginUrl(router.asPath));
			return;
		}
		setFailed(false);
		try {
			await like({
				variables: { eventId },
				// the favorites list changed: forget it without redrawing the page that shows it (it is fetched again when opened)
				update: (cache) => {
					cache.evict({ id: 'ROOT_QUERY', fieldName: 'getFavorites', broadcast: false });
				},
				optimisticResponse: {
					likeTargetEvent: {
						__typename: 'Event',
						_id: eventId,
						eventLikes: Math.max(0, likes + (liked ? -1 : 1)),
						meLiked: [{ __typename: 'MeLiked', myFavorite: !liked }],
					},
				},
			});
		} catch (err) {
			parseApiError(err);
			setFailed(true);
		}
	};

	return (
		<div className={`tz-like${variant === 'card' ? ' tz-like--card' : ''}`}>
			<button
				type="button"
				className={`tz-like__btn${liked ? ' is-liked' : ''}`}
				aria-pressed={liked}
				aria-label={liked ? t('detail.unlike') : t('detail.like')}
				disabled={loading}
				onClick={toggle}
			>
				<Heart size={variant === 'card' ? 18 : 20} weight={liked ? 'fill' : 'regular'} aria-hidden="true" />
				<span>{formatNumber(likes, router.locale)}</span>
			</button>
			{failed && (
				<span className="tz-like__error" role="alert">
					{t('detail.likeFailed')}
				</span>
			)}
		</div>
	);
};

export default LikeButton;
