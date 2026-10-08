import { useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { CheckCircle, Info, Sparkle, WarningCircle } from 'phosphor-react';
import { TRANSLATE_EVENT } from '../../../../apollo/organizer/mutation';
import { describeError, Described } from '../../../organizer/errors';
import { LIMITS } from '../../../organizer/form';
import { TRANSLATED_LOCALES, TranslatedLocale } from '../../../organizer/types';
import { FormField, useErrorText } from './fields';
import { StepProps } from './types';

type Suggestions = Partial<Record<TranslatedLocale, { title: string; description: string }>>;

const StepTranslations = ({ editor, readOnly }: StepProps) => {
	const { t } = useTranslation('organizer');
	const text = useErrorText();
	const client = useApolloClient();
	const { values, errors, setTranslation, event, mode, basicsDirty, save, saving } = editor;
	const [active, setActive] = useState<TranslatedLocale>('KO');
	const [suggestions, setSuggestions] = useState<Suggestions>({});
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState<{ ai?: Described; save?: boolean; review?: boolean; create?: boolean } | null>(null);
	const hasSuggestion = Object.keys(suggestions).length > 0;
	const titleReady = values.title.trim().length >= LIMITS.title.min;

	const filled = (locale: TranslatedLocale) => Boolean(values.translations[locale].title.trim());

	/** The backend translates the title and description saved on the event, so those are saved first (as a draft). Nothing else is saved. */
	const translate = async () => {
		setProblem(null);
		if (!event) {
			setProblem({ create: true });
			return;
		}
		if (mode === 'review' && basicsDirty) {
			setProblem({ review: true });
			return;
		}
		setBusy(true);
		try {
			let eventId = event._id;
			if (basicsDirty) {
				const result = await save();
				if (!result.ok) {
					setProblem({ save: true });
					return;
				}
				eventId = result.event._id;
			}
			const { data } = await client.mutate({ mutation: TRANSLATE_EVENT, variables: { input: { eventId, targetLocales: TRANSLATED_LOCALES } } });
			const next: Suggestions = {};
			for (const item of data.translateEvent as { locale: string; title: string; description?: string | null }[]) {
				if ((TRANSLATED_LOCALES as string[]).includes(item.locale)) {
					next[item.locale as TranslatedLocale] = { title: item.title, description: item.description ?? '' };
				}
			}
			setSuggestions(next);
		} catch (err) {
			setProblem({ ai: describeError(err, 'ai') });
		} finally {
			setBusy(false);
		}
	};

	const accept = (locale: TranslatedLocale) => {
		const suggestion = suggestions[locale];
		if (!suggestion) return;
		setTranslation(locale, 'title', suggestion.title);
		setTranslation(locale, 'description', suggestion.description);
		dismiss(locale);
	};
	const dismiss = (locale: TranslatedLocale) =>
		setSuggestions((current) => {
			const { [locale]: _gone, ...rest } = current;
			void _gone;
			return rest;
		});

	const suggestion = suggestions[active];
	const current = values.translations[active];
	const aiText = (error: Described) => (error.network ? t('errors.network') : error.key ? t(`ai.errors.${error.key}`) : t('ai.errors.failed'));

	return (
		<div className="org-fields">
			<div className="org-aihead">
				<p>{t('form.translations.intro')}</p>
				{!readOnly && (
					<Button variant="outlined" startIcon={<Sparkle size={20} aria-hidden="true" />} onClick={translate} disabled={busy || saving || !titleReady}>
						{busy ? t('ai.working') : t('ai.button')}
					</Button>
				)}
			</div>
			{!readOnly && !titleReady && <p className="org-hint">{t('ai.needTitle')}</p>}
			{!readOnly && <p className="org-hint">{t('ai.notSaved')}</p>}

			{problem?.ai && (
				<p className="tz-alert tz-alert--warning" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						{aiText(problem.ai)} {t('ai.manual')}
					</span>
				</p>
			)}
			{problem?.save && (
				<p className="tz-alert tz-alert--warning" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>{t('ai.saveFirst')}</span>
				</p>
			)}
			{problem?.create && (
				<p className="tz-alert tz-alert--warning" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>{t('ai.createFirst')}</span>
				</p>
			)}
			{problem?.review && (
				<p className="tz-alert tz-alert--warning" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>{t('ai.saveFirstApproved')}</span>
				</p>
			)}
			{hasSuggestion && (
				<p className="tz-alert tz-alert--info" role="status">
					<Info size={20} aria-hidden="true" />
					<span>
						<strong>{t('ai.reviewTitle')}</strong> {t('ai.reviewText')}
					</span>
				</p>
			)}

			<div className="org-langs" role="tablist" aria-label={t('form.translations.tabs')}>
				{TRANSLATED_LOCALES.map((locale) => (
					<button key={locale} type="button" role="tab" id={`lang-${locale}`} aria-selected={active === locale} aria-controls="lang-panel" className="org-lang" onClick={() => setActive(locale)}>
						{t(`form.translations.locales.${locale}`)}
						{filled(locale) && <CheckCircle size={16} weight="fill" aria-label={t('form.translations.filled')} />}
						{suggestions[locale] && <span className="org-lang__dot" aria-label={t('ai.hasSuggestion')} />}
					</button>
				))}
			</div>

			<div id="lang-panel" role="tabpanel" aria-labelledby={`lang-${active}`} className="org-fields">
				<div className="org-source">
					<span className="tz-field__label">{t('form.translations.source')}</span>
					<p className="org-source__title">{values.title || '–'}</p>
					<p className="org-source__text">{values.description || t('form.translations.noDescription')}</p>
				</div>

				{suggestion && (
					<div className="org-suggestion" role="group" aria-label={t('ai.suggestionFor', { language: t(`form.translations.locales.${active}`) })}>
						<div className="org-suggestion__head">
							<Sparkle size={18} aria-hidden="true" />
							<strong>{t('ai.suggestionFor', { language: t(`form.translations.locales.${active}`) })}</strong>
						</div>
						<p className="org-suggestion__title" lang={active.toLowerCase()}>
							{suggestion.title}
						</p>
						{suggestion.description && (
							<p className="org-suggestion__text" lang={active.toLowerCase()}>
								{suggestion.description}
							</p>
						)}
						<div className="org-suggestion__actions">
							<Button variant="contained" size="small" onClick={() => accept(active)}>
								{filled(active) ? t('ai.replace') : t('ai.use')}
							</Button>
							<Button variant="text" size="small" onClick={() => dismiss(active)}>
								{t('ai.dismiss')}
							</Button>
						</div>
					</div>
				)}

				<FormField label={t('form.translations.title', { language: t(`form.translations.locales.${active}`) })} error={text(errors[`${active}.title`])} hint={t('form.translations.titleHint', LIMITS.title)}>
					<input className="tz-input" lang={active.toLowerCase()} value={current.title} maxLength={LIMITS.title.max} disabled={readOnly} onChange={(event) => setTranslation(active, 'title', event.target.value)} />
				</FormField>
				<FormField label={t('form.translations.description', { language: t(`form.translations.locales.${active}`) })} error={text(errors[`${active}.description`])} hint={t('form.translations.descriptionHint', LIMITS.description)}>
					<textarea className="tz-input org-textarea" rows={5} lang={active.toLowerCase()} value={current.description} maxLength={LIMITS.description.max} disabled={readOnly} onChange={(event) => setTranslation(active, 'description', event.target.value)} />
				</FormField>
			</div>
			<p className="org-hint">{t('form.translations.fallback')}</p>
		</div>
	);
};

export default StepTranslations;
