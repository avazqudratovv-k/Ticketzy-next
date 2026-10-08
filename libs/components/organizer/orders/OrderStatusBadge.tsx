import { useTranslation } from 'next-i18next';
import { ArrowUUpLeft, CheckCircle, Clock, Prohibit, WarningCircle } from 'phosphor-react';
import { OrderStatusKey } from '../../../organizer/orders';

const TONE: Record<OrderStatusKey, 'success' | 'neutral' | 'info' | 'danger' | 'warning'> = {
	PAID: 'success',
	REFUNDED: 'info',
	PENDING_PAYMENT: 'warning',
	FAILED: 'danger',
	CANCELLED: 'neutral',
	EXPIRED: 'neutral',
};
const ICON = { PAID: CheckCircle, REFUNDED: ArrowUUpLeft, PENDING_PAYMENT: Clock, FAILED: WarningCircle, CANCELLED: Prohibit, EXPIRED: Clock } as const;

/** Order status as text plus an icon and a tinted pill (never colour alone). */
const OrderStatusBadge = ({ status }: { status: OrderStatusKey }) => {
	const { t } = useTranslation('organizer');
	const Icon = ICON[status];
	return (
		<span className={`tz-badge tz-badge--${TONE[status]}`}>
			<Icon size={14} weight="bold" aria-hidden="true" />
			{t(`orders.status.${status}`)}
		</span>
	);
};

export default OrderStatusBadge;
