import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { CheckCircle, Circle, WarningCircle } from 'phosphor-react';
import { Check, CheckId } from '../../organizer/form';
import { Described } from '../../organizer/errors';

const ALL_CHECKS: CheckId[] = ['title', 'image', 'dates', 'venue', 'ticketType'];

interface Props {
	open: boolean;
	eventTitle: string;
	/** the live result of each check (the editor knows it); without it the list is static (the events list) */
	checks?: Check[];
	/** true when the event is APPROVED and saving sends it back to review */
	resubmit?: boolean;
	loading: boolean;
	error: Described | null;
	onClose: () => void;
	onConfirm: () => void;
	/** offered when the server refused: takes the organizer to the form */
	onFix?: () => void;
}

/** What will be checked and what happens next, before `submitEventForApproval` (backend DECISIONS #36). */
const SubmitDialog = ({ open, eventTitle, checks, loading, error, onClose, onConfirm, onFix }: Props) => {
	const { t } = useTranslation('organizer');
	const list = checks ?? ALL_CHECKS.map((id) => ({ id, ok: true }));
	const blocked = Boolean(checks && checks.some((check) => !check.ok));

	return (
		<Dialog open={open} onClose={() => !loading && onClose()} aria-labelledby="submit-title" fullWidth maxWidth="xs">
			<DialogTitle id="submit-title">{t('submit.title')}</DialogTitle>
			<DialogContent>
				<p className="org-dialog__event">{eventTitle}</p>
				<p>{t('submit.intro')}</p>
				<ul className="org-checks" aria-label={t('submit.checksLabel')}>
					{list.map((check) => (
						<li key={check.id} className={check.ok || !checks ? '' : 'is-bad'}>
							{check.ok || !checks ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
							<span>
								{t(`submit.check.${check.id}`)}
								{checks && !check.ok && <span className="org-checks__state"> {t('submit.missing')}</span>}
							</span>
						</li>
					))}
				</ul>
				<p className="org-dialog__note">{t('submit.after')}</p>
				{error && (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" />
						<span>{error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic')}</span>
					</p>
				)}
			</DialogContent>
			<DialogActions className="org-dialog__actions">
				<Button variant="text" onClick={onClose} disabled={loading}>
					{t('submit.cancel')}
				</Button>
				{error && onFix ? (
					<Button variant="contained" onClick={onFix}>
						{t('submit.fix')}
					</Button>
				) : (
					<Button variant="contained" onClick={onConfirm} disabled={loading || blocked}>
						{loading ? t('submit.sending') : t('submit.confirm')}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
};

export default SubmitDialog;
