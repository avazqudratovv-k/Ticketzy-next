import { useId } from 'react';
import { useTranslation } from 'next-i18next';
import { Warning } from 'phosphor-react';

interface Props {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
}

/**
 * "I understand these tickets can't be refunded": shown only for a non-refundable event. The button that creates the order stays
 * disabled (really disabled, not only marked) until this is ticked, and the choice goes to the API as `acknowledgeNonRefundable`.
 */
const RefundAck = ({ checked, onChange, disabled }: Props) => {
	const { t } = useTranslation('events');
	const id = useId();
	return (
		<div className={`tz-refund-ack${checked ? ' is-on' : ''}`}>
			<p className="tz-refund-ack__title" id={`${id}-title`}>
				<Warning size={18} weight="fill" aria-hidden="true" /> {t('refund.warningTitle')}
			</p>
			<label className="tz-refund-ack__check" htmlFor={id}>
				<input id={id} type="checkbox" checked={checked} disabled={disabled} aria-describedby={`${id}-title`} onChange={(event) => onChange(event.target.checked)} />
				<span>{t('refund.ackLabel')}</span>
			</label>
			{!checked && <p className="tz-refund-ack__hint">{t('refund.ackHint')}</p>}
		</div>
	);
};

export default RefundAck;
