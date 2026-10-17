import { gql } from '@apollo/client';

/**************************
 *         MEMBER         *
 *************************/

// The token only holds _id and memberType, so these return just enough to load the profile with GET_MEMBER.

export const LOGIN = gql`
	mutation Login($input: LoginInput!) {
		login(input: $input) {
			_id
			memberType
			accessToken
		}
	}
`;

export const SIGNUP_USER = gql`
	mutation SignupUser($input: MemberInput!) {
		signupUser(input: $input) {
			_id
			memberType
			accessToken
		}
	}
`;

export const SIGNUP_ORGANIZER = gql`
	mutation SignupOrganizer($input: MemberInput!) {
		signupOrganizer(input: $input) {
			_id
			memberType
			accessToken
		}
	}
`;

export const LIKE_TARGET_EVENT = gql`
	mutation LikeTargetEvent($eventId: String!) {
		likeTargetEvent(eventId: $eventId) {
			_id
			eventLikes
			meLiked {
				myFavorite
			}
		}
	}
`;

export const CREATE_COMMENT = gql`
	mutation CreateComment($input: CommentInput!) {
		createComment(input: $input) {
			_id
		}
	}
`;

/** Deleting a comment is `updateComment` with commentStatus DELETE (there is no member-level remove). */
export const UPDATE_COMMENT = gql`
	mutation UpdateComment($input: CommentUpdate!) {
		updateComment(input: $input) {
			_id
			commentStatus
		}
	}
`;

/**************************
 *    SEATS AND CHECKOUT  *
 *************************/

/** Send `seats` (coordinates), not the old `seatIds` form. */
export const HOLD_SEATS = gql`
	mutation HoldSeats($eventId: String!, $seats: [SeatRefInput!]) {
		holdSeats(eventId: $eventId, seats: $seats) {
			eventId
			seats {
				_id
				ticketTypeId
				sectionKey
				row
				number
			}
			heldUntil
			holdSeconds
			serverTime
		}
	}
`;

export const RELEASE_SEATS = gql`
	mutation ReleaseSeats($eventId: String!) {
		releaseSeats(eventId: $eventId)
	}
`;

/** RESERVED events send seatIds (the held seats), GENERAL events send items. Prices are computed by the server. */
export const CREATE_CHECKOUT = gql`
	mutation CreateCheckout($input: CheckoutInput!) {
		createCheckout(input: $input) {
			_id
			orderStatus
			expiresAt
		}
	}
`;

export const PAY_ORDER = gql`
	mutation PayOrder($orderId: String!, $simulate: PaymentSimulation!) {
		payOrder(orderId: $orderId, simulate: $simulate) {
			_id
			orderStatus
			paidAt
		}
	}
`;

export const CANCEL_PENDING_ORDER = gql`
	mutation CancelPendingOrder($orderId: String!) {
		cancelPendingOrder(orderId: $orderId) {
			_id
			orderStatus
		}
	}
`;

/**************************
 *    ACCOUNT (BUYER)     *
 *************************/

/** Whole orders only; the server answers with its own code and message when the order is not eligible. */
export const REQUEST_REFUND = gql`
	mutation RequestRefund($orderId: String!, $reason: String) {
		requestRefund(orderId: $orderId, reason: $reason) {
			_id
			orderStatus
			refundedAt
		}
	}
`;

export const MARK_NOTIFICATION_READ = gql`
	mutation MarkNotificationRead($notificationId: String!) {
		markNotificationRead(notificationId: $notificationId) {
			_id
			notificationStatus
		}
	}
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
	mutation MarkAllNotificationsRead {
		markAllNotificationsRead
	}
`;

export const UPDATE_MEMBER = gql`
	mutation UpdateMember($input: MemberUpdate!) {
		updateMember(input: $input) {
			_id
			memberType
			memberStatus
			memberEmail
			memberPhone
			memberNick
			memberFullName
			memberImage
			memberAddress
			memberDesc
			rejectReason
			createdAt
		}
	}
`;

export const IMAGE_UPLOADER = gql`
	mutation ImageUploader($file: Upload!, $target: String!) {
		imageUploader(file: $file, target: $target)
	}
`;

/** `askAssistant(input: AskAssistantInput!)`: open to visitors and members; the events are the public ones the answer is based on. */
export const ASK_ASSISTANT = gql`
	mutation AskAssistant($input: AskAssistantInput!) {
		askAssistant(input: $input) {
			answer
			events {
				_id
				eventCategory
				eventTitle
				eventTranslations {
					locale
					title
				}
				eventImages
				eventMinPrice
				startAt
				endAt
				venueData {
					_id
					venueName
					venueCity
					venueTimezone
				}
			}
		}
	}
`;

/** Organizer only, own account, no arguments. Clears the server flag; a repeat call changes nothing (backend #120). */
export const MARK_APPROVAL_CELEBRATION_DONE = gql`
	mutation MarkApprovalCelebrationDone {
		markApprovalCelebrationDone {
			memberStatus
			approvalCelebrationPending
		}
	}
`;

/** USER or ORGANIZER, own account. `confirmation` must be exactly DELETE. `ACCOUNT_DELETE_BLOCKED` carries `reasons` (backend #123). */
export const DELETE_MY_ACCOUNT = gql`
	mutation DeleteMyAccount($input: DeleteAccountInput!) {
		deleteMyAccount(input: $input) {
			deleted
			releasedSeatHolds
			cancelledPendingOrders
		}
	}
`;
