import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CheckCircle, Info } from 'phosphor-react';
import { COMMISSION_TIERS, CommissionState } from '../../../organizer/commission';
import { formatNumber, formatViewerDate } from '../../../format';

/** The commission tier in words: the rate now, the ladder, how many completed events are left, and any admin override with its end date. */
const CommissionTier = ({ state, completed }: { state: CommissionState; completed: number }) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const { override } = state;
	return (
		<div className="org-tier">
			<div className="org-tier__rate">
				<strong>{t('commission.rate', { rate: formatNumber(state.rate, locale) })}</strong>
				<span className="org-hint">
					{state.overrideActive ? t('commission.byOverride') : t(`commission.tierName.${state.tierIndex}`)}
				</span>
			</div>

			{state.overrideActive && override && (
				<p className="tz-alert tz-alert--info" role="note">
					<Info size={20} aria-hidden="true" />
					<span>
						<strong>{t('commission.overrideTitle', { rate: formatNumber(override.rate, locale) })}</strong>{' '}
						{override.endsAt ? t('commission.overrideUntil', { date: formatViewerDate(override.endsAt, locale, true) }) : t('commission.overrideOpen')}{' '}
						{override.reason ? t('commission.overrideReason', { reason: override.reason }) : ''}{' '}
						{t('commission.overrideThen', { rate: formatNumber(state.automatic, locale) })}
					</span>
				</p>
			)}
			{!state.overrideActive && override && (
				<p className="org-hint">{t('commission.overrideExpired', { rate: formatNumber(override.rate, locale), date: override.endsAt ? formatViewerDate(override.endsAt, locale) : '' })}</p>
			)}

			<ol className="org-ladder" aria-label={t('commission.ladder')}>
				{COMMISSION_TIERS.map((tier, index) => {
					const reached = index <= state.tierIndex;
					return (
						<li key={tier.from} className={`org-ladder__step${index === state.tierIndex ? ' is-current' : ''}`} aria-current={index === state.tierIndex ? 'step' : undefined}>
							<span className="org-ladder__rate">{formatNumber(tier.rate, locale)}%</span>
							<span className="org-ladder__text">{t(`commission.step.${index}`, { count: tier.from })}</span>
							<span className="org-ladder__state">
								{reached ? <CheckCircle size={16} weight="fill" aria-hidden="true" /> : null}
								{index === state.tierIndex ? t('commission.yourTier') : reached ? t('commission.reached') : t('commission.locked')}
							</span>
						</li>
					);
				})}
			</ol>

			<p className="org-hint">
				{t('commission.completed', { count: completed, n: formatNumber(completed, locale) })}{' '}
				{state.next
					? t('commission.remaining', { count: state.next.remaining, n: formatNumber(state.next.remaining, locale), rate: formatNumber(state.next.rate, locale) })
					: t('commission.top')}
			</p>
			<p className="org-hint">{t('commission.appliesNote')}</p>
		</div>
	);
};

export default CommissionTier;
