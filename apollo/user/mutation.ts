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
