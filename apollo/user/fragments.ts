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
