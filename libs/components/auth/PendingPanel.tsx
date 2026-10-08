import Link from 'next/link';
import { Button } from '@mui/material';
import { Check, Clock } from 'phosphor-react';
import { useTranslation } from 'next-i18next';
import { ROUTES } from '../../routes';

/** "Awaiting approval" screen after organizer signup (design: OrgPending). */
const PendingPanel = () => {
	const { t } = useTranslation('auth');
	return (
		<div className="pg-pending" role="status">
			<span className="pg-pending__icon">
				<Clock size={32} aria-hidden="true" />
			</span>
			<span className="pg-pending__badge">
				<Clock size={14} aria-hidden="true" />
				{t('pending.badge')}
			</span>
			<h1>{t('pending.title')}</h1>
			<p>{t('pending.text')}</p>
			<ol className="pg-pending__steps">
				<li>
					<span className="pg-pending__num pg-pending__done">
						<Check size={14} aria-hidden="true" />
					</span>
					{t('pending.stepCreated')}
				</li>
				<li aria-current="step">
					<span className="pg-pending__num">2</span>
					{t('pending.stepReview')}
				</li>
				<li>
					<span className="pg-pending__num">3</span>
					{t('pending.stepDecision')}
				</li>
			</ol>
			<div className="pg-pending__actions">
				<Button component={Link} href={ROUTES.organizerDashboard} variant="contained">
					{t('pending.toDashboard')}
				</Button>
				<Button component={Link} href={ROUTES.home} variant="outlined">
					{t('pending.toHome')}
				</Button>
			</div>
		</div>
	);
};

export default PendingPanel;
