import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Info, Plus, TrashSimple } from 'phosphor-react';
import { useRouter } from 'next/router';
import { formatNumber } from '../../../format';
import { LIMITS, tiersOfVenue, validateSaleWindow } from '../../../organizer/form';
import { isUntouched } from '../../../organizer/useEventEditor';
import { FormField, useErrorText } from './fields';
import RefundFields from './RefundFields';
import { StepProps } from './types';

const StepTickets = ({ editor, readOnly }: StepProps) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const text = useErrorText();
	const { values, rows, errors, updateRow, addRow, removeRow, setField, venue, mode } = editor;
	const reserved = values.seatingType === 'RESERVED';
	const tiers = tiersOfVenue(venue);
	const approved = mode === 'review';
	// Checked live, so a change of the event dates on the venue step shows here at once
	// "incomplete" waits for Save/Continue, so it does not flash while the organizer is still typing the time
	const live = readOnly ? {} : validateSaleWindow(values, venue);
	const ruleOf = (code?: string) => (code && code !== 'incomplete' ? code : undefined);
	const saleStartError = ruleOf(live.saleStart) ?? errors.saleStart;
	const saleEndError = ruleOf(live.saleEnd) ?? errors.saleEnd;
	type SaleField = 'saleStartDate' | 'saleStartTime' | 'saleEndDate' | 'saleEndTime';
	/** The first sale field filled in suggests sales end = event start (it may be moved up to the event end) */
	const setSale = (name: SaleField, value: string) => {
		setField(name, value);
		const endEmpty = !values.saleEndDate && !values.saleEndTime;
		if (!value || !endEmpty || !values.startDate || !values.startTime) return;
		if (name !== 'saleEndDate') setField('saleEndDate', values.startDate);
		if (name !== 'saleEndTime') setField('saleEndTime', values.startTime);
	};

	return (
		<div className="org-fields">
			<p className="tz-alert tz-alert--info" role="note">
				<Info size={20} aria-hidden="true" />
				<span>{reserved ? t('form.tickets.introReserved') : t('form.tickets.introGeneral')}</span>
			</p>
			{approved && <p className="org-hint">{t('form.tickets.approvedNote')}</p>}

			{rows.length === 0 && reserved && tiers.length === 0 && <p className="org-hint">{t('form.tickets.pickVenue')}</p>}

			<ul className="org-tickets">
				{rows.map((row, index) => {
					const base = row.key;
					const tier = tiers.find((item) => item.tierKey === row.tierKey);
					const fresh = isUntouched(row, values.seatingType);
					return (
						<li key={row.key} className="org-ticket">
							<div className="org-ticket__head">
								<strong>{reserved ? t('form.tickets.tierTitle', { tier: row.tierKey }) : t('form.tickets.ticketTitle', { number: index + 1 })}</strong>
								{row.id && (
									<span className="tz-badge tz-badge--neutral">
										{row.status === 'SOLD_OUT' ? t('form.tickets.soldOut') : row.status === 'PAUSED' ? t('form.tickets.paused') : t('form.tickets.onSale')}
										{' · '}
										{t('form.tickets.sold', { count: row.sold, formatted: formatNumber(row.sold, locale) })}
									</span>
								)}
								{!row.id && !reserved && !readOnly && (
									<button type="button" className="org-iconbtn" aria-label={t('form.tickets.remove')} onClick={() => removeRow(row.key)}>
										<TrashSimple size={20} />
									</button>
								)}
							</div>
							{reserved && tier && <p className="org-hint">{t('form.tickets.tierSections', { sections: tier.sections.join(', ') })}</p>}
							<div className="org-grid4">
								<FormField label={t('form.tickets.name')} required error={text(errors[`${base}.name`])}>
									<input className="tz-input" value={row.name} maxLength={LIMITS.ticketName.max} disabled={readOnly} onChange={(event) => updateRow(row.key, { name: event.target.value })} />
								</FormField>
								<FormField label={t('form.tickets.price')} required error={text(errors[`${base}.price`])}>
									<input className="tz-input" inputMode="numeric" value={row.price} placeholder="0" disabled={readOnly} onChange={(event) => updateRow(row.key, { price: event.target.value.replace(/[^\d]/g, '') })} />
								</FormField>
								{reserved ? (
									<FormField label={t('form.tickets.seats')} hint={t('form.tickets.seatsHint')}>
										<input className="tz-input" value={formatNumber(row.seatCount ?? Number(row.quantity) ?? 0, locale)} readOnly disabled />
									</FormField>
								) : (
									<FormField label={t('form.tickets.quantity')} required error={text(errors[`${base}.quantity`])} hint={row.sold > 0 ? t('form.tickets.quantityMin', { count: row.sold }) : undefined}>
										<input className="tz-input" inputMode="numeric" value={row.quantity} disabled={readOnly} onChange={(event) => updateRow(row.key, { quantity: event.target.value.replace(/[^\d]/g, '') })} />
									</FormField>
								)}
								<FormField label={t('form.tickets.maxPerOrder')} required error={text(errors[`${base}.maxPerOrder`])}>
									<input className="tz-input" inputMode="numeric" value={row.maxPerOrder} disabled={readOnly} onChange={(event) => updateRow(row.key, { maxPerOrder: event.target.value.replace(/[^\d]/g, '') })} />
								</FormField>
							</div>
							{row.id && !readOnly && (
								<label className="org-check">
									<input type="checkbox" checked={row.status === 'PAUSED'} onChange={(event) => updateRow(row.key, { status: event.target.checked ? 'PAUSED' : 'ACTIVE' })} />
									<span>{t('form.tickets.pause')}</span>
								</label>
							)}
							{fresh && reserved && <p className="org-hint">{t('form.tickets.untouched')}</p>}
						</li>
					);
				})}
			</ul>

			{!reserved && !readOnly && (
				<div>
					<Button variant="outlined" startIcon={<Plus size={20} aria-hidden="true" />} onClick={addRow}>
						{t('form.tickets.add')}
					</Button>
				</div>
			)}
			<p className="org-hint">{t('form.tickets.noDelete')}</p>
			<p className="org-hint">{t('form.tickets.commission')}</p>

			<h3 className="org-subtitle">{t('form.tickets.saleWindow')}</h3>
			<p className="org-hint">{t('form.tickets.saleWindowHint')}</p>
			<div className="org-grid2">
				<FormField label={t('form.tickets.saleStartDate')} error={text(saleStartError)}>
					<input type="date" className="tz-input" value={values.saleStartDate} disabled={readOnly} onChange={(event) => setSale('saleStartDate', event.target.value)} />
				</FormField>
				<FormField label={t('form.tickets.saleStartTime')}>
					<input type="time" className="tz-input" value={values.saleStartTime} disabled={readOnly} onChange={(event) => setSale('saleStartTime', event.target.value)} />
				</FormField>
				<FormField label={t('form.tickets.saleEndDate')} error={text(saleEndError)} hint={t('form.tickets.saleEndHint')}>
					<input type="date" className="tz-input" value={values.saleEndDate} disabled={readOnly} onChange={(event) => setSale('saleEndDate', event.target.value)} />
				</FormField>
				<FormField label={t('form.tickets.saleEndTime')}>
					<input type="time" className="tz-input" value={values.saleEndTime} disabled={readOnly} onChange={(event) => setSale('saleEndTime', event.target.value)} />
				</FormField>
			</div>
			<p className="org-hint">{t('form.tickets.saleRule')}</p>

			<RefundFields editor={editor} readOnly={readOnly} />
		</div>
	);
};

export default StepTickets;
