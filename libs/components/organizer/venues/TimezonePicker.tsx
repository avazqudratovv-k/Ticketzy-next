import { KeyboardEvent, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { listTimezones } from '../../../venues/timezones';

interface Props {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	invalid?: boolean;
	describedBy?: string;
}

const SHOWN = 80;

/** Searchable list of IANA time zones (a combobox: type "seoul" or "+9", arrows and Enter pick). */
const TimezonePicker = ({ id, value, onChange, disabled, invalid, describedBy }: Props) => {
	const { t } = useTranslation('organizer');
	const zones = useMemo(() => listTimezones(), []);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(0);
	const listId = useId();
	const input = useRef<HTMLInputElement>(null);

	const current = zones.find((zone) => zone.id === value);
	const text = query.trim().toLowerCase().replace(/[_/]/g, ' ');
	const matches = useMemo(() => (text ? zones.filter((zone) => zone.haystack.includes(text)) : zones), [zones, text]);
	const shown = matches.slice(0, SHOWN);

	const pick = (zoneId: string) => {
		onChange(zoneId);
		setOpen(false);
		setQuery('');
		input.current?.blur();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setOpen(true);
			setActive((n) => Math.min(shown.length - 1, n + 1));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActive((n) => Math.max(0, n - 1));
		} else if (event.key === 'Enter' && open && shown[active]) {
			event.preventDefault();
			pick(shown[active].id);
		} else if (event.key === 'Escape') {
			setOpen(false);
			setQuery('');
		}
	};

	return (
		<div className="tzp">
			<input
				ref={input}
				id={id}
				type="text"
				className="tz-input"
				role="combobox"
				aria-expanded={open}
				aria-controls={listId}
				aria-autocomplete="list"
				aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				autoComplete="off"
				spellCheck={false}
				disabled={disabled}
				placeholder={t('venues.form.timezoneSearch')}
				value={open ? query : current ? `${current.id} (${current.offset})` : value}
				onFocus={() => {
					setOpen(true);
					setActive(0);
				}}
				onBlur={() => {
					// A click on an option runs first (onMouseDown), so closing here is safe
					setOpen(false);
					setQuery('');
				}}
				onChange={(event) => {
					setQuery(event.target.value);
					setActive(0);
					setOpen(true);
				}}
				onKeyDown={onKeyDown}
			/>
			{open && (
				<ul id={listId} role="listbox" className="tzp__list" aria-label={t('venues.form.timezone')}>
					{shown.length === 0 && <li className="tzp__none">{t('venues.form.timezoneNone')}</li>}
					{shown.map((zone, index) => (
						<li
							key={zone.id}
							id={`${listId}-${index}`}
							role="option"
							aria-selected={zone.id === value}
							className={`tzp__opt ${index === active ? 'is-active' : ''} ${zone.id === value ? 'is-selected' : ''}`}
							onMouseDown={(event) => {
								event.preventDefault();
								pick(zone.id);
							}}
							onMouseEnter={() => setActive(index)}
						>
							<span>{zone.id}</span>
							<span className="tzp__off">{zone.offset}</span>
						</li>
					))}
					{matches.length > SHOWN && <li className="tzp__none">{t('venues.form.timezoneMore', { n: matches.length - SHOWN })}</li>}
				</ul>
			)}
		</div>
	);
};

export default TimezonePicker;
