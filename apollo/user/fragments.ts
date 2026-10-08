import { gql } from '@apollo/client';

export const MEMBER_FIELDS = gql`
	fragment MemberFields on Member {
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
`;

export const EVENT_CARD_FIELDS = gql`
	fragment EventCardFields on Event {
		_id
		eventCategory
		eventStatus
		seatingType
		eventTitle
		eventDesc
		eventImages
		eventTranslations {
			locale
			title
			description
		}
		eventMinPrice
		eventLikes
		eventViews
		eventComments
		organizerId
		startAt
		endAt
		venueData {
			_id
			venueName
			venueCity
			venueAddress
			venueTimezone
		}
		meLiked {
			myFavorite
		}
	}
`;
