import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Popover } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { CalendarBlank, CaretLeft, CaretRight } from 'phosphor-react';
import {
	addDays,
	addMonths,
	datePlaceholder,
	dayLabel,
	formatDateValue,
	monthLabel,
	monthStart,
	monthWeeks,
	parseDateText,
	todayIso,
	weekdayNames,
} from '../../dateField';

interface Props {
	id?: string;
	/** `YYYY-MM-DD` or empty, exactly what `<input type="date">` held */
	value: string;
	onChange: (value: string) => void;
	/** Earliest and latest day that can be picked (`YYYY-MM-DD`) */
	min?: string;
	max?: string;
	/** Accessible name when there is no `<label htmlFor>` */
	label?: string;
}

/**
 * A date field whose text, placeholder and calendar follow the site language, not the computer's settings (F356):
 * en mm/dd/yyyy, ko 2026. 10. 16., ru and uz 16.10.2026; Sunday-first weeks for en and ko, Monday-first for ru and uz.
 * Type a date or open the calendar. Calendar keys: arrows move by day and week, Home/End the week, PageUp/PageDown the month
 * (with Shift the year), Enter or Space picks, Escape closes.
 */
const DateField = ({ id, value, onChange, min, max, label }: Props) => {
	const { t } = useTranslation('common');
	const { locale } = useRouter();
	const autoId = useId();
	const inputId = id ?? `date-${autoId}`;
	const [text, setText] = useState(() => formatDateValue(value, locale));
	const [invalid, setInvalid] = useState(false);
	const [open, setOpen] = useState(false);
	// the day that has the focus inside the calendar (roving tabindex) and with it the month on show
	const [cursor, setCursor] = useState(() => value || todayIso());
	const anchor = useRef<HTMLDivElement>(null);
	const grid = useRef<HTMLTableElement>(null);
	const focusAfterRender = useRef(false);

	// the value changed from outside (URL, back button, clear filters) or the language switched: show it in the site's format
	useEffect(() => {
		setText(formatDateValue(value, locale));
		setInvalid(false);
	}, [value, locale]);

	const inRange = (day: string) => (!min || day >= min) && (!max || day <= max);

	const commitText = () => {
		const trimmed = text.trim();
		if (!trimmed) {
			setInvalid(false);
			if (value) onChange('');
			return;
		}
		const parsed = parseDateText(trimmed, locale);
		if (parsed && inRange(parsed)) {
			setInvalid(false);
			setText(formatDateValue(parsed, locale));
			if (parsed !== value) onChange(parsed);
		} else {
			setInvalid(true);
		}
	};

	const openCalendar = () => {
		setCursor(value && inRange(value) ? value : inRange(todayIso()) ? todayIso() : min ?? max ?? todayIso());
		focusAfterRender.current = true;
		setOpen(true);
	};
	const close = () => setOpen(false);

	const pick = (day: string) => {
		if (!inRange(day)) return;
		setInvalid(false);
		setText(formatDateValue(day, locale));
		if (day !== value) onChange(day);
		close();
	};

	// Move the focus onto the day button of the cursor: after a keyboard move or a month change rendered, and once the popover is in
	const focusCursor = () => {
		const button = grid.current?.querySelector<HTMLButtonElement>(`button[data-day="${cursor}"]`);
		if (!button) return;
		button.focus();
		focusAfterRender.current = false;
	};
	useEffect(() => {
		if (open && focusAfterRender.current) focusCursor();
	});

	const move = (next: string) => {
		focusAfterRender.current = true;
		setCursor(next);
	};

	const onGridKey = (event: KeyboardEvent<HTMLTableElement>) => {
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const week = 7;
		const first = monthWeeks(cursor, locale).flat().indexOf(cursor) % week;
		let next: string | null = null;
		switch (event.key) {
			case 'ArrowLeft':
				next = addDays(cursor, -1);
				break;
			case 'ArrowRight':
				next = addDays(cursor, 1);
				break;
			case 'ArrowUp':
				next = addDays(cursor, -7);
				break;
			case 'ArrowDown':
				next = addDays(cursor, 7);
				break;
			case 'Home':
				next = addDays(cursor, -first);
				break;
			case 'End':
				next = addDays(cursor, week - 1 - first);
				break;
			case 'PageUp':
				next = addMonths(cursor, event.shiftKey ? -12 : -1);
				break;
			case 'PageDown':
				next = addMonths(cursor, event.shiftKey ? 12 : 1);
				break;
			default:
				return;
		}
		event.preventDefault();
		move(next);
	};

	const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitText();
		} else if (event.key === 'ArrowDown' && event.altKey) {
			event.preventDefault();
			openCalendar();
		}
	};

	const names = weekdayNames(locale);
	const weeks = monthWeeks(cursor, locale);
	const shownMonth = monthStart(cursor);
	const today = todayIso();
	const title = monthLabel(cursor, locale);
	const titleId = `${inputId}-title`;

	return (
		<div className="tz-datefield" ref={anchor}>
			<input
				id={inputId}
				type="text"
				inputMode="numeric"
				autoComplete="off"
				className="tz-input tz-datefield__input"
				value={text}
				placeholder={datePlaceholder(locale)}
				aria-label={label}
				aria-invalid={invalid ? true : undefined}
				onChange={(event) => setText(event.target.value)}
				onBlur={commitText}
				onKeyDown={onInputKey}
			/>
			<button
				type="button"
				className="tz-datefield__open"
				aria-label={t('dateField.open')}
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => (open ? close() : openCalendar())}
			>
				<CalendarBlank size={20} aria-hidden="true" />
			</button>
			<Popover
				open={open}
				anchorEl={anchor.current}
				onClose={close}
				TransitionProps={{ onEntered: focusCursor }}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
				transformOrigin={{ vertical: 'top', horizontal: 'left' }}
				slotProps={{ paper: { className: 'tz-cal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId } }}
			>
				<div className="tz-cal__head">
					<button type="button" className="tz-cal__nav" aria-label={t('dateField.prevMonth')} onClick={() => setCursor(addMonths(shownMonth, -1))}>
						<CaretLeft size={18} aria-hidden="true" />
					</button>
					<h2 className="tz-cal__title" id={titleId} aria-live="polite">
						{title}
					</h2>
					<button type="button" className="tz-cal__nav" aria-label={t('dateField.nextMonth')} onClick={() => setCursor(addMonths(shownMonth, 1))}>
						<CaretRight size={18} aria-hidden="true" />
					</button>
				</div>
				<table ref={grid} className="tz-cal__grid" role="grid" aria-labelledby={titleId} onKeyDown={onGridKey}>
					<thead>
						<tr>
							{names.map((name) => (
								<th key={name.long} scope="col" abbr={name.long} className="tz-cal__dow">
									<span aria-hidden="true">{name.short}</span>
									<span className="tz-sr">{name.long}</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{weeks.map((row) => (
							<tr key={row[0]}>
								{row.map((day) => {
									const outside = day.slice(0, 7) !== cursor.slice(0, 7);
									const disabled = !inRange(day);
									const selected = day === value;
									return (
										<td key={day} role="gridcell" aria-selected={selected}>
											<button
												type="button"
												data-day={day}
												tabIndex={day === cursor ? 0 : -1}
												aria-label={dayLabel(day, locale)}
												aria-disabled={disabled ? true : undefined}
												aria-current={day === today ? 'date' : undefined}
												className={`tz-cal__day${outside ? ' is-outside' : ''}${selected ? ' is-selected' : ''}${day === today ? ' is-today' : ''}${disabled ? ' is-disabled' : ''}`}
												onClick={() => pick(day)}
												onFocus={() => !outside && day !== cursor && setCursor(day)}
											>
												{Number(day.slice(8))}
											</button>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
				<div className="tz-cal__foot">
					<button type="button" className="tz-cal__link" onClick={() => pick(today)} aria-disabled={inRange(today) ? undefined : true}>
						{t('dateField.today')}
					</button>
					<button
						type="button"
						className="tz-cal__link"
						onClick={() => {
							onChange('');
							setText('');
							close();
						}}
					>
						{t('dateField.clear')}
					</button>
				</div>
			</Popover>
		</div>
	);
};

export default DateField;
