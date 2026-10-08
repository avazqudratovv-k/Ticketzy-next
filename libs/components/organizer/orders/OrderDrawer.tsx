import { useRouter } from 'next/router';
import { Drawer, IconButton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { X } from 'phosphor-react';
import OrderStatusBadge from './OrderStatusBadge';
import { groupSeats, OrgOrder, payoutOf } from '../../../organizer/orders';
import { formatNumber, formatPrice, formatViewerDate } from '../../../format';

interface Props {
	order: OrgOrder | null;
	onClose: () => void;
	typeName: (id: string) => string;
	sectionName: (key: string) => string;
}

/** One order in full: buyer nickname only (the backend sends no email or phone), tickets, seats and the money split. */
const OrderDrawer = ({ order, onClose, typeName, sectionName }: Props) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const money = (amount: number) => formatPrice(amount, locale, order?.currency ?? 'KRW');
	const seats = order ? groupSeats(order.seats, sectionName) : [];

	return (
		<Drawer anchor="right" open={Boolean(order)} onClose={onClose} PaperProps={{ className: 'org-drawer', role: 'dialog', 'aria-labelledby': 'order-drawer-title' } as object}>
			{order && (
				<>
					<div className="org-drawer__head">
						<div>
							<h2 id="order-drawer-title">{t('orders.drawer.title', { number: order.orderNumber })}</h2>
							<OrderStatusBadge status={order.orderStatus} />
						</div>
						<IconButton onClick={onClose} aria-label={t('orders.drawer.close')}>
							<X size={22} aria-hidden="true" />
						</IconButton>
					</div>
					<div className="org-drawer__body">
						<dl className="org-dl">
							<div>
								<dt>{t('orders.cols.buyer')}</dt>
								<dd>{order.buyerNick || t('orders.unknownBuyer')}</dd>
							</div>
							<div>
								<dt>{t('orders.drawer.placed')}</dt>
								<dd>{formatViewerDate(order.createdAt, locale, true)}</dd>
							</div>
							{order.paidAt && (
								<div>
									<dt>{t('orders.drawer.paid')}</dt>
									<dd>{formatViewerDate(order.paidAt, locale, true)}</dd>
								</div>
							)}
							{order.refundedAt && (
								<div>
									<dt>{t('orders.drawer.refunded')}</dt>
									<dd>{formatViewerDate(order.refundedAt, locale, true)}</dd>
								</div>
							)}
						</dl>

						<h3 className="org-drawer__sub">{t('orders.drawer.tickets', { count: order.ticketCount })}</h3>
						<ul className="org-lines">
							{order.items.map((item) => (
								<li key={item.ticketTypeId}>
									<span>
										{item.quantity} × {typeName(item.ticketTypeId)}
									</span>
									<span>{money(item.unitPrice * item.quantity)}</span>
								</li>
							))}
						</ul>
						{seats.length > 0 && (
							<>
								<h3 className="org-drawer__sub">{t('orders.drawer.seats')}</h3>
								<ul className="org-seats">
									{seats.map((group) => (
										<li key={group.section}>
											<strong>{group.section}</strong>
											{group.places.map((place) => (
												<span key={place.row}>
													{t('orders.drawer.rowSeats', { row: place.row, seats: place.numbers.join(', '), count: place.numbers.length })}
												</span>
											))}
										</li>
									))}
								</ul>
							</>
						)}

						<h3 className="org-drawer__sub">{t('orders.drawer.money')}</h3>
						<ul className="org-lines org-lines--money">
							<li>
								<span>{t('orders.drawer.buyerPaid')}</span>
								<span>{money(order.totalAmount)}</span>
							</li>
							<li>
								<span>{t('orders.drawer.commission', { rate: formatNumber(order.commissionRate, locale) })}</span>
								<span>−{money(order.commissionAmount)}</span>
							</li>
							<li className="is-total">
								<span>{t('orders.drawer.payout')}</span>
								<span>{money(payoutOf(order))}</span>
							</li>
						</ul>
						{order.orderStatus === 'REFUNDED' && <p className="org-hint">{t('orders.drawer.refundNote')}</p>}
						{order.orderStatus === 'PENDING_PAYMENT' && <p className="org-hint">{t('orders.drawer.pendingNote')}</p>}
					</div>
				</>
			)}
		</Drawer>
	);
};

export default OrderDrawer;
