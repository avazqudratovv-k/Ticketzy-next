import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { WarningCircle } from 'phosphor-react';
import { AdminError, describeAdminError } from '../../admin/errors';
import { formatNumber, formatPrice } from '../../format';
import { PAYOUT_NOTE_MAX, PayoutRow } from '../../payouts';

interface Props {
	payout: PayoutRow | null;
	onClose: () => void;
	/** Throws when the backend refuses; the message is shown in the dialog and the dialog stays open. */
	onConfirm: (payout: PayoutRow, note: string) => Promise<void>;
}

/** Confirm "Mark as paid out": the amounts, an optional note (max 300), and the backend's refusal text if any. */
const MarkPaidDialog = ({ payout, onClose, onConfirm }: Props) => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const id = useId();
	const [note, setNote] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<AdminError | null>(null);
	// a ref as well as the state: two quick clicks must not send two requests before React re-renders
	const busy = useRef(false);
	const eventId = payout?.eventId;

	useEffect(() => {
		setNote('');
		setError(null);
	}, [eventId]);

	const money = (amount: number) => formatPrice(amount, locale, 'KRW');

	const confirm = async () => {
		if (!payout || busy.current) return;
		busy.current = true;
		setSending(true);
		setError(null);
		try {
			await onConfirm(payout, note.trim());
		} catch (err) {
			setError(describeAdminError(err));
		} finally {
			busy.current = false;
			setSending(false);
		}
	};

	const organizer = payout?.organizerNick || payout?.organizerEmail || '–';

	return (
		<Dialog open={Boolean(payout)} onClose={() => !sending && onClose()} aria-labelledby={`${id}-title`} fullWidth maxWidth="sm">
			<DialogTitle id={`${id}-title`}>{t('payouts.dialog.title')}</DialogTitle>
			<DialogContent>
				{payout && (
					<>
						<p className="org-dialog__event">{payout.eventTitle}</p>
						<dl className="org-dl adm-dl">
							<div>
								<dt>{t('payouts.cols.organizer')}</dt>
								<dd>
									{organizer}
									{payout.organizerNick && payout.organizerEmail && <span className="org-row__meta adm-block">{payout.organizerEmail}</span>}
								</dd>
							</div>
							<div>
								<dt>{t('payouts.cols.gross')}</dt>
								<dd>{money(payout.gross)}</dd>
							</div>
							<div>
								<dt>{t('payouts.cols.commission')}</dt>
								<dd>−{money(payout.commission)}</dd>
							</div>
							<div>
								<dt>{t('payouts.dialog.net')}</dt>
								<dd>
									<strong>{money(payout.net)}</strong>
									<span className="org-row__meta adm-block">{t('payouts.dialog.orders', { n: formatNumber(payout.orderCount, locale) })}</span>
								</dd>
							</div>
						</dl>
						<p className="org-dialog__note">{t('payouts.dialog.demo')}</p>
						<div className="tz-field">
							<label htmlFor={`${id}-note`} className="tz-field__label">
								{t('payouts.dialog.noteLabel')}
							</label>
							<textarea
								id={`${id}-note`}
								className="tz-input"
								rows={3}
								maxLength={PAYOUT_NOTE_MAX}
								value={note}
								aria-describedby={`${id}-hint`}
								onChange={(event) => setNote(event.target.value)}
							/>
							<span id={`${id}-hint`} className="tz-field__hint adm-counter">
								<span>{t('payouts.dialog.noteHint')}</span>
								<span>
									{formatNumber(note.length, locale)} / {formatNumber(PAYOUT_NOTE_MAX, locale)}
								</span>
							</span>
						</div>
					</>
				)}
				{error && (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" />
						<span>{error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic')}</span>
					</p>
				)}
			</DialogContent>
			<DialogActions className="org-dialog__actions">
				<Button variant="text" onClick={onClose} disabled={sending}>
					{t('actions.back')}
				</Button>
				<Button variant="contained" onClick={confirm} disabled={sending}>
					{sending ? t('payouts.dialog.sending') : t('payouts.dialog.confirm')}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default MarkPaidDialog;
