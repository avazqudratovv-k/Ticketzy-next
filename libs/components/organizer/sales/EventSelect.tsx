import { useId } from 'react';
import { useTranslation } from 'next-i18next';
import { SalesEvent } from '../../../organizer/useSalesEvents';

interface Props {
	events: SalesEvent[];
	value: string;
	onChange: (id: string) => void;
	title: (event: SalesEvent) => string;
	/** adds an "All events" choice with the empty value */
	allowAll?: boolean;
}

/** Event selector of the sales pages: a native select, labelled, with the status next to each title. */
const EventSelect = ({ events, value, onChange, title, allowAll }: Props) => {
	const { t } = useTranslation('organizer');
	const id = useId();
	return (
		<div className="org-select org-select--event">
			<label className="org-field-label" htmlFor={id}>
				{t('sales.event')}
			</label>
			<select id={id} className="tz-input" value={value} onChange={(e) => onChange(e.target.value)}>
				{allowAll && <option value="">{t('sales.allEvents')}</option>}
				{events.map((event) => (
					<option key={event._id} value={event._id}>
						{title(event)} · {t(`status.${event.eventStatus}`)}
					</option>
				))}
			</select>
		</div>
	);
};

export default EventSelect;
