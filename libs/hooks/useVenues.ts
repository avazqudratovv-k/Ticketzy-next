import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { venuesByIdQuery } from '../../apollo/user/query';
import { VenueBrief } from '../types/account';

/** Venue name, city and time zone by id. Orders and tickets carry only `venueId`; the venue is one aliased request, cached per venue. */
export default function useVenues(venueIds: (string | undefined | null)[]) {
	const ids = useMemo(() => Array.from(new Set(venueIds.filter((id): id is string => Boolean(id)))).sort(), [venueIds]);
	const query = useMemo(() => venuesByIdQuery(ids.length ? ids : ['none']), [ids]);
	const variables = useMemo(() => Object.fromEntries(ids.map((id, i) => [`id${i}`, id])), [ids]);
	// A venue that cannot be read must not hide the rest, so partial data is kept
	const { data } = useQuery(query, { variables, skip: ids.length === 0, errorPolicy: 'all' });
	return useMemo(() => {
		const map = new Map<string, VenueBrief>();
		ids.forEach((id, i) => {
			const venue = data?.[`v${i}`];
			if (venue) map.set(id, venue);
		});
		return map;
	}, [data, ids]);
}
