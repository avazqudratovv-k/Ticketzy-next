import { makeVar } from '@apollo/client';
import { MemberProfile } from '../libs/types/member';

/** The signed-in member, or null. Filled by restoreSession() and logIn(). */
export const userVar = makeVar<MemberProfile | null>(null);

/** False until the first session restore has finished, so guards and the header do not flash the wrong state. */
export const authReadyVar = makeVar<boolean>(false);
