import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_EVENT_SEAT_MAP } from '../../apollo/user/query';
import { LayoutSection } from '../seats/types';
import { SectionNames, sectionNamesOf } from '../seats/label';

/**
 * Section names of an event for `seatLabel`. Reads the seat map layout (cache-first, so many tickets of one event share one request);
 * a failure is ignored and the label then leaves the section out.
 */
export function useSectionNames(eventId: string | undefined, enabled = true): SectionNames {
	const { data } = useQuery(GET_EVENT_SEAT_MAP, { variables: { eventId: eventId ?? '' }, skip: !enabled || !eventId, fetchPolicy: 'cache-first', errorPolicy: 'ignore' });
	const sections: LayoutSection[] | undefined = data?.getEventSeatMap?.venueLayout?.sections;
	return useMemo(() => sectionNamesOf(sections), [sections]);
}
