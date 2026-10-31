import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { ArrowUUpLeft, CheckCircle, Clock, Info, Prohibit, WarningCircle } from 'phosphor-react';
import { REQUEST_REFUND } from '../../../apollo/user/mutation';
import { GET_REFUND_QUOTE } from '../../../apollo/user/query';
import { formatPrice, formatViewerDate } from '../../format';
import { readRefundPolicy } from '../../refundPolicy';
import { formatRefundDeadline } from '../../refundText';
import { NETWORK_ERROR, parseApiError } from '../../errors';
import { isEligibilityError, refundMessageKey } from '../../account/refund';
import { AccountOrder, RefundQuote } from '../../types/account';

type Outcome =
	| { kind: 'success' }
	| { kind: 'already' }
	| { kind: 'error'; message: string };

/**
 * Refund state of an order and the refund action. Eligibility comes from `getRefundQuote` and from the error of
 * `requestRefund`; nothing here decides whether a refund is allowed (whole orders only, until 23:59 the day
 * before the event in the venue's time zone: backend DECISIONS #54, #55).
 */
const RefundPanel = ({ order }: { order: AccountOrder }) => {
	const { t } = useTranslation('account');
	const { t: te } = useTranslation('events');
	const { locale } = useRouter();
	const paid = order.orderStatus === 'PAID';
	const { data, loading, error, refetch } = useQuery(GET_REFUND_QUOTE, {
		variables: { orderId: order._id },
		skip: !paid,
		fetchPolicy: 'network-only',
	});
	const quote: RefundQuote | undefined = data?.getRefundQuote;
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState('');
	const [outcome, setOutcome] = useState<Outcome | null>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const [request, { loading: sending }] = useMutation(REQUEST_REFUND, {
		// The order, its tickets, the quote and the bell all change with a refund
		refetchQueries: ['GetOrderDetail', 'GetMyTicketsList', 'GetRefundQuote', 'GetUnreadNotificationCount'],
		awaitRefetchQueries: true,
	});

	useEffect(() => {
		if (outcome) statusRef.current?.focus();
	}, [outcome]);

	const submit = async () => {
		const clickedAt = Date.now();
		try {
			const { data: result } = await request({ variables: { orderId: order._id, reason: note.trim() || undefined } });
			const refundedAt = result?.requestRefund?.refundedAt as string | undefined;
			// Refunding a refunded order returns it unchanged: a refund time well before this click means it was already done
			const already = refundedAt ? new Date(refundedAt).getTime() < clickedAt - 5000 : false;
			setOutcome({ kind: already ? 'already' : 'success' });
			setOpen(false);
			setNote('');
		} catch (err) {
			const apiError = parseApiError(err);
			const key = refundMessageKey(apiError.message);
			setOutcome({
				kind: 'error',
				message: apiError.code === NETWORK_ERROR ? t('state.network') : key ? t(key) : apiError.message || t('refund.error.generic'),
			});
			setOpen(false);
			if (isEligibilityError(apiError)) refetch().catch(() => undefined);
		}
	};

	const refunded = order.orderStatus === 'REFUNDED';
	const currency = quote?.currency ?? order.currency ?? 'KRW';
	const deadline = quote ? formatRefundDeadline(quote.deadline, locale, quote.venueTimezone) : '';
	// The policy the order was bought under (the quote repeats it); the server decides, this only words it
	const policy = readRefundPolicy({ refundPolicy: quote?.refundPolicy ?? order.refundPolicy });
	const noRefunds = policy.policyType === 'NON_REFUNDABLE';

	return (
		<section className="card" aria-labelledby="refund-title">
			<h2 id="refund-title" className="card__title">
				<ArrowUUpLeft size={22} aria-hidden="true" /> {t('refund.title')}
			</h2>

			<div ref={statusRef} tabIndex={-1} className="refund__status" role="status">
				{outcome?.kind === 'success' && (
					<p className="tz-alert tz-alert--success">
						<CheckCircle size={20} aria-hidden="true" /> {t('refund.done')}
					</p>
				)}
				{outcome?.kind === 'already' && (
					<p className="tz-alert tz-alert--info">
						<Info size={20} aria-hidden="true" /> {t('refund.already')}
					</p>
				)}
				{outcome?.kind === 'error' && (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" /> {outcome.message}
					</p>
				)}
			</div>

			{refunded && (
				<p className="refund__note">
					{order.refundedAt
						? t('refund.refundedOn', { date: formatViewerDate(order.refundedAt, locale, true), amount: formatPrice(order.totalAmount, locale, order.currency ?? 'KRW') })
						: t('refund.refunded')}
				</p>
			)}

			{!paid && !refunded && <p className="refund__note">{t('refund.notPaid')}</p>}

			{paid && loading && !quote && <span className="tz-skel tz-skel--block" aria-busy="true" />}
			{paid && error && !quote && (
				<p className="refund__note" role="alert">
					{t('refund.quoteError')}{' '}
					<button type="button" className="tz-link" onClick={() => refetch()}>
						{t('state.retry')}
					</button>
				</p>
			)}

			{(paid || refunded) && noRefunds && !quote && order.refundPolicy && (
				<div className="refund__deadline">
					<Prohibit size={20} aria-hidden="true" />
					<div>
						<strong>{te('refund.nonRefundable')}</strong>
						<span>{te('refund.orderNonRefundable')}</span>
					</div>
				</div>
			)}

			{paid && quote && (
				<>
					{noRefunds ? (
						<div className="refund__deadline">
							<Prohibit size={20} aria-hidden="true" />
							<div>
								<strong>{te('refund.nonRefundable')}</strong>
								<span>{order.nonRefundableAcknowledgedAt ? te('refund.orderNonRefundable') : te('refund.nonRefundableText')}</span>
							</div>
						</div>
					) : (
						<div className="refund__deadline">
							<Clock size={20} aria-hidden="true" />
							<div>
								<strong>{t('refund.deadline', { date: deadline })}</strong>
								<span>{te('refund.rule', { when: te('refund.daysBefore', { count: policy.daysBefore }) })}</span>
							</div>
						</div>
					)}
					{noRefunds ? null : quote.refundable ? (
						<>
							<p className="refund__amount">
								<span>{t('refund.amount')}</span>
								<strong>{formatPrice(quote.refundableAmount, locale, currency)}</strong>
							</p>
							<div>
								<Button variant="contained" className="tz-btn-danger" onClick={() => { setOutcome(null); setOpen(true); }}>
									{t('refund.request')}
								</Button>
							</div>
							<p className="refund__note">{t('refund.irreversible')}</p>
						</>
					) : (
						<p className="tz-alert tz-alert--warning">
							<Info size={20} aria-hidden="true" />
							<span>
								<strong>{t('refund.notEligible')}</strong>{' '}
								{refundMessageKey(quote.reason) ? t(refundMessageKey(quote.reason)!) : quote.reason}
							</span>
						</p>
					)}
				</>
			)}

			<Dialog open={open} onClose={() => !sending && setOpen(false)} aria-labelledby="refund-dialog-title" fullWidth maxWidth="xs">
				<DialogTitle id="refund-dialog-title">{t('refund.confirmTitle')}</DialogTitle>
				<DialogContent>
					<p className="refund__confirm-amount">
						{quote ? formatPrice(quote.refundableAmount, locale, currency) : ''}
					</p>
					<p>{t('refund.confirmText')}</p>
					<label className="tz-field">
						<span className="tz-field__label">{t('refund.noteLabel')}</span>
						<textarea className="tz-input comments__input" rows={3} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
					</label>
				</DialogContent>
				<DialogActions className="refund__actions">
					<Button variant="text" onClick={() => setOpen(false)} disabled={sending}>
						{t('refund.keep')}
					</Button>
					<Button variant="contained" className="tz-btn-danger" onClick={submit} disabled={sending}>
						{sending ? t('refund.sending') : t('refund.confirm', { amount: quote ? formatPrice(quote.refundableAmount, locale, currency) : '' })}
					</Button>
				</DialogActions>
			</Dialog>
		</section>
	);
};

export default RefundPanel;
