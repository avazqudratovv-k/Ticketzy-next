export type { OrderStatusKey, OrderSortKey } from '../organizer/orders';
export { ORDER_SORTS, isOrderSortKey, isOrderStatus } from '../organizer/orders';

/** Tabs of the orders list: `all` or one status (lowercase in the URL). */
export const ORDERS_PAGE_SIZE = 10;
export const ORDER_TABS = ['all', 'paid', 'refunded', 'pending_payment', 'failed', 'cancelled', 'expired'] as const;
export type OrderTab = (typeof ORDER_TABS)[number];
export const isOrderTab = (value: string): value is OrderTab => (ORDER_TABS as readonly string[]).includes(value);
export const orderTabStatus = (tab: OrderTab) => (tab === 'all' ? null : tab.toUpperCase());
export const orderCountKey = (tab: OrderTab) => (tab === 'all' ? 'ALL' : tab.toUpperCase());
