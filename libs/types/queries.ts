import { EventItem } from './event';
import { MemberProfile } from './member';
import { AccountOrder } from './account';
import { OrderData } from '../seats/types';

/** Result and variable shapes of the event, member and order queries (hand written, F343). Other queries are still untyped. */
export interface ListResult<T> {
	list: T[];
	metaCounter?: { total: number }[] | null;
}

export interface GetEventData {
	getEvent: EventItem;
}
export interface GetEventVars {
	eventId: string;
}

export interface GetEventsData {
	getEvents: ListResult<EventItem>;
}
export interface GetEventsVars {
	input: Record<string, unknown>;
}

export interface GetMemberData {
	getMember: MemberProfile;
}
export interface GetMemberVars {
	memberId: string;
}

/** GET_ORDER (checkout, confirmation) */
export interface GetOrderData {
	getOrder: OrderData;
}
/** GET_ORDER_DETAIL */
export interface GetOrderDetailData {
	getOrder: AccountOrder;
}
export interface GetOrderVars {
	orderId: string;
}

/** GET_MY_ORDERS */
export interface GetMyOrdersData {
	getMyOrders: ListResult<AccountOrder>;
}
/** GET_MY_PENDING_ORDERS asks only for the fields the seat picker reads */
export interface GetMyOrdersVars {
	input: Record<string, unknown>;
}
