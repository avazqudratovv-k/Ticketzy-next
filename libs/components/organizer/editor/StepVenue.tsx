import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Lock, MapPin, WarningCircle } from 'phosphor-react';
import { formatNumber, formatZoneName } from '../../../format';
import { tiersOfVenue, venueSupportsReserved } from '../../../organizer/form';
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

			<div className="org-grid2">
				<FormField label={t('form.venue.startDate')} required error={text(errors.start)}>
					<input type="date" className="tz-input" value={values.startDate} disabled={readOnly} onChange={(event) => setField('startDate', event.target.value)} />
				</FormField>
				<FormField label={t('form.venue.startTime')} required>
					<input type="time" className="tz-input" value={values.startTime} disabled={readOnly} onChange={(event) => setField('startTime', event.target.value)} />
				</FormField>
				<FormField label={t('form.venue.endDate')} required error={text(errors.end)}>
					<input type="date" className="tz-input" value={values.endDate} disabled={readOnly} onChange={(event) => setField('endDate', event.target.value)} />
				</FormField>
				<FormField label={t('form.venue.endTime')} required>
					<input type="time" className="tz-input" value={values.endTime} disabled={readOnly} onChange={(event) => setField('endTime', event.target.value)} />
				</FormField>
			</div>
			<p className="org-hint">{zone ? t('form.venue.zone', { zone }) : t('form.venue.zoneUnknown')}</p>
			{!readOnly && venue && !values.endDate && values.startDate && (
				<Button size="small" variant="text" onClick={() => { setField('endDate', values.startDate); if (!values.endTime) setField('endTime', values.startTime); }}>
					{t('form.venue.sameDay')}
				</Button>
			)}
		</div>
	);
};

export default StepVenue;
