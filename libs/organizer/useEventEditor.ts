import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { CREATE_EVENT, CREATE_TICKET_TYPE, SUBMIT_EVENT_FOR_APPROVAL, UPDATE_EVENT, UPDATE_TICKET_TYPE } from '../../apollo/organizer/mutation';
import { GET_EVENT_TICKET_TYPES, GET_VENUE_DETAIL, GET_VENUE_OPTIONS } from '../../apollo/organizer/query';
import { editModeOf } from './events';
import { describeError, Described } from './errors';
import {
	allErrors,
	canCreateDraft,
	emptyValues,
	FieldErrors,
	FormValues,
	newRow,
	rowFromTicketType,
	rowsForSeating,
	snapshot,
	StepId,
	stepOfError,
	TicketRow,
	toCreateInput,
	toTicketInput,
	toUpdateInput,
	valuesFromEvent,
} from './form';
import { OrgEvent, OrgTicketType, OrgVenue } from './types';

/** A row the organizer has not started on is neither validated nor saved (a RESERVED tier row appears by itself). */
export const isUntouched = (row: TicketRow, seatingType: 'GENERAL' | 'RESERVED') =>
	!row.id && !row.price.trim() && (seatingType === 'RESERVED' || (!row.name.trim() && !row.quantity.trim()));

/** The fields of a row that are saved; used to tell a changed row from an untouched one. */
const pickRow = (row: TicketRow) => ({
	id: row.id ?? null,
	tierKey: row.tierKey,
	name: row.name.trim(),
	price: row.price.trim(),
	quantity: row.quantity.trim(),
	maxPerOrder: row.maxPerOrder.trim(),
	status: row.status,
});
const rowsSignature = (rows: TicketRow[], seatingType: 'GENERAL' | 'RESERVED') =>
	// Sorted: the server lists ticket types by price, the form lists tiers in layout order
	JSON.stringify(
		rows
			.filter((row) => !isUntouched(row, seatingType))
			.map(pickRow)
			.sort((a, b) => String(a.id ?? a.tierKey).localeCompare(String(b.id ?? b.tierKey))),
	);

const DRAFT_PREFIX = 'tz:event-draft:';

export type SaveResult = { ok: true; event: OrgEvent } | { ok: false };

interface Options {
	event?: OrgEvent | null;
	ticketTypes?: OrgTicketType[];
	/** called after the first save created the event, so the page can move to /[id]/edit */
	onCreated?: (event: OrgEvent) => void;
}

