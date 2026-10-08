import { useTranslation } from 'next-i18next';
import { CATEGORY_VALUES } from '../../../events';
import { LIMITS } from '../../../organizer/form';
import { FormField, useErrorText } from './fields';
import { StepProps } from './types';

const StepDetails = ({ editor, readOnly }: StepProps) => {
	const { t } = useTranslation('organizer');
	const { t: te } = useTranslation('events');
	const text = useErrorText();
	const { values, errors, setField } = editor;
	return (
		<div className="org-fields">
			<FormField label={t('form.details.title')} required hint={t('form.details.titleHint', LIMITS.title)} error={text(errors.title)}>
				<input
					className="tz-input"
					value={values.title}
					maxLength={LIMITS.title.max}
					disabled={readOnly}
					autoComplete="off"
					onChange={(event) => setField('title', event.target.value)}
				/>
			</FormField>
			<FormField label={t('form.details.category')} required error={text(errors.category)}>
				<select
					className="tz-input"
					value={values.category}
					disabled={readOnly}
					onChange={(event) => setField('category', event.target.value as typeof values.category)}
				>
					<option value="">{t('form.details.categoryPlaceholder')}</option>
					{CATEGORY_VALUES.map((category) => (
						<option key={category} value={category}>
							{te(`categories.${category}`)}
						</option>
					))}
				</select>
			</FormField>
			<FormField
				label={t('form.details.description')}
				hint={t('form.details.descriptionHint', { ...LIMITS.description, count: values.description.trim().length })}
				error={text(errors.description)}
			>
				<textarea
					className="tz-input org-textarea"
					rows={6}
					value={values.description}
					maxLength={LIMITS.description.max}
					disabled={readOnly}
					onChange={(event) => setField('description', event.target.value)}
				/>
			</FormField>
			<p className="org-hint">{t('form.details.english')}</p>
		</div>
	);
};

export default StepDetails;
