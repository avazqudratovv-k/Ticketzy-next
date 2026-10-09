import { createElement } from 'react';
import { useTranslation } from 'next-i18next';
import { CheckCircle, Clock, HourglassMedium, MinusCircle } from 'phosphor-react';
import { PAYOUT_TONE, PayoutStatus } from '../../payouts';

const ICONS = { NOT_YET_DUE: Clock, DUE: HourglassMedium, PAID_OUT: CheckCircle, NOTHING_TO_PAY: MinusCircle } as const;

/** Status of a payout: icon and text, colour is only a hint. Labels are in common.json. */
const PayoutStatusChip = ({ status }: { status: PayoutStatus }) => {
	const { t } = useTranslation('common');
	return (
		<span className={`tz-badge tz-badge--${PAYOUT_TONE[status]}`}>
			{createElement(ICONS[status], { size: 14, weight: 'bold', 'aria-hidden': true })}
			{t(`payoutStatus.${status}`)}
		</span>
	);
};

export default PayoutStatusChip;
