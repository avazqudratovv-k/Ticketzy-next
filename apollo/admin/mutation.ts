import { gql } from '@apollo/client';
import { ADMIN_ORGANIZER_FIELDS, MODERATION_FIELDS } from './query';

/** Admin operations (names from docs/ai/schema.json). Every status change is its own operation; the backend audits and notifies. */

const EVENT_RESULT = gql`
	fragment AdminEventResult on Event {
		_id
		eventStatus
		rejectReason
		cancelReason
		updatedAt
		eventModeration {
			...AdminModerationFields
		}
	}
	${MODERATION_FIELDS}
`;

export const APPROVE_EVENT_BY_ADMIN = gql`
	mutation ApproveEventByAdmin($eventId: String!) {
		approveEventByAdmin(eventId: $eventId) {
			...AdminEventResult
		}
	}
	${EVENT_RESULT}
`;

export const REJECT_EVENT_BY_ADMIN = gql`
	mutation RejectEventByAdmin($input: EventReasonInput!) {
		rejectEventByAdmin(input: $input) {
			...AdminEventResult
		}
	}
	${EVENT_RESULT}
`;

export const CANCEL_EVENT_BY_ADMIN = gql`
	mutation CancelEventByAdmin($input: EventReasonInput!) {
		cancelEventByAdmin(input: $input) {
			...AdminEventResult
		}
	}
	${EVENT_RESULT}
`;

/** Runs the AI check again and stores the result on the event. Needs the AI to be on; otherwise the server says so. */
export const RUN_EVENT_MODERATION_BY_ADMIN = gql`
	mutation RunEventModerationByAdmin($eventId: String!) {
		runEventModerationByAdmin(eventId: $eventId) {
			...AdminEventResult
		}
	}
	${EVENT_RESULT}
`;

/** Safe to repeat: it only touches orders of a CANCELLED event that are still PAID. */
export const RETRY_EVENT_REFUNDS_BY_ADMIN = gql`
	mutation RetryEventRefundsByAdmin($eventId: String!) {
		retryEventRefundsByAdmin(eventId: $eventId) {
			eventId
			refundedCount
			failedCount
			totalCount
			failedOrderIds
		}
	}
`;

export const VERIFY_ORGANIZER_BY_ADMIN = gql`
	mutation VerifyOrganizerByAdmin($memberId: String!) {
		verifyOrganizerByAdmin(memberId: $memberId) {
			...AdminOrganizerFields
		}
	}
	${ADMIN_ORGANIZER_FIELDS}
`;

export const REJECT_ORGANIZER_BY_ADMIN = gql`
	mutation RejectOrganizerByAdmin($input: OrganizerReasonInput!) {
		rejectOrganizerByAdmin(input: $input) {
			...AdminOrganizerFields
		}
	}
	${ADMIN_ORGANIZER_FIELDS}
`;

export const SUSPEND_ORGANIZER_BY_ADMIN = gql`
	mutation SuspendOrganizerByAdmin($input: OrganizerReasonInput!) {
		suspendOrganizerByAdmin(input: $input) {
			...AdminOrganizerFields
		}
	}
	${ADMIN_ORGANIZER_FIELDS}
`;

export const REINSTATE_ORGANIZER_BY_ADMIN = gql`
	mutation ReinstateOrganizerByAdmin($memberId: String!) {
		reinstateOrganizerByAdmin(memberId: $memberId) {
			...AdminOrganizerFields
		}
	}
	${ADMIN_ORGANIZER_FIELDS}
`;

export const SET_COMMISSION_OVERRIDE_BY_ADMIN = gql`
	mutation SetCommissionOverrideByAdmin($input: CommissionOverrideInput!) {
		setCommissionOverrideByAdmin(input: $input) {
			...AdminOrganizerFields
		}
	}
	${ADMIN_ORGANIZER_FIELDS}
`;

/** Back to the automatic tier rate. The answer carries what was removed and the rate the organizer falls back to. */
export const CLEAR_COMMISSION_OVERRIDE_BY_ADMIN = gql`
	mutation ClearCommissionOverrideByAdmin($input: ClearCommissionOverrideInput!) {
		clearCommissionOverrideByAdmin(input: $input) {
			member {
				...AdminOrganizerFields
			}
			previousOverride {
				rate
				endsAt
				reason
			}
			automaticRate
			reason
			clearedAt
		}
	}
	${ADMIN_ORGANIZER_FIELDS}
`;

/** Only `memberStatus` is ever sent from the UI. The backend refuses it for organizers (use the organizer operations). */
export const UPDATE_MEMBER_BY_ADMIN = gql`
	mutation UpdateMemberByAdmin($input: MemberUpdate!) {
		updateMemberByAdmin(input: $input) {
			_id
			memberType
			memberStatus
			updatedAt
		}
	}
`;

/**
 * `getAllMembersByAdmin` is declared as a Mutation in the backend schema (docs/ai/schema.json), although it only reads.
 * The members page therefore calls it with `client.mutate`.
 */
export const GET_ALL_MEMBERS_BY_ADMIN = gql`
	mutation GetAllMembersByAdmin($input: MembersInquiry!) {
		getAllMembersByAdmin(input: $input) {
			list {
				_id
				memberType
				memberStatus
				memberEmail
				memberPhone
				memberNick
				memberFullName
				memberImage
				memberEvents
				completedEvents
				deletedAt
				emailReusableAt
				previousAccountId
				reusedByMemberId
				createdAt
				updatedAt
			}
			metaCounter {
				total
			}
		}
	}
`;