/** State, validation and saving of the organizer's event form. One instance per event (the page remounts it by id). */
export default function useEventEditor({ event: initialEvent = null, ticketTypes: initialTypes = [], onCreated }: Options) {
	const client = useApolloClient();
	const [event, setEvent] = useState<OrgEvent | null>(initialEvent);
	const [values, setValues] = useState<FormValues>(() => (initialEvent ? valuesFromEvent(initialEvent) : emptyValues()));
	const [rows, setRows] = useState<TicketRow[]>(() => initialTypes.map(rowFromTicketType));
	const [saved, setSaved] = useState(() => ({
		values: JSON.stringify(initialEvent ? valuesFromEvent(initialEvent) : emptyValues()),
		rows: rowsSignature(initialTypes.map(rowFromTicketType), initialEvent?.seatingType ?? 'GENERAL'),
	}));
	const [errors, setErrors] = useState<FieldErrors>({});
	const [serverError, setServerError] = useState<Described | null>(null);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<Date | null>(null);
	const busy = useRef(false);

	// Venues the organizer can pick, plus the event's own venue when it is not among them (closed)
	const { data: venueData, loading: venuesLoading, error: venuesError, refetch: refetchVenues } = useQuery(GET_VENUE_OPTIONS, {
		variables: { input: { page: 1, limit: 100, sort: 'venueName', direction: 'ASC', search: {} } },
		errorPolicy: 'all',
		// A venue made on the venue pages must show up when the organizer comes back
		fetchPolicy: 'cache-and-network',
	});
	const venues: OrgVenue[] = useMemo(() => venueData?.getVenues?.list ?? [], [venueData]);
	const listed = venues.find((venue) => venue._id === values.venueId);
	const { data: ownVenueData } = useQuery(GET_VENUE_DETAIL, {
		variables: { venueId: values.venueId },
		skip: !values.venueId || Boolean(listed),
		errorPolicy: 'ignore',
	});
	const venue: OrgVenue | undefined = listed ?? ownVenueData?.getVenue ?? undefined;

	const status = event?.eventStatus ?? 'DRAFT';
	const mode = editModeOf(status);

	// Back from "Create a new venue": the form comes back as it was, with the new venue chosen
	const router = useRouter();
	const pagePath = router.asPath.split('?')[0];
	const stashDraft = useCallback(() => {
		try {
			window.sessionStorage.setItem(DRAFT_PREFIX + pagePath, JSON.stringify(values));
		} catch {
			/* private mode: the form simply starts over */
		}
	}, [pagePath, values]);
	const pickedVenue = typeof router.query.venueId === 'string' ? router.query.venueId : '';
	useEffect(() => {
		if (!router.isReady || !pickedVenue) return;
		let stored: FormValues | null = null;
		try {
			const raw = window.sessionStorage.getItem(DRAFT_PREFIX + pagePath);
			window.sessionStorage.removeItem(DRAFT_PREFIX + pagePath);
			stored = raw ? (JSON.parse(raw) as FormValues) : null;
		} catch {
			stored = null;
		}
		if (mode === 'full') setValues((current) => ({ ...(stored ?? current), venueId: pickedVenue }));
		const { venueId: _picked, ...rest } = router.query;
		void _picked;
		void router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true, scroll: false });
		// Runs once per arrival with a venue in the address
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router.isReady, pickedVenue]);

	// Tier rows follow the venue and the seating type
	useEffect(() => {
		setRows((current) => {
			const next = rowsForSeating(current, values.seatingType, venue);
			return JSON.stringify(next) === JSON.stringify(current) ? current : next;
		});
	}, [values.seatingType, venue]);

	const valuesDirty = JSON.stringify(values) !== saved.values;
	/** The AI reads the title and description saved on the event, so only those two decide if a save must come first */
	const savedBasics = JSON.parse(saved.values) as FormValues;
	const basicsDirty = values.title.trim() !== savedBasics.title.trim() || values.description.trim() !== savedBasics.description.trim();
	const rowsDirty = rowsSignature(rows, values.seatingType) !== saved.rows;
	const dirty = valuesDirty || rowsDirty;

	const setField = useCallback(<K extends keyof FormValues>(name: K, value: FormValues[K]) => {
		setValues((current) => ({ ...current, [name]: value }));
		const keys: string[] = [name as string];
		if (/^start(Date|Time)$/.test(name as string)) keys.push('start');
		if (/^end(Date|Time)$/.test(name as string)) keys.push('end');
		if (/^saleStart(Date|Time)$/.test(name as string)) keys.push('saleStart');
		if (/^saleEnd(Date|Time)$/.test(name as string)) keys.push('saleEnd');
		if (name === 'venueId') keys.push('seatingType');
		setErrors((current) => {
			if (!keys.some((key) => key in current)) return current;
			const next = { ...current };
			keys.forEach((key) => delete next[key]);
			return next;
		});
	}, []);

	const setTranslation = useCallback((locale: 'KO' | 'RU' | 'UZ', field: 'title' | 'description', value: string) => {
		setValues((current) => ({
			...current,
			translations: { ...current.translations, [locale]: { ...current.translations[locale], [field]: value } },
		}));
		setErrors((current) => {
			const key = `${locale}.${field}`;
			if (!(key in current)) return current;
			const { [key]: _removed, ...rest } = current;
			void _removed;
			return rest;
		});
	}, []);

	const updateRow = useCallback((key: string, patch: Partial<TicketRow>) => {
		setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
		setErrors((current) => {
			const next = { ...current };
			Object.keys(patch).forEach((field) => delete next[`${key}.${field}`]);
			return next;
		});
	}, []);
	const addRow = useCallback(() => setRows((current) => [...current, newRow()]), []);
	const removeRow = useCallback((key: string) => setRows((current) => current.filter((row) => row.key !== key || row.id)), []);

	const reloadTicketTypes = useCallback(
		async (eventId: string): Promise<TicketRow[]> => {
			const { data } = await client.query({ query: GET_EVENT_TICKET_TYPES, variables: { eventId }, fetchPolicy: 'network-only' });
			return (data.getTicketTypes as OrgTicketType[]).map(rowFromTicketType);
		},
		[client],
	);

	/** Checks the form, then saves the event content and the ticket types that changed. Never changes the status (except APPROVED -> PENDING, by the server). */
	const save = useCallback(async (): Promise<SaveResult & { firstErrorStep?: StepId }> => {
		if (busy.current || mode === 'locked') return { ok: false };
		setServerError(null);

		const filled = rows.filter((row) => !isUntouched(row, values.seatingType));
		const found = allErrors(values, filled, venue);
		// The first draft needs only what createEvent asks for; later saves check everything that is filled in
		if (!event && !canCreateDraft(values, venue) && Object.keys(found).length === 0) return { ok: false };
		if (Object.keys(found).length) {
			setErrors(found);
			return { ok: false, firstErrorStep: stepOfError(Object.keys(found)[0]) };
		}
		setErrors({});

		busy.current = true;
		setSaving(true);
		let current = event;
		try {
			if (!current) {
				const { data } = await client.mutate({ mutation: CREATE_EVENT, variables: { input: toCreateInput(values, venue) } });
				current = data.createEvent as OrgEvent;
				setEvent(current);
				setSaved((prev) => ({ ...prev, values: JSON.stringify(values) }));
			} else if (valuesDirty) {
				const { data } = await client.mutate({ mutation: UPDATE_EVENT, variables: { input: toUpdateInput(current._id, values, venue, mode) } });
				current = data.updateEvent as OrgEvent;
				setEvent(current);
				setSaved((prev) => ({ ...prev, values: JSON.stringify(values) }));
			}

			if (rowsDirty) {
				const before = new Map((JSON.parse(saved.rows) as ReturnType<typeof pickRow>[]).map((row) => [row.id, JSON.stringify(row)]));
				const changedRows = new Set(filled.filter((row) => row.id && before.get(row.id) !== JSON.stringify(pickRow(row))).map((row) => row.id as string));
				for (const row of filled) {
					if (row.id && !changedRows.has(row.id)) continue;
					const input = toTicketInput(row, current._id, values.seatingType);
					await client.mutate({ mutation: row.id ? UPDATE_TICKET_TYPE : CREATE_TICKET_TYPE, variables: { input } });
				}
				const fresh = rowsForSeating(await reloadTicketTypes(current._id), values.seatingType, venue);
				setRows(fresh);
				setSaved((prev) => ({ ...prev, rows: rowsSignature(fresh, values.seatingType) }));
			}
			setSavedAt(new Date());
			const wasNew = !event;
			if (wasNew && current) onCreated?.(current);
			return { ok: true, event: current };
		} catch (err) {
			setServerError(describeError(err));
			// The event may exist now even when a ticket type failed: keep the page in sync with the server
			if (current && current !== event) setEvent(current);
			if (current) {
				try {
					const fresh = rowsForSeating(await reloadTicketTypes(current._id), values.seatingType, venue);
					setRows((existing) => mergeServerRows(existing, fresh));
				} catch {
					/* the error above is already shown */
				}
			}
			return { ok: false };
		} finally {
			busy.current = false;
			setSaving(false);
		}
	}, [client, event, mode, onCreated, reloadTicketTypes, rows, rowsDirty, saved.rows, values, valuesDirty, venue]);

	/** Submits the saved event for review. The caller saves first. */
	const submit = useCallback(async (): Promise<OrgEvent | null> => {
		if (!event) return null;
		setServerError(null);
		setSaving(true);
		try {
			const { data } = await client.mutate({ mutation: SUBMIT_EVENT_FOR_APPROVAL, variables: { eventId: event._id } });
			setEvent(data.submitEventForApproval as OrgEvent);
			return data.submitEventForApproval as OrgEvent;
		} catch (err) {
			setServerError(describeError(err));
			return null;
		} finally {
			setSaving(false);
		}
	}, [client, event]);

	const refreshEvent = useCallback((next: OrgEvent) => setEvent(next), []);

	return {
		event,
		status,
		mode,
		values,
		rows,
		errors,
		setErrors,
		serverError,
		setServerError,
		saving,
		savedAt,
		dirty,
		valuesDirty,
		basicsDirty,
		rowsDirty,
		stashDraft,
		venues,
		venue,
		venuesLoading,
		venuesError,
		refetchVenues,
		setField,
		setTranslation,
		updateRow,
		addRow,
		removeRow,
		save,
		submit,
		refreshEvent,
		snapshot: snapshot(values, rows),
	};
}

/** After a partial failure: rows that now exist on the server get their ids, the rest keep what the organizer typed. */
const mergeServerRows = (existing: TicketRow[], fresh: TicketRow[]): TicketRow[] => {
	const byTier = new Map(fresh.filter((row) => row.tierKey).map((row) => [row.tierKey, row]));
	const ids = new Set(existing.map((row) => row.id).filter(Boolean));
	return [
		...existing.map((row) => {
			if (row.id) return row;
			const match = row.tierKey ? byTier.get(row.tierKey) : undefined;
			return match?.id && !ids.has(match.id) ? { ...row, id: match.id, key: match.key } : row;
		}),
		...fresh.filter((row) => row.id && !existing.some((item) => item.id === row.id) && !(row.tierKey && existing.some((item) => item.tierKey === row.tierKey))),
	];
};
