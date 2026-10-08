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
