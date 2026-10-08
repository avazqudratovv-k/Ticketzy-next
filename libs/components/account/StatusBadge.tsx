import { useTranslation } from 'next-i18next';
import { CheckCircle, Clock, Prohibit, ArrowUUpLeft, QrCode, WarningCircle } from 'phosphor-react';
import { OrderStatus } from '../../types/account';
import { TicketState, TICKET_BADGE } from '../../account/tickets';

const ORDER_TONE: Record<OrderStatus, 'success' | 'neutral' | 'info' | 'danger' | 'warning'> = {
	PAID: 'success',
	REFUNDED: 'info',
	PENDING_PAYMENT: 'warning',
	FAILED: 'danger',
	CANCELLED: 'neutral',
	EXPIRED: 'neutral',
};

const ORDER_ICON = {
	PAID: CheckCircle,
	REFUNDED: ArrowUUpLeft,
	PENDING_PAYMENT: Clock,
	FAILED: WarningCircle,
	CANCELLED: Prohibit,
	EXPIRED: Clock,
} as const;

/** Order status as text plus an icon and a tinted pill (never colour alone). */
export const OrderBadge = ({ status }: { status: OrderStatus }) => {
	const { t } = useTranslation('account');
	const Icon = ORDER_ICON[status];
	return (
		<span className={`tz-badge tz-badge--${ORDER_TONE[status]}`}>
			<Icon size={14} weight="bold" aria-hidden="true" />
			{t(`order.status.${status}`)}
		</span>
	);
};

const TICKET_ICON = {
	valid: CheckCircle,
	used: QrCode,
	refunded: ArrowUUpLeft,
	cancelled: Prohibit,
	expired: Clock,
} as const;

export const TicketBadge = ({ state }: { state: TicketState }) => {
	const { t } = useTranslation('account');
	const Icon = TICKET_ICON[state];
	return (
		<span className={`tz-badge tz-badge--${TICKET_BADGE[state]}`}>
			<Icon size={14} weight="bold" aria-hidden="true" />
			{t(`ticket.state.${state}`)}
		</span>
	);
};
