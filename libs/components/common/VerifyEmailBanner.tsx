import { useTranslation } from 'next-i18next';
import useAuth from '../../hooks/useAuth';
import { MemberType } from '../../enums/member.enum';
import ResendVerification from '../auth/ResendVerification';

/**
 * Shown to a signed-in member whose email is not confirmed yet. Buying (hold, checkout, pay) and an organizer's approval
 * both need it (backend #135); they can still browse. Only `emailVerified === false` counts, so a profile from an older API never shows it.
 */
const VerifyEmailBanner = () => {
	const { t } = useTranslation('common');
	const { user } = useAuth();
	if (!user || user.emailVerified !== false) return null;
	const buyer = user.memberType === MemberType.USER;
	return (
		<div className="tz-banner" role="region" aria-label={t('banner.verifyLabel')}>
			<div className="tz-container tz-banner__inner tz-banner__inner--action">
				<span className="tz-banner__text">
					<strong>{buyer ? t('banner.verifyTitle') : t('banner.verifyTitleOther')}</strong> <span>{t('banner.verifyText')}</span>
				</span>
				<ResendVerification />
			</div>
		</div>
	);
};

export default VerifyEmailBanner;
