import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Info } from 'phosphor-react';

/**
 * Explains what cancelling an APPROVED event does, in the backend's own terms (cancelEventByAdmin, DECISIONS #38, #56).
 * There is no organizer mutation for it, so this dialog cannot cancel: it says so and what to do instead.
 */
const CancelDialog = ({ open, eventTitle, onClose }: { open: boolean; eventTitle: string; onClose: () => void }) => {
	const { t } = useTranslation('organizer');
	const points = ['closed', 'refunds', 'used', 'notices', 'retry', 'stock'] as const;
	return (
		<Dialog open={open} onClose={onClose} aria-labelledby="cancel-title" fullWidth maxWidth="sm">
			<DialogTitle id="cancel-title">{t('cancel.title')}</DialogTitle>
			<DialogContent>
				<p className="org-dialog__event">{eventTitle}</p>
				<p>{t('cancel.intro')}</p>
				<ul className="org-points">
					{points.map((point) => (
						<li key={point}>{t(`cancel.points.${point}`)}</li>
					))}
				</ul>
				<p className="tz-alert tz-alert--info" role="note">
					<Info size={20} aria-hidden="true" />
					<span>
						<strong>{t('cancel.unavailableTitle')}</strong> {t('cancel.unavailableText')}
					</span>
				</p>
			</DialogContent>
			<DialogActions className="org-dialog__actions">
				<Button variant="contained" onClick={onClose}>
					{t('cancel.close')}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CancelDialog;
