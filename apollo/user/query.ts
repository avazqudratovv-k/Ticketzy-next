import { gql } from '@apollo/client';
import { MEMBER_FIELDS } from './fragments';

/**************************
 *         MEMBER         *
 *************************/

export const GET_MEMBER = gql`
	query GetMember($memberId: String!) {
		getMember(memberId: $memberId) {
			...MemberFields
		}
	}
	${MEMBER_FIELDS}
`;
