import { useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Robot, WarningCircle, CheckCircle, ArrowClockwise, Info } from 'phosphor-react';
import { RUN_EVENT_MODERATION_BY_ADMIN } from '../../../apollo/admin/mutation';
import { aiKeyOf, describeAdminError, AdminError } from '../../admin/errors';
import { Moderation } from '../../admin/types';
import { formatNumber, formatViewerDate } from '../../format';
import { useRouter } from 'next/router';

const FLAG_TYPES = ['DUPLICATE', 'SUSPICIOUS', 'INAPPROPRIATE', 'MISLEADING_PRICE'];
const percent = (value: number | null | undefined, locale?: string) =>
	typeof value === 'number' ? `${formatNumber(Math.round(value * 100), locale)}%` : null;

/** Short summary for lists: flag count, "no flags" or "not checked". */
export const moderationSummary = (m?: Moderation | null): 'none' | 'notChecked' | 'clean' | 'flagged' => {
	if (!m) return 'none';
	if (m.checked === false) return 'notChecked';
	return m.flags.length ? 'flagged' : 'clean';
};

interface Props {
	eventId: string;
	moderation?: Moderation | null;
	/** Called after a new result was stored, so the page can refresh */
	onDone?: () => void;
}

/**
 * The stored AI moderation result of a submission and the "Run AI check" action.
 * Advisory only: the backend flags, it never changes an event's status (DECISIONS #60), and the admin always decides.
 */
const ModerationPanel = ({ eventId, moderation, onDone }: Props) => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const client = useApolloClient();
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<AdminError | null>(null);
	const state = moderationSummary(moderation);

	const run = async () => {
		setRunning(true);
		setError(null);
		try {
			await client.mutate({ mutation: RUN_EVENT_MODERATION_BY_ADMIN, variables: { eventId } });
			onDone?.();
		} catch (err) {
			setError(describeAdminError(err, 'ai'));
		} finally {
			setRunning(false);
		}
	};

	const reasonKey = aiKeyOf(moderation?.reason);
	const flagLabel = (type: string) => (FLAG_TYPES.includes(type) ? t(`ai.flags.${type}`) : type);

	return (
		<section className="adm-card adm-ai" aria-labelledby="ai-title">
			<div className="adm-card__head">
				<h2 id="ai-title" className="adm-card__title">
					<Robot size={20} aria-hidden="true" /> {t('ai.title')}
				</h2>
				<Button variant="outlined" size="small" onClick={run} disabled={running} startIcon={<ArrowClockwise size={16} aria-hidden="true" />}>
					{running ? t('ai.running') : state === 'none' ? t('ai.run') : t('ai.runAgain')}
				</Button>
			</div>
			<p className="adm-ai__advisory">
				<Info size={16} aria-hidden="true" /> {t('ai.advisory')}
			</p>

			{error && (
				<p className="tz-alert tz-alert--warning" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('ai.unavailable')}</strong>{' '}
						{error.network ? t('errors.network') : error.key ? t(`ai.errors.${error.key}`) : error.raw || t('ai.errors.failed')}
						<br />
						{t('ai.continue')}
					</span>
				</p>
			)}

			{state === 'none' && !error && <p className="adm-muted">{t('ai.none')}</p>}

			{state === 'notChecked' && (
				<p className="tz-alert tz-alert--warning" role="status">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('ai.notChecked')}</strong> {reasonKey && reasonKey !== 'notChecked' ? t(`ai.errors.${reasonKey}`) : t('ai.notCheckedText')}
						{moderation?.checkedAt && <> {t('ai.triedAt', { date: formatViewerDate(moderation.checkedAt, locale, true) })}</>}
					</span>
				</p>
			)}

			{(state === 'clean' || state === 'flagged') && moderation && (
				<>
					<p className={`adm-ai__verdict adm-ai__verdict--${state}`}>
						{state === 'clean' ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : <WarningCircle size={20} weight="fill" aria-hidden="true" />}
						<span>
							{state === 'clean' ? t('ai.clean') : t('ai.flagged', { count: moderation.flags.length })}
							{percent(moderation.confidence, locale) && <span className="adm-muted"> · {t('ai.confidence', { value: percent(moderation.confidence, locale) })}</span>}
						</span>
					</p>
					{moderation.reason && <p className="adm-ai__summary">{moderation.reason}</p>}
					{moderation.flags.length > 0 && (
						<ul className="adm-flags">
							{moderation.flags.map((flag, index) => (
								<li key={`${flag.type}-${index}`} className="adm-flag">
									<div className="adm-flag__head">
										<strong>{flagLabel(flag.type)}</strong>
										{percent(flag.confidence, locale) && <span className="adm-muted">{t('ai.confidence', { value: percent(flag.confidence, locale) })}</span>}
									</div>
									{flag.reason && <p>{flag.reason}</p>}
								</li>
							))}
						</ul>
					)}
					<p className="adm-muted adm-ai__meta">
						{t('ai.checkedAt', { date: moderation.checkedAt ? formatViewerDate(moderation.checkedAt, locale, true) : '–', model: moderation.model || '–' })}
					</p>
				</>
			)}
			<p className="adm-muted adm-ai__foot">{t('ai.decisionYours')}</p>
		</section>
	);
};

export default ModerationPanel;
