import { useId } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { MAX_REFUND_DAYS, RefundPolicyType, getRefundDeadline } from '../../../refundPolicy';
import { formatRefundDeadline } from '../../../refundText';
import { validateRefund } from '../../../organizer/form';
import { zonedToIso } from '../../../organizer/zoned';
import { FormField, useErrorText } from './fields';
import { StepProps } from './types';

const TYPES: RefundPolicyType[] = ['REFUNDABLE', 'NON_REFUNDABLE'];

/** The refund policy of the event: refundable until N days before (1 to 30), or non-refundable. */
const RefundFields = ({ editor, readOnly }: StepProps) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const text = useErrorText();
	const radioId = useId();
	const { values, errors, setField, venue } = editor;
	const zone = venue?.venueTimezone;
	const start = zonedToIso(values.startDate, values.startTime, zone);
	const days = Number(values.refundDays);
	const live = values.refundType === 'REFUNDABLE' && !Object.keys(validateRefund(values)).length;
	const deadline = live && start ? formatRefundDeadline(getRefundDeadline(start, zone || 'Asia/Seoul', days), locale, zone || 'Asia/Seoul') : null;

	return (
		<>
			<h3 className="org-subtitle">{t('form.refund.title')}</h3>
			<p className="org-hint">{t('form.refund.hint')}</p>
			<fieldset className="org-radios" disabled={readOnly}>
				<legend className="tz-field__label">{t('form.refund.title')}</legend>
				{TYPES.map((type) => {
					const textId = `${radioId}-${type}`;
					return (
						<label key={type} className={`org-radio ${values.refundType === type ? 'is-on' : ''}`}>
							<input type="radio" name="refundType" value={type} checked={values.refundType === type} aria-describedby={textId} onChange={() => setField('refundType', type)} />
							<span className="org-radio__title">{t(`form.refund.${type}.title`)}</span>
							<span id={textId} className="org-radio__text">
								{t(`form.refund.${type}.text`)}
							</span>
						</label>
					);
				})}
			</fieldset>
			{values.refundType === 'REFUNDABLE' && (
				<div className="org-grid2">
					<FormField label={t('form.refund.days')} hint={t('form.refund.daysHint')} error={text(errors.refundDays)}>
						<input
							type="number"
							inputMode="numeric"
							min={1}
							max={MAX_REFUND_DAYS}
							step={1}
							className="tz-input"
							value={values.refundDays}
							disabled={readOnly}
							onChange={(event) => setField('refundDays', event.target.value)}
						/>
					</FormField>
					{deadline && <p className="org-hint org-refund-deadline">{t('form.refund.deadline', { date: deadline })}</p>}
				</div>
			)}
		</>
	);
};

export default RefundFields;
