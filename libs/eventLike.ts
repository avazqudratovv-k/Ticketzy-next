import { EventItem } from './types/event';

/**
 * The one place that reads "did the signed-in member like this event". The backend answers `meLiked` as a list with one
 * `{ myFavorite: true }` item after a like and an empty list (or null, for a guest) otherwise; every card and the event page use this.
 */
export const isEventLiked = (event: Pick<EventItem, 'meLiked'>): boolean => event.meLiked?.[0]?.myFavorite === true;
