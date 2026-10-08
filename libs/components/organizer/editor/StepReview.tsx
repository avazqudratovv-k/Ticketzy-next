import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { CheckCircle, Circle } from 'phosphor-react';
import { formatEventDate, formatNumber, formatPrice } from '../../../format';
import { isUntouched } from '../../../organizer/useEventEditor';
import { StepId, submitChecks } from '../../../organizer/form';
import { zonedToIso } from '../../../organizer/zoned';
import { TRANSLATED_LOCALES } from '../../../organizer/types';
import { StepProps } from './types';

const StepReview = ({ editor, onGo }: StepProps & { onGo: (step: StepId) => void }) => {
	const { t } = useTranslation('organizer');
	const { t: te } = useTranslation('events');
	const { locale } = useRouter();
	const { values, rows, venue, errors } = editor;
	const filled = rows.filter((row) => !isUntouched(row, values.seatingType));
	const checks = submitChecks(values, filled, venue);
	const zone = venue?.venueTimezone;
	const start = zonedToIso(values.startDate, values.startTime, zone);
	const end = zonedToIso(values.endDate, values.endTime, zone);
	const translated = TRANSLATED_LOCALES.filter((code) => values.translations[code].title.trim());
	const problems = Object.keys(errors).length > 0;

	const Row = ({ step, label, children }: { step: StepId; label: string; children: React.ReactNode }) => (
		<div className="org-review__row">
			<dt>{label}</dt>
			<dd>{children}</dd>
			<button type="button" className="tz-link org-linkbtn" onClick={() => onGo(step)}>
				{t('form.review.edit')}
				<span className="org-visually-hidden"> {label}</span>
			</button>
		</div>
	);

	return (
		<div className="org-fields">
			<dl className="org-review">
				<Row step="details" label={t('form.steps.details')}>
					<strong>{values.title || '–'}</strong>
					<span>{values.category ? te(`categories.${values.category}`) : '–'}</span>
				</Row>
				<Row step="images" label={t('form.steps.images')}>
					{t('form.review.images', { count: values.images.length })}
				</Row>
				<Row step="venue" label={t('form.steps.venue')}>
					<strong>{venue ? `${venue.venueName}, ${venue.venueCity}` : '–'}</strong>
					<span>{t(`form.venue.seatingType.${values.seatingType}`)}</span>
					<span>{start ? `${formatEventDate(start, locale, zone, true)}${end ? ` → ${formatEventDate(end, locale, zone, true)}` : ''}` : '–'}</span>
				</Row>
				<Row step="tickets" label={t('form.steps.tickets')}>
					{filled.length === 0 ? (
						'–'
					) : (
						filled.map((row) => (
							<span key={row.key}>
								{row.name || row.tierKey} · {row.price ? formatPrice(Number(row.price), locale, 'KRW') : '–'} · {t('form.review.tickets', { count: Number(row.quantity) || 0, formatted: formatNumber(Number(row.quantity) || 0, locale) })}
							</span>
						))
					)}
				</Row>
				<Row step="translations" label={t('form.steps.translations')}>
					{translated.length === 0 ? t('form.review.noTranslations') : translated.map((code) => t(`form.translations.locales.${code}`)).join(', ')}
				</Row>
			</dl>

			<h3 className="org-subtitle">{t('submit.checksLabel')}</h3>
			<ul className="org-checks">
				{checks.map((check) => (
					<li key={check.id} className={check.ok ? '' : 'is-bad'}>
						{check.ok ? <CheckCircle size={20} weight="fill" aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
						<span>
							{t(`submit.check.${check.id}`)}
							{!check.ok && <span className="org-checks__state"> {t('submit.missing')}</span>}
						</span>
					</li>
				))}
			</ul>
			{problems && <p className="tz-field__error">{t('form.review.fixErrors')}</p>}
			<p className="org-hint">{t('form.review.after')}</p>
		</div>
	);
};

export default StepReview;
