import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { CREATE_VENUE, UPDATE_VENUE } from '../../apollo/organizer/venue';
import { DEFAULT_TIMEZONE } from '../format';
import { describeError, Described } from '../organizer/errors';
import useLayoutHistory from './history';
import { placeServerError, ServerIssue } from './serverIssues';
import { isTimezone } from './timezones';
import { VenueRecord } from './types';
import { clampStage, focalToInput, readFocalArea, sameFocal } from '../seats/focal';
import { FocalArea } from '../seats/types';
import { DraftSection, duplicateSection, fromServer, Layout, LIMITS, newSection, tierSummary, toInput, totals, validateLayout, VenueType } from './model';

/** What the undo history holds: the sections and the stage or pitch. */
export interface Drawing {
	sections: Layout;
	focal: FocalArea;
}

const drawingOf = (venue: VenueRecord | null | undefined): Drawing => ({
	sections: fromServer(venue?.venueLayout?.sections),
	focal: readFocalArea(venue?.venueLayout?.focalArea),
});

/** A stable text of the drawing, to tell a changed one from an untouched one. */
export const drawingSignature = (drawing: Drawing) => JSON.stringify([toInput(drawing.sections), focalToInput(drawing.focal)]);

export interface VenueValues {
	name: string;
	type: VenueType;
	city: string;
	address: string;
	timezone: string;
	images: string[];
}

export type VenueFieldError = 'nameLength' | 'cityLength' | 'addressLength' | 'timezone';

export const emptyValues = (): VenueValues => ({ name: '', type: 'HALL', city: '', address: '', timezone: DEFAULT_TIMEZONE, images: [] });

const valuesOf = (venue: VenueRecord): VenueValues => ({
	name: venue.venueName,
	type: venue.venueType,
	city: venue.venueCity,
	address: venue.venueAddress,
	timezone: venue.venueTimezone,
	images: venue.venueImages ?? [],
});

export function validateValues(values: VenueValues): Partial<Record<keyof VenueValues, VenueFieldError>> {
	const errors: Partial<Record<keyof VenueValues, VenueFieldError>> = {};
	const len = (v: string) => v.trim().length;
	if (len(values.name) < LIMITS.venueName.min || len(values.name) > LIMITS.venueName.max) errors.name = 'nameLength';
	if (len(values.city) < LIMITS.city.min || len(values.city) > LIMITS.city.max) errors.city = 'cityLength';
	if (len(values.address) < LIMITS.address.min || len(values.address) > LIMITS.address.max) errors.address = 'addressLength';
	if (!values.timezone || !isTimezone(values.timezone)) errors.timezone = 'timezone';
	return errors;
}

interface Options {
	venue?: VenueRecord | null;
	/** The layout cannot be edited (events with seats, or a venue that is not the member's own) */
	layoutLocked: boolean;
	onSaved: (venue: VenueRecord, created: boolean) => void;
}

