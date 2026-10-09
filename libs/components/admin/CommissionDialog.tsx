import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Info, WarningCircle } from 'phosphor-react';
import { SET_COMMISSION_OVERRIDE_BY_ADMIN } from '../../../apollo/admin/mutation';
import { effectiveRate, overrideActive, parseRate } from '../../admin/commission';
import { AdminError, describeAdminError } from '../../admin/errors';
import { AdminOrganizer, organizerName } from '../../admin/types';
import { dayBoundaryIso, formatNumber, formatViewerDate } from '../../format';

const REASON_MAX = 500;

interface Props {
	organizer: AdminOrganizer | null;
	onClose: () => void;
	onSaved: (organizer: AdminOrganizer) => void;
}

type FieldErrors = { rate?: 'empty' | 'range'; end?: 'past'; reason?: 'required' };

/**
 * `setCommissionOverrideByAdmin` (rate 0 to 100, optional end date that must be in the future, reason required).
 * Two steps: fill in the form, then confirm the summary. The backend has no operation to remove an override.
 */
const CommissionDialog = ({ organizer, onClose, onSaved }: Props) => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const client = useApolloClient();
	const id = useId();
	const [rate, setRate] = useState('');
	const [endDay, setEndDay] = useState('');
	const [reason, setReason] = useState('');
	const [step, setStep] = useState<'form' | 'confirm'>('form');
	const [errors, setErrors] = useState<FieldErrors>({});
	const [loading, setLoading] = useState(false);
	const [serverError, setServerError] = useState<AdminError | null>(null);

	useEffect(() => {
		if (!organizer) return;
		const current = organizer.commissionOverride && overrideActive(organizer.commissionOverride) ? organizer.commissionOverride : null;
		setRate(current ? String(current.rate) : '');
		setEndDay('');
		setReason('');
		setStep('form');
		setErrors({});
		setServerError(null);
	}, [organizer?._id]); // eslint-disable-line react-hooks/exhaustive-deps

	const name = organizerName(organizer);
	const parsed = parseRate(rate);
	const endsAt = endDay ? dayBoundaryIso(endDay, true) : null;
	const current = organizer ? effectiveRate(organizer) : null;
	const today = new Date().toISOString().slice(0, 10);

	const validate = (): boolean => {
		const next: FieldErrors = {};
		if (!parsed.ok) next.rate = parsed.error;
		if (endsAt && Date.parse(endsAt) <= Date.now()) next.end = 'past';
		if (!reason.trim()) next.reason = 'required';
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const review = () => {
		if (validate()) setStep('confirm');
	};

	const save = async () => {
		if (!organizer || !parsed.ok) return;
		setLoading(true);
		setServerError(null);
		try {
			const result = await client.mutate({
				mutation: SET_COMMISSION_OVERRIDE_BY_ADMIN,
				variables: { input: { memberId: organizer._id, rate: parsed.value, endsAt, reason: reason.trim() } },
			});
			onSaved(result.data.setCommissionOverrideByAdmin as AdminOrganizer);
		} catch (err) {
			setServerError(describeAdminError(err));
			setStep('form');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={Boolean(organizer)} onClose={() => !loading && onClose()} aria-labelledby={`${id}-title`} fullWidth maxWidth="sm">
			<DialogTitle id={`${id}-title`}>{step === 'form' ? t('commission.dialog.title') : t('commission.dialog.confirmTitle')}</DialogTitle>
			<DialogContent>
				<p className="org-dialog__event">{name}</p>
				{current && (
					<p className="adm-muted">
						{t('commission.dialog.current', { rate: formatNumber(current.rate, locale), source: t(`commission.source.${current.source}`) })}
					</p>
				)}
				{step === 'form' ? (
					<>
						<div className="tz-field">
							<label htmlFor={`${id}-rate`} className="tz-field__label">
								{t('commission.dialog.rate')} <span className="org-req" aria-hidden="true">*</span>
							</label>
							<input
								id={`${id}-rate`}
								className="tz-input adm-short"
								type="text"
								inputMode="decimal"
								autoComplete="off"
								value={rate}
								aria-invalid={Boolean(errors.rate)}
								aria-describedby={`${id}-rate-hint`}
								onChange={(event) => setRate(event.target.value)}
							/>
							<span id={`${id}-rate-hint`} className={errors.rate ? 'tz-field__error' : 'tz-field__hint'}>
								{errors.rate ? t(`commission.dialog.errors.rate_${errors.rate}`) : t('commission.dialog.rateHint')}
							</span>
						</div>
						<div className="tz-field">
							<label htmlFor={`${id}-end`} className="tz-field__label">
								{t('commission.dialog.endDay')}
							</label>
							<input
								id={`${id}-end`}
								className="tz-input adm-short"
								type="date"
								min={today}
								value={endDay}
								aria-invalid={Boolean(errors.end)}
								aria-describedby={`${id}-end-hint`}
								onChange={(event) => setEndDay(event.target.value)}
							/>
							<span id={`${id}-end-hint`} className={errors.end ? 'tz-field__error' : 'tz-field__hint'}>
								{errors.end ? t('commission.dialog.errors.end_past') : t('commission.dialog.endHint')}
							</span>
						</div>
						<div className="tz-field">
							<label htmlFor={`${id}-reason`} className="tz-field__label">
								{t('commission.dialog.reason')} <span className="org-req" aria-hidden="true">*</span>
							</label>
							<textarea
								id={`${id}-reason`}
								className="tz-input"
								rows={3}
								maxLength={REASON_MAX}
								value={reason}
								aria-invalid={Boolean(errors.reason)}
								aria-describedby={`${id}-reason-hint`}
								onChange={(event) => setReason(event.target.value)}
							/>
							<span id={`${id}-reason-hint`} className={errors.reason ? 'tz-field__error' : 'tz-field__hint'}>
								{errors.reason ? t('commission.dialog.errors.reason_required') : t('commission.dialog.reasonHint')}
							</span>
						</div>
						<p className="tz-alert tz-alert--info" role="note">
							<Info size={20} aria-hidden="true" />
							<span>{t('commission.dialog.noReset')}</span>
						</p>
					</>
				) : (
					parsed.ok && (
						<>
							<dl className="org-dl adm-dl">
								<div>
									<dt>{t('commission.dialog.newRate')}</dt>
									<dd>{t('percent', { value: formatNumber(parsed.value, locale) })}</dd>
								</div>
								<div>
									<dt>{t('commission.dialog.until')}</dt>
									<dd>{endsAt ? formatViewerDate(endsAt, locale, true) : t('commission.noEnd')}</dd>
								</div>
								<div>
									<dt>{t('commission.dialog.reason')}</dt>
									<dd>{reason.trim()}</dd>
								</div>
							</dl>
							<p className="tz-alert tz-alert--warning" role="note">
								<WarningCircle size={20} aria-hidden="true" />
								<span>{t('commission.dialog.confirmText')}</span>
							</p>
						</>
					)
				)}
				{serverError && (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" />
						<span>{serverError.network ? t('errors.network') : serverError.key ? t(`serverErrors.${serverError.key}`) : serverError.raw || t('errors.generic')}</span>
					</p>
				)}
			</DialogContent>
			<DialogActions className="org-dialog__actions">
				{step === 'form' ? (
					<>
						<Button variant="text" onClick={onClose}>
							{t('actions.back')}
						</Button>
						<Button variant="contained" onClick={review}>
							{t('commission.dialog.review')}
						</Button>
					</>
				) : (
					<>
						<Button variant="text" onClick={() => setStep('form')} disabled={loading}>
							{t('commission.dialog.edit')}
						</Button>
						<Button variant="contained" onClick={save} disabled={loading}>
							{loading ? t('commission.dialog.saving') : t('commission.dialog.confirm')}
						</Button>
					</>
				)}
			</DialogActions>
		</Dialog>
	);
};

export default CommissionDialog;
