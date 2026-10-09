import { gql } from '@apollo/client';

const PAYOUT_TOTALS = gql`
	fragment PayoutTotalsFields on PayoutTotals {
		totalPaidOut
		totalDue
		totalUpcoming
	}
`;

export const GET_MY_PAYOUTS = gql`
	query GetMyPayouts($input: PayoutsInquiry!) {
		getMyPayouts(input: $input) {
			list {
				eventId
				eventTitle
				payoutDate
				payoutStatus
				gross
				commission
				net
				orderCount
				paidAt
			}
			metaCounter {
				total
			}
			totals {
				...PayoutTotalsFields
			}
		}
	}
	${PAYOUT_TOTALS}
`;

export const GET_PAYOUTS_BY_ADMIN = gql`
	query GetPayoutsByAdmin($input: PayoutsByAdminInquiry!) {
		getPayoutsByAdmin(input: $input) {
			list {
				eventId
				eventTitle
				organizerNick
				organizerEmail
				payoutDate
				payoutStatus
				gross
				commission
				net
				orderCount
				paidAt
				paidBy
				note
			}
			metaCounter {
				total
			}
			totals {
				...PayoutTotalsFields
			}
		}
	}
	${PAYOUT_TOTALS}
`;

/** Overview tile: one row is enough, the totals cover all rows */
export const GET_ADMIN_PAYOUT_TOTALS = gql`
	query GetAdminPayoutTotals {
		getPayoutsByAdmin(input: { page: 1, limit: 1, payoutStatus: DUE }) {
			metaCounter {
				total
			}
			totals {
				...PayoutTotalsFields
			}
		}
	}
	${PAYOUT_TOTALS}
`;

export const MARK_PAYOUT_PAID = gql`
	mutation MarkPayoutPaidByAdmin($input: MarkPayoutPaidInput!) {
		markPayoutPaidByAdmin(input: $input) {
			payoutId
			eventId
			eventTitle
			payoutStatus
			gross
			commission
			net
			orderCount
			paidAt
			paidBy
			note
		}
	}
`;