/** State, validation and saving of one venue and its layout. One instance per venue (the page remounts it by id). */
export default function useVenueEditor({ venue = null, layoutLocked, onSaved }: Options) {
	const client = useApolloClient();
	const initialDrawing = useMemo(() => drawingOf(venue), [venue]);
	const history = useLayoutHistory<Drawing>(initialDrawing);
	const { sections: layout, focal } = history.present;
	const [venueRecord, setVenueRecord] = useState<VenueRecord | null>(venue);
	const [values, setValues] = useState<VenueValues>(() => (venue ? valuesOf(venue) : emptyValues()));
	const [saved, setSaved] = useState(() => ({ values: JSON.stringify(venue ? valuesOf(venue) : emptyValues()), layout: drawingSignature(initialDrawing) }));
	const [selectedId, setSelectedIdState] = useState<string | null>(null);
	/** The stage is selected (its handles show, the side panel edits it); a section and the stage are never selected together */
	const [focalSelected, setFocalSelected] = useState(false);
	const [grid, setGrid] = useState(true);
	const [snapOn, setSnapOn] = useState(true);
	const [showErrors, setShowErrors] = useState(false);
	const [saving, setSaving] = useState(false);
	const [serverError, setServerError] = useState<Described | null>(null);
	const [serverSections, setServerSections] = useState<Map<string, ServerIssue[]>>(new Map());
	const [lockedByServer, setLockedByServer] = useState(false);
	const [savedAt, setSavedAt] = useState<Date | null>(null);
	const busy = useRef(false);

	const locked = layoutLocked || lockedByServer;

	const fieldErrors = useMemo(() => validateValues(values), [values]);
	const checked = useMemo(() => validateLayout(layout), [layout]);
	const valuesDirty = JSON.stringify(values) !== saved.values;
	const layoutDirty = drawingSignature(history.present) !== saved.layout;
	const dirty = valuesDirty || layoutDirty;
	const sums = useMemo(() => totals(layout), [layout]);
	const tiers = useMemo(() => tierSummary(layout), [layout]);

	// A section that no longer exists cannot stay selected (undo, delete, a template)
	useEffect(() => {
		if (selectedId && !layout.some((s) => s.id === selectedId)) setSelectedIdState(null);
	}, [layout, selectedId]);
	// A new server answer for sections is stale as soon as the layout changes
	useEffect(() => {
		setServerSections((current) => (current.size ? new Map() : current));
	}, [layout]);

	const setSelectedId = useCallback((id: string | null) => {
		setSelectedIdState(id);
		if (id) setFocalSelected(false);
	}, []);

	const selectFocal = useCallback(() => {
		setSelectedIdState(null);
		setFocalSelected(true);
	}, []);

	const setField = useCallback(<K extends keyof VenueValues>(name: K, value: VenueValues[K]) => {
		setValues((current) => ({ ...current, [name]: value }));
	}, []);

	const updateSection = useCallback(
		(id: string, patch: Partial<DraftSection>, key?: string) => {
			if (locked) return;
			history.set(
				{ sections: layout.map((s) => (s.id === id ? { ...s, ...patch } : s)), focal },
				key ? `${id}:${key}` : undefined,
			);
		},
		[history, layout, focal, locked],
	);

	const addSection = useCallback(
		(kind: 'SEATED' | 'STANDING', labels: { seated: string; standing: string }) => {
			if (locked) return;
			const section = newSection(layout, kind, labels);
			history.set({ sections: [...layout, section], focal });
			setSelectedId(section.id);
		},
		[history, layout, focal, locked, setSelectedId],
	);

	const removeSection = useCallback(
		(id: string) => {
			if (locked) return;
			history.set({ sections: layout.filter((s) => s.id !== id), focal });
		},
		[history, layout, focal, locked],
	);

	const duplicate = useCallback(
		(id: string) => {
			if (locked) return;
			const source = layout.find((s) => s.id === id);
			if (!source) return;
			const copy = duplicateSection(layout, source);
			history.set({ sections: [...layout, copy], focal });
			setSelectedId(copy.id);
		},
		[history, layout, focal, locked, setSelectedId],
	);

	/** A template: its sections and its stage or pitch replace the drawing in one undo step. */
	const replaceDrawing = useCallback(
		(next: Drawing) => {
			if (locked) return;
			history.set(next);
			setSelectedIdState(null);
			setFocalSelected(false);
		},
		[history, locked],
	);

	/** A STAGE only. A PITCH has a fixed size and place, so there is nothing to change and nothing to send. */
	const updateStage = useCallback(
		(patch: Partial<Pick<FocalArea, 'x' | 'y' | 'width' | 'height'>>, key?: string) => {
			if (locked || focal.type !== 'STAGE') return;
			const next = clampStage({ ...focal, ...patch });
			if (sameFocal(next, focal)) return;
			history.set({ sections: layout, focal: next }, key ? `stage:${key}` : undefined);
		},
		[focal, history, layout, locked],
	);

	/** A drag or a resize of the stage: the preview shows it, the end of the gesture is one undo step. */
	const previewStage = useCallback(
		(next: Pick<FocalArea, 'x' | 'y' | 'width' | 'height'>) => {
			if (locked || focal.type !== 'STAGE') return;
			const clamped = clampStage({ ...focal, ...next });
			if (sameFocal(clamped, focal)) return;
			history.preview({ sections: layout, focal: clamped });
		},
		[focal, history, layout, locked],
	);

	/** A drag: the preview moves the section, the end of the drag is one undo step. */
	const previewMove = useCallback(
		(id: string, x: number, y: number) => {
			if (locked) return;
			history.preview({ sections: layout.map((s) => (s.id === id ? { ...s, x, y } : s)), focal });
		},
		[history, layout, focal, locked],
	);

	const nudge = useCallback(
		(id: string, dx: number, dy: number) => {
			const section = layout.find((s) => s.id === id);
			if (!section || locked) return;
			history.set(
				{ sections: layout.map((s) => (s.id === id ? { ...s, x: Math.round(s.x + dx), y: Math.round(s.y + dy) } : s)), focal },
				`${id}:nudge`,
			);
		},
		[history, layout, focal, locked],
	);

	/** Everything that blocks a save, found before asking the server. */
	const blocking = Object.keys(fieldErrors).length > 0 || checked.errorCount > 0 || checked.layoutError !== null;

	const save = useCallback(async (): Promise<boolean> => {
		if (busy.current) return false;
		setShowErrors(true);
		setServerError(null);
		if (blocking) {
			// Select the first section with a problem so the organizer sees where it is
			const bad = layout.find((s) => (checked.bySection.get(s.id)?.errors.length ?? 0) > 0);
			if (bad && Object.keys(fieldErrors).length === 0) setSelectedId(bad.id);
			return false;
		}
		busy.current = true;
		setSaving(true);
		try {
			const base = {
				venueName: values.name.trim(),
				venueType: values.type,
				venueCity: values.city.trim(),
				venueAddress: values.address.trim(),
				venueTimezone: values.timezone,
				venueImages: values.images,
			};
			// A PITCH goes as its type alone: the server fixes its size and place and refuses any other
			const layoutInput = { ...toInput(layout), focalArea: focalToInput(focal) };
			let result: VenueRecord;
			if (!venueRecord) {
				const { data } = await client.mutate({ mutation: CREATE_VENUE, variables: { input: { ...base, venueLayout: layoutInput } } });
				result = data.createVenue;
			} else {
				// The server refuses any venue update that carries a layout once seats exist, so the layout is only sent when it changed
				const input: Record<string, unknown> = { _id: venueRecord._id, ...base };
				if (layoutDirty) input.venueLayout = layoutInput;
				const { data } = await client.mutate({ mutation: UPDATE_VENUE, variables: { input } });
				result = data.updateVenue;
			}
			const created = !venueRecord;
			setVenueRecord(result);
			setValues(valuesOf(result));
			// The undo history stays: what was saved is the layout on screen
			setSaved({ values: JSON.stringify(valuesOf(result)), layout: drawingSignature(history.present) });
			setSavedAt(new Date());
			setShowErrors(false);
			onSaved(result, created);
			return true;
		} catch (err) {
			const described = describeError(err);
			if (described.key === 'layoutLocked') setLockedByServer(true);
			const placed = placeServerError(described, layout);
			setServerSections(placed.bySection);
			const first = layout.find((s) => placed.bySection.has(s.id));
			if (first) setSelectedId(first.id);
			setServerError(described);
			return false;
		} finally {
			busy.current = false;
			setSaving(false);
		}
	}, [blocking, checked, client, fieldErrors, focal, history.present, layout, layoutDirty, onSaved, venueRecord, values]);

	/** Puts the layout back to what is saved (after the server said it is locked). */
	const discardLayoutChanges = useCallback(() => {
		const fresh = drawingOf(venueRecord);
		history.reset(fresh);
		setSaved((current) => ({ ...current, layout: drawingSignature(fresh) }));
		setServerError(null);
		setSelectedIdState(null);
		setFocalSelected(false);
	}, [history, venueRecord]);

	return {
		venue: venueRecord,
		values,
		setField,
		fieldErrors,
		showErrors,
		layout,
		focal,
		history,
		selectedId,
		setSelectedId,
		focalSelected,
		selectFocal,
		grid,
		setGrid,
		snapOn,
		setSnapOn,
		checked,
		sums,
		tiers,
		updateSection,
		addSection,
		removeSection,
		duplicate,
		replaceDrawing,
		updateStage,
		previewStage,
		previewMove,
		nudge,
		dirty,
		layoutDirty,
		valuesDirty,
		saving,
		save,
		serverError,
		serverSections,
		lockedByServer,
		locked,
		savedAt,
		discardLayoutChanges,
		setServerError,
	};
}

export type VenueEditorState = ReturnType<typeof useVenueEditor>;
