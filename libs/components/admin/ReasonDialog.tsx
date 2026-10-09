import { ReactNode, useEffect, useId, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { WarningCircle } from 'phosphor-react';
import { AdminError, describeAdminError } from '../../admin/errors';

const REASON_MAX = 500;

interface Props {
	open: boolean;
	title: string;
	/** The thing being acted on (event title, organizer name) */
	subject: string;
	/** Short explanation under the subject */
	children?: ReactNode;
	reasonLabel: string;
	reasonHint: string;
	reasonRequired: string;
	confirmLabel: string;
	sendingLabel: string;
	cancelLabel: string;
	/** red button for destructive actions */
	danger?: boolean;
	onClose: () => void;
	/** Throws when the backend refuses; the message is shown in the dialog and the dialog stays open. */
	onSubmit: (reason: string) => Promise<void>;
}

/** A required free-text reason plus a confirm button: reject an event or organizer, cancel an event, suspend an organizer. */
const ReasonDialog = ({
	open,
	title,
	subject,
	children,
	reasonLabel,
	reasonHint,
	reasonRequired,
	confirmLabel,
	sendingLabel,
	cancelLabel,
	danger,
	onClose,
	onSubmit,
}: Props) => {
	const { t } = useTranslation('admin');
	const id = useId();
	const [reason, setReason] = useState('');
	const [touched, setTouched] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<AdminError | null>(null);

	useEffect(() => {
		if (open) {
			setReason('');
			setTouched(false);
			setError(null);
		}
	}, [open, subject]);

	const missing = reason.trim().length === 0;

	const confirm = async () => {
		setTouched(true);
		if (missing) return;
		setLoading(true);
		setError(null);
		try {
			await onSubmit(reason.trim());
		} catch (err) {
			setError(describeAdminError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={() => !loading && onClose()} aria-labelledby={`${id}-title`} fullWidth maxWidth="sm">
			<DialogTitle id={`${id}-title`}>{title}</DialogTitle>
			<DialogContent>
				<p className="org-dialog__event">{subject}</p>
				{children}
				<div className="tz-field">
					<label htmlFor={`${id}-reason`} className="tz-field__label">
						{reasonLabel} <span className="org-req" aria-hidden="true">*</span>
					</label>
					<textarea
						id={`${id}-reason`}
						className="tz-input"
						rows={3}
						maxLength={REASON_MAX}
						required
						value={reason}
						aria-invalid={touched && missing}
						aria-describedby={`${id}-hint`}
						onChange={(event) => setReason(event.target.value)}
						onBlur={() => setTouched(true)}
					/>
					<span id={`${id}-hint`} className={touched && missing ? 'tz-field__error' : 'tz-field__hint'}>
						{touched && missing ? reasonRequired : reasonHint}
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
					{cancelLabel}
				</Button>
				<Button variant="contained" className={danger ? 'org-btn-danger-solid' : undefined} onClick={confirm} disabled={loading}>
					{loading ? sendingLabel : confirmLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default ReasonDialog;
