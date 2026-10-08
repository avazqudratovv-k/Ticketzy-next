import { useTranslation } from 'next-i18next';
import useAuth from '../../hooks/useAuth';

/** Shown to an organizer whose account is still PENDING; they can sign in but not create events yet. */
const PendingBanner = () => {
	const { t } = useTranslation('common');
	const { isPendingOrganizer } = useAuth();
	if (!isPendingOrganizer) return null;
	return (
		<div className="tz-banner" role="status">
			<div className="tz-container tz-banner__inner">
				<strong>{t('banner.pendingTitle')}</strong>
				<span>{t('banner.pendingText')}</span>
			</div>
		</div>
	);
};

export default PendingBanner;
