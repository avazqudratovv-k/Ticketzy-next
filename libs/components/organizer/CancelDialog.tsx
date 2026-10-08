import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { WarningCircle } from 'phosphor-react';
import { CANCEL_MY_EVENT } from '../../../apollo/organizer/mutation';
import { describeError, Described } from '../../organizer/errors';

const REASON_MAX = 500;

interface Props {
	open: boolean;
	eventId: string;
	eventTitle: string;
	onClose: () => void;
	/** called after the backend accepted the cancel */
	onCancelled: () => void;
}

/**
 * `cancelMyEvent` (backend DECISIONS #69): needs a reason, cancels for good and refunds every paid order.
 * The backend's messages are mapped to translated text; unknown ones are shown as sent.
 */
const CancelDialog = ({ open, eventId, eventTitle, onClose, onCancelled }: Props) => {
	const { t } = useTranslation('organizer');
	const client = useApolloClient();
	const [reason, setReason] = useState('');
	const [touched, setTouched] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Described | null>(null);
	const points = ['closed', 'refunds', 'used', 'notices', 'retry', 'stock'] as const;

	useEffect(() => {
		if (open) {
			setReason('');
			setTouched(false);
			setError(null);
		}
	}, [open, eventId]);

	const missing = reason.trim().length === 0;

	const confirm = async () => {
		setTouched(true);
		if (missing) return;
		setLoading(true);
		setError(null);
		try {
			await client.mutate({ mutation: CANCEL_MY_EVENT, variables: { input: { eventId, reason: reason.trim() } } });
			onCancelled();
		} catch (err) {
			setError(describeError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={() => !loading && onClose()} aria-labelledby="cancel-title" fullWidth maxWidth="sm">
			<DialogTitle id="cancel-title">{t('cancel.title')}</DialogTitle>
			<DialogContent>
				<p className="org-dialog__event">{eventTitle}</p>
				<p className="tz-alert tz-alert--warning" role="note">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('cancel.refundTitle')}</strong> {t('cancel.refundText')}
					</span>
				</p>
				<p>{t('cancel.intro')}</p>
				<ul className="org-points">
					{points.map((point) => (
						<li key={point}>{t(`cancel.points.${point}`)}</li>
					))}
				</ul>
				<div className="tz-field">
					<label htmlFor="cancel-reason" className="tz-field__label">
						{t('cancel.reasonLabel')} <span className="org-req" aria-hidden="true">*</span>
					</label>
					<textarea
						id="cancel-reason"
						className="tz-input"
						rows={3}
						maxLength={REASON_MAX}
						required
						value={reason}
						aria-invalid={touched && missing}
						aria-describedby="cancel-reason-hint"
						onChange={(event) => setReason(event.target.value)}
						onBlur={() => setTouched(true)}
					/>
					<span id="cancel-reason-hint" className={touched && missing ? 'tz-field__error' : 'tz-field__hint'}>
						{touched && missing ? t('cancel.reasonRequired') : t('cancel.reasonHint')}
					</span>
				</div>
				{error && (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" />
						<span>{error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic')}</span>
					</p>
				)}
			</DialogContent>
			<DialogActions className="org-dialog__actions">
				<Button variant="text" onClick={onClose} disabled={loading}>
					{t('cancel.keep')}
				</Button>
				<Button variant="contained" className="org-btn-danger-solid" onClick={confirm} disabled={loading}>
					{loading ? t('cancel.sending') : t('cancel.confirm')}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CancelDialog;
