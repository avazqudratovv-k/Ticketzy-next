import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { CREATE_COMMENT, UPDATE_COMMENT } from '../../../apollo/user/mutation';
import { GET_COMMENTS, GET_EVENT } from '../../../apollo/user/query';
import useAuth from '../../hooks/useAuth';
import { formatNumber, formatShortDate } from '../../format';
import { loginUrl } from '../../routes';
import { CommentItem } from '../../types/event';
import Avatar from '../common/OrganizerAvatar';

const PAGE = 10;
const MAX_LENGTH = 500;

/** `onTotal` reports the live number of comments: the event's own counter is not lowered when a comment is deleted. */
const Comments = ({ eventId, onTotal }: { eventId: string; onTotal?: (total: number) => void }) => {
	const { t } = useTranslation('events');
	const router = useRouter();
	const client = useApolloClient();
	const { user } = useAuth();
	const [limit, setLimit] = useState(PAGE);
	const [text, setText] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);

	const { data, loading, refetch } = useQuery(GET_COMMENTS, {
		variables: { input: { page: 1, limit, sort: 'createdAt', direction: 'DESC', search: { commentRefId: eventId } } },
		fetchPolicy: 'cache-and-network',
	});
	const [createComment, { loading: posting }] = useMutation(CREATE_COMMENT);
	const [updateComment, { loading: removing }] = useMutation(UPDATE_COMMENT);

	const list: CommentItem[] = data?.getComments?.list ?? [];
	const total: number = data?.getComments?.metaCounter?.[0]?.total ?? 0;

	useEffect(() => {
		if (data) onTotal?.(total);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, total]);

	/** The event's own comment counter changes too, so the cached event is refreshed with the list. */
	const refresh = async () => {
		await Promise.all([refetch(), client.refetchQueries({ include: [GET_EVENT] })]);
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const content = text.trim();
		if (!content) {
			setError(t('comments.empty'));
			return;
		}
		setError(null);
		try {
			await createComment({
				variables: { input: { commentGroup: 'EVENT', commentContent: content, commentRefId: eventId } },
			});
			setText('');
			await refresh();
		} catch {
			setError(t('comments.postFailed'));
		}
	};

	const onDelete = async (id: string) => {
		setError(null);
		try {
			await updateComment({ variables: { input: { _id: id, commentStatus: 'DELETE' } } });
			setConfirmId(null);
			await refresh();
		} catch {
			setConfirmId(null);
			setError(t('comments.deleteFailed'));
		}
	};

	return (
		<section className="event__section comments" aria-labelledby="event-comments">
			<h2 id="event-comments">
				{t('comments.title')} <span className="comments__count">{formatNumber(total, router.locale)}</span>
			</h2>

			{user ? (
				<form className="comments__form" onSubmit={onSubmit} noValidate>
					<label className="tz-sr" htmlFor="comment-text">
						{t('comments.label')}
					</label>
					<textarea
						id="comment-text"
						className="tz-input comments__input"
						rows={3}
						value={text}
						maxLength={MAX_LENGTH}
						placeholder={t('comments.placeholder')}
						onChange={(e) => setText(e.target.value)}
					/>
					<div className="comments__actions">
						<span className="comments__hint">{t('comments.length', { count: text.length, max: MAX_LENGTH })}</span>
						<Button type="submit" variant="contained" disabled={posting}>
							{t('comments.post')}
						</Button>
					</div>
				</form>
			) : (
				<p className="comments__login">
					<Link href={loginUrl(router.asPath)} className="tz-link">
						{t('comments.loginLink')}
					</Link>{' '}
					{t('comments.loginText')}
				</p>
			)}

			{error && (
				<p className="comments__error" role="alert">
					{error}
				</p>
			)}

			{!data && loading && <div className="tz-skel tz-skel--block" aria-hidden="true" />}
			{data && list.length === 0 && <p className="comments__none">{t('comments.none')}</p>}

			<ul className="comments__list">
				{list.map((comment) => {
					const own = user?._id === comment.memberId;
					const author = comment.memberData;
					return (
						<li key={comment._id} className="comments__item">
							<Avatar member={author ?? {}} size={36} />
							<div className="comments__body">
								<div className="comments__meta">
									<strong>{author?.memberFullName || author?.memberNick || t('comments.anonymous')}</strong>
									<time dateTime={comment.createdAt}>{formatShortDate(comment.createdAt, router.locale)}</time>
								</div>
								<p>{comment.commentContent}</p>
								{own &&
									(confirmId === comment._id ? (
										<span className="comments__confirm">
											<Button
												size="small"
												color="error"
												variant="outlined"
												disabled={removing}
												onClick={() => onDelete(comment._id)}
											>
												{t('comments.confirmDelete')}
											</Button>
											<Button size="small" variant="text" onClick={() => setConfirmId(null)}>
												{t('comments.cancel')}
											</Button>
										</span>
									) : (
										<button type="button" className="comments__delete" onClick={() => setConfirmId(comment._id)}>
											{t('comments.delete')}
										</button>
									))}
							</div>
						</li>
					);
				})}
			</ul>

			{list.length < total && (
				<Button variant="outlined" onClick={() => setLimit((n) => n + PAGE)} disabled={loading}>
					{t('comments.more')}
				</Button>
			)}
		</section>
	);
};

export default Comments;
