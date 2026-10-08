import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Clock, Prohibit, WarningCircle } from 'phosphor-react';
import useAuth from '../../hooks/useAuth';
import StateBlock from '../states/StateBlock';
import { ROUTES } from '../../routes';
import { OrganizerAccess } from '../../organizer/events';

/**
 * Said instead of the page when the organizer cannot write yet. The backend refuses every organizer operation of a
 * PENDING, REJECTED or SUSPENDED account (ActiveOrganizerGuard), so the pages do not even try.
 */
const BlockedPanel = ({ access, action }: { access: Exclude<OrganizerAccess, 'active'>; action: 'create' | 'events' | 'venues' }) => {
	const { t } = useTranslation('organizer');
	const { user } = useAuth();
	const Icon = access === 'pending' ? Clock : access === 'rejected' ? WarningCircle : Prohibit;
	return (
		<StateBlock
			icon={<Icon size={28} />}
			title={t(`blocked.${access}.title`)}
			text={t(`blocked.${access}.${action}`)}
			actions={
				<>
					{access === 'rejected' && user?.rejectReason && (
						<p className="tz-alert tz-alert--error" role="note">
							<WarningCircle size={20} aria-hidden="true" />
							<span>{t('blocked.reason', { reason: user.rejectReason })}</span>
						</p>
					)}
					<Button component={Link} href={ROUTES.organizerDashboard} variant="outlined">
						{t('blocked.back')}
					</Button>
				</>
			}
		/>
	);
};

export default BlockedPanel;
