import { useState } from 'react';
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
}

/** Like toggle: signed-out visitors are sent to log in and come back to this page. */
const LikeButton = ({ eventId, likes, liked }: Props) => {
	const { t } = useTranslation('events');
	const router = useRouter();
	const { user } = useAuth();
	const [failed, setFailed] = useState(false);
	const [like, { loading }] = useMutation(LIKE_TARGET_EVENT);

	const toggle = async () => {
		if (!user) {
			router.push(loginUrl(router.asPath));
			return;
		}
		setFailed(false);
		try {
			await like({
				variables: { eventId },
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
		<div className="tz-like">
			<button
				type="button"
				className={`tz-like__btn${liked ? ' is-liked' : ''}`}
				aria-pressed={liked}
				aria-label={liked ? t('detail.unlike') : t('detail.like')}
				disabled={loading}
				onClick={toggle}
			>
				<Heart size={20} weight={liked ? 'fill' : 'regular'} aria-hidden="true" />
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
