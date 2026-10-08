import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Lock, MapPin, WarningCircle } from 'phosphor-react';
import { formatEventSummary, formatNumber, formatZoneName } from '../../../format';
import { addHours, dateOrderErrors, impliedEndDate, saleWindowConflicts, tiersOfVenue, venueSupportsReserved } from '../../../organizer/form';
import { zonedToIso } from '../../../organizer/zoned';
import { useRouter } from 'next/router';
import { FormField, useErrorText } from './fields';
import { StepProps } from './types';

const StepVenue = ({ editor, readOnly, onCreateVenue }: StepProps & { onCreateVenue?: () => void }) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const text = useErrorText();
	const { values, errors, setField, venues, venue, venuesLoading, venuesError, refetchVenues, mode, rows } = editor;
	const hasTicketTypes = rows.some((row) => row.id);
	// APPROVED events have seats and orders; with ticket types the venue's tiers are already in use (see DECISIONS F98)
	const lockedBy = mode === 'review' ? 'approved' : hasTicketTypes ? 'tickets' : null;
	const locked = readOnly || lockedBy !== null;
	const reservedOk = venue ? venueSupportsReserved(venue) : true;
	const tiers = tiersOfVenue(venue);
	const sample = zonedToIso(values.startDate || '2026-01-01', values.startTime || '12:00', venue?.venueTimezone) ?? new Date().toISOString();
	const zone = venue ? `${venue.venueTimezone} (${formatZoneName(sample, locale, venue.venueTimezone)})` : null;

	// One day: Date, Start time, End time (the end date follows the start date, or the next day for an overnight show).
	// Several days: From and To date, and the same daily hours on every day (DECISIONS F129).
	const multi = values.multiDay;
	const [endTouched, setEndTouched] = useState(() => Boolean(values.endTime));
	const syncEnd = (startDate: string, startTime: string, endTime: string) => {
		if (!multi) setField('endDate', impliedEndDate(startDate, startTime, endTime));
	};
	const onStartDate = (value: string) => {
		setField('startDate', value);
		if (!multi) syncEnd(value, values.startTime, values.endTime);
		else if (value && (!values.endDate || values.endDate < value)) setField('endDate', value);
	};
	const onStartTime = (value: string) => {
		setField('startTime', value);
		let endTime = values.endTime;
		if (!endTouched && value) {
			// Daily hours can't run past midnight: stop at 23:59 instead of wrapping
			endTime = multi && addHours(value, 2) <= value ? '23:59' : addHours(value, 2);
			setField('endTime', endTime);
		}
		syncEnd(values.startDate, value, endTime);
	};
	const onEndTime = (value: string) => {
		setEndTouched(true);
		setField('endTime', value);
		syncEnd(values.startDate, values.startTime, value);
	};
	const toMulti = () => {
		setField('multiDay', true);
		setField('endDate', values.startDate);
	};
	const toSingle = () => {
		setField('multiDay', false);
		setField('endDate', impliedEndDate(values.startDate, values.startTime, values.endTime));
	};
	const nextDay = !multi && Boolean(values.startDate && values.endDate && values.endDate !== values.startDate);
	const live = readOnly ? {} : dateOrderErrors(values, venue, editor.event?.startAt);
	const startError = errors.start ?? live.start;
	const endDateError = errors.endDate ?? live.endDate;
	const endError = errors.endTime ?? errors.end ?? live.endTime ?? live.end;
	const startIso = values.startDate && values.startTime ? zonedToIso(values.startDate, values.startTime, venue?.venueTimezone) : null;
	const endIso = values.endDate && values.endTime ? zonedToIso(values.endDate, values.endTime, venue?.venueTimezone) : null;
	// The sale window is on the tickets step: say so here when new event dates make it invalid
	const saleConflict = !readOnly && saleWindowConflicts(values, venue);
	const summary = venue && startIso && endIso && !endDateError && !(multi && live.endTime) ? formatEventSummary(startIso, endIso, locale, venue.venueTimezone) : null;

	return (
		<div className="org-fields">
			{venuesError && venues.length === 0 && (
				<p className="tz-alert tz-alert--error" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						{t('form.venue.loadError')}{' '}
						<button type="button" className="tz-link org-linkbtn" onClick={() => refetchVenues()}>
							{t('errors.retry')}
						</button>
					</span>
				</p>
			)}

			<FormField label={t('form.venue.venue')} required error={text(errors.venueId)} hint={
					onCreateVenue && !locked ? (
						<>
							{t('form.venue.createLater')}{' '}
							<button type="button" className="tz-link org-linkbtn" onClick={onCreateVenue}>
								{t('form.venue.createLink')}
							</button>
						</>
					) : undefined
				}
			>
				<select
					className="tz-input"
					value={values.venueId}
					disabled={locked || venuesLoading}
					onChange={(event) => {
						setField('venueId', event.target.value);
						const next = venues.find((item) => item._id === event.target.value);
						if (values.seatingType === 'RESERVED' && next && !venueSupportsReserved(next)) setField('seatingType', 'GENERAL');
					}}
				>
					<option value="">{venuesLoading ? t('form.venue.loading') : t('form.venue.placeholder')}</option>
					{values.venueId && !venues.some((item) => item._id === values.venueId) && venue && (
						<option value={venue._id}>
							{venue.venueName}, {venue.venueCity}
						</option>
					)}
					{venues.map((item) => (
						<option key={item._id} value={item._id}>
							{item.venueName}, {item.venueCity}
						</option>
					))}
				</select>
			</FormField>

			{lockedBy && (
				<p className="tz-alert tz-alert--info" role="note">
					<Lock size={20} aria-hidden="true" />
					<span>{t(`form.venue.locked.${lockedBy}`)}</span>
				</p>
			)}

			{venue && (
				<div className="org-venue">
					<MapPin size={20} aria-hidden="true" />
					<div>
						<strong>{venue.venueName}</strong>
						<span>
							{venue.venueAddress}, {venue.venueCity}
						</span>
						<span>
							{typeof venue.venueCapacity === 'number' && venue.venueCapacity > 0
								? t('form.venue.capacity', { count: venue.venueCapacity, formatted: formatNumber(venue.venueCapacity, locale) })
								: t('form.venue.noCapacity')}
							{' · '}
							{reservedOk ? t('form.venue.tiers', { count: tiers.length }) : t('form.venue.noLayout')}
						</span>
					</div>
				</div>
			)}

			<fieldset className="org-radios" disabled={locked}>
				<legend className="tz-field__label">{t('form.venue.seating')}</legend>
				{(['RESERVED', 'GENERAL'] as const).map((type) => {
					const unavailable = type === 'RESERVED' && !reservedOk;
					return (
						<label key={type} className={`org-radio ${values.seatingType === type ? 'is-on' : ''} ${unavailable ? 'is-off' : ''}`}>
							<input
								type="radio"
								name="seatingType"
								value={type}
								checked={values.seatingType === type}
								disabled={unavailable || locked}
								onChange={() => setField('seatingType', type)}
							/>
							<span className="org-radio__title">{t(`form.venue.seatingType.${type}`)}</span>
							<span className="org-radio__text">{unavailable ? t('form.venue.reservedUnavailable') : t(`form.venue.seatingText.${type}`)}</span>
						</label>
					);
				})}
				{errors.seatingType && (
					<span className="tz-field__error" role="alert">
						<WarningCircle size={18} weight="fill" aria-hidden="true" /> {text(errors.seatingType)}
					</span>
				)}
			</fieldset>

			<fieldset className="org-when" disabled={readOnly}>
				<legend className="org-subtitle">{t('form.venue.when.title')}</legend>
				<p className="org-hint">{multi ? t('form.venue.when.hintMulti') : t('form.venue.when.hint')}</p>
				{multi ? (
					<div className="org-grid2">
						<fieldset className="org-when__group">
							<legend className="tz-field__label">{t('form.venue.when.dates')}</legend>
							<FormField label={t('form.venue.fromDate')} required error={text(startError)}>
								<input type="date" className="tz-input" value={values.startDate} onChange={(event) => onStartDate(event.target.value)} />
							</FormField>
							<FormField label={t('form.venue.toDate')} required error={text(endDateError)}>
								<input type="date" className="tz-input" value={values.endDate} min={values.startDate || undefined} onChange={(event) => setField('endDate', event.target.value)} />
							</FormField>
						</fieldset>
						<fieldset className="org-when__group">
							<legend className="tz-field__label">{t('form.venue.when.dailyHours')}</legend>
							<FormField label={t('form.venue.startTime')} required>
								<input type="time" className="tz-input" value={values.startTime} onChange={(event) => onStartTime(event.target.value)} />
							</FormField>
							<FormField label={t('form.venue.endTime')} required error={text(endError)}>
								<input type="time" className="tz-input" value={values.endTime} onChange={(event) => onEndTime(event.target.value)} />
							</FormField>
						</fieldset>
					</div>
				) : (
					<div className="org-grid3">
						<FormField label={t('form.venue.date')} required error={text(startError)}>
							<input type="date" className="tz-input" value={values.startDate} onChange={(event) => onStartDate(event.target.value)} />
						</FormField>
						<FormField label={t('form.venue.startTime')} required>
							<input type="time" className="tz-input" value={values.startTime} onChange={(event) => onStartTime(event.target.value)} />
						</FormField>
						<FormField label={t('form.venue.endTime')} required error={text(endError)}>
							<input type="time" className="tz-input" value={values.endTime} onChange={(event) => onEndTime(event.target.value)} />
						</FormField>
					</div>
				)}
				{nextDay && (
					<p className="org-hint" role="status">
						{t('form.venue.when.nextDay')}
					</p>
				)}
				{!readOnly && (
					<button type="button" className="tz-link org-linkbtn org-when__more" onClick={multi ? toSingle : toMulti}>
						{multi ? t('form.venue.when.backToSingle') : t('form.venue.when.otherDay')}
					</button>
				)}
				{summary && <p className="org-hint org-when__summary">{summary}</p>}
				{saleConflict && (
					<p className="tz-alert tz-alert--warning" role="status">
						<WarningCircle size={20} aria-hidden="true" />
						<span>{t('form.venue.when.saleConflict')}</span>
					</p>
				)}
			</fieldset>
			<p className="org-hint">{zone ? t('form.venue.zone', { zone }) : t('form.venue.zoneUnknown')}</p>
		</div>
	);
};

export default StepVenue;
