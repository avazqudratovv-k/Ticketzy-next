import { useTranslation } from 'next-i18next';
import { Button } from '@mui/material';
import { Timer, WarningCircle } from 'phosphor-react';
import { formatCountdown, useRemainingMs } from '../../seats/clock';
import useStickyBar from '../../hooks/useStickyBar';

interface Props {
	/** Server deadline (ISO) of the hold */
	deadline: string;
	/** Total, already formatted */
	total: string;
	paying: boolean;
	/** Translation key of the payment error, if any */
	error: string | null;
	onPay: () => void;
}

/**
 * Phones and tablets: the one Pay button with the hold time and the total, fixed at the bottom of the checkout. The Pay
 * button inside the price card is hidden below 1024 px (and this bar from 1024 px), so there is always one. The countdown
 * here is a visual copy: the box at the top of the page owns the timer role, the announcements and the expiry.
 */
const PayBar = ({ deadline, total, paying, error, onPay }: Props) => {
	const { t } = useTranslation('checkout');
	const remaining = useRemainingMs(deadline);
	useStickyBar(true);
	const urgent = remaining !== null && Math.ceil(remaining / 1000) <= 10;

	return (
		<div className="tz-bar checkout__bar" role="group" aria-label={t('pay.barLabel')}>
			{error && (
				<p className="checkout__bar-error" role="alert">
					<WarningCircle size={16} aria-hidden="true" /> {t(error)}
				</p>
			)}
			<div className="tz-bar__info">
				<span className="tz-bar__label">{t('pay.total')}</span>
				<span className="tz-bar__value">{total}</span>
			</div>
			{remaining !== null && (
				<span className={`checkout__bar-time${urgent ? ' is-urgent' : ''}`} aria-hidden="true">
					<Timer size={18} />
					{formatCountdown(remaining)}
				</span>
			)}
			<Button variant="contained" size="large" className="tz-bar__action" onClick={onPay} disabled={paying}>
				{paying ? t('pay.paying') : t('pay.payShort')}
			</Button>
		</div>
	);
};

export default PayBar;
