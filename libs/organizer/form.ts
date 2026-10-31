import { EventCategory } from '../types/event';
import { DEFAULT_REFUND_DAYS, MAX_REFUND_DAYS, readRefundPolicy, RefundPolicyType } from '../refundPolicy';
import { EditMode } from './events';
import { OrgEvent, OrgTicketType, OrgVenue, TranslatedLocale, TRANSLATED_LOCALES } from './types';
import { isoToZoned, zonedToIso } from './zoned';

/** Everything the event form edits. Dates are the venue's wall clock as typed (see zoned.ts); they become instants on save. */
export interface FormValues {
	title: string;
	category: EventCategory | '';
	description: string;
	images: string[];
	venueId: string;
	seatingType: 'GENERAL' | 'RESERVED';
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	/** "Same daily hours on every day from startDate to endDate": not sent, it only picks the layout and the rules (see DECISIONS F129) */
	multiDay: boolean;
	saleStartDate: string;
	saleStartTime: string;
	saleEndDate: string;
	saleEndTime: string;
	/** Refund policy: REFUNDABLE until `refundDays` days before the event, or NON_REFUNDABLE (the days are then ignored) */
	refundType: RefundPolicyType;
	refundDays: string;
	translations: Record<TranslatedLocale, { title: string; description: string }>;
}

export interface TicketRow {
	/** stable key for React, also for rows that are not saved yet */
	key: string;
	/** set once the ticket type exists on the server */
	id?: string;
	tierKey: string;
	name: string;
	price: string;
	quantity: string;
	maxPerOrder: string;
	status: 'ACTIVE' | 'PAUSED' | 'SOLD_OUT';
	sold: number;
	/** RESERVED only: seats of the tier in the venue layout (the quantity is computed by the server) */
	seatCount?: number;
}

export const STEPS = ['details', 'images', 'venue', 'tickets', 'translations', 'review'] as const;
export type StepId = (typeof STEPS)[number];

/** Limits from the backend DTOs (EventInput, EventTranslationInput, TicketTypeInput). */
export const LIMITS = {
	title: { min: 3, max: 100 },
	description: { min: 5, max: 2000 },
	ticketName: { min: 2, max: 60 },
	maxImages: 8,
	imageBytes: 5 * 1024 * 1024,
	imageTypes: ['image/png', 'image/jpeg'] as const,
	defaultMaxPerOrder: 6,
};

export const emptyValues = (): FormValues => ({
	title: '',
	category: '',
	description: '',
	images: [],
	venueId: '',
	seatingType: 'GENERAL',
	startDate: '',
	startTime: '',
	endDate: '',
	endTime: '',
	multiDay: false,
	saleStartDate: '',
	saleStartTime: '',
	saleEndDate: '',
	saleEndTime: '',
	refundType: 'REFUNDABLE',
	refundDays: String(DEFAULT_REFUND_DAYS),
	translations: { KO: { title: '', description: '' }, RU: { title: '', description: '' }, UZ: { title: '', description: '' } },
});

export function valuesFromEvent(event: OrgEvent, venue?: OrgVenue | null): FormValues {
	const zone = (venue ?? event.venueData)?.venueTimezone;
	const start = isoToZoned(event.startAt, zone);
	const end = isoToZoned(event.endAt, zone);
	const saleStart = isoToZoned(event.saleStartAt, zone);
	const saleEnd = isoToZoned(event.saleEndAt, zone);
	const values = emptyValues();
	const policy = readRefundPolicy(event);
	TRANSLATED_LOCALES.forEach((locale) => {
		const entry = event.eventTranslations?.find((item) => item.locale === locale);
		values.translations[locale] = { title: entry?.title ?? '', description: entry?.description ?? '' };
	});
	return {
		...values,
		title: event.eventTitle ?? '',
		category: event.eventCategory,
		description: event.eventDesc ?? '',
		images: event.eventImages ?? [],
		venueId: event.venueId ?? '',
		seatingType: event.seatingType ?? 'GENERAL',
		startDate: start.date,
		startTime: start.time,
		endDate: end.date,
		endTime: end.time,
		multiDay: endsOnOtherDay({ startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time }),
		saleStartDate: saleStart.date,
		saleStartTime: saleStart.time,
		saleEndDate: saleEnd.date,
		saleEndTime: saleEnd.time,
		refundType: policy.policyType,
		refundDays: policy.policyType === 'REFUNDABLE' ? String(policy.daysBefore) : String(DEFAULT_REFUND_DAYS),
	};
}

export const rowFromTicketType = (tt: OrgTicketType): TicketRow => ({
	key: tt._id,
	id: tt._id,
	tierKey: tt.tierKey ?? '',
	name: tt.ticketTypeName,
	price: String(tt.ticketPrice),
	quantity: String(tt.totalQuantity),
	maxPerOrder: String(tt.maxPerOrder),
	status: tt.ticketTypeStatus,
	sold: tt.soldQuantity,
});

let counter = 0;
export const newRow = (patch: Partial<TicketRow> = {}): TicketRow => ({
	key: `new-${Date.now()}-${counter++}`,
	tierKey: '',
	name: '',
	price: '',
	quantity: '',
	maxPerOrder: String(LIMITS.defaultMaxPerOrder),
	status: 'ACTIVE',
	sold: 0,
	...patch,
});

/** The price tiers of a venue layout: one per tier key of the SEATED sections, with the seats they add up to. */
export interface Tier {
	tierKey: string;
	sections: string[];
	seats: number;
}
export function tiersOfVenue(venue?: OrgVenue | null): Tier[] {
	const tiers = new Map<string, Tier>();
	for (const section of venue?.venueLayout?.sections ?? []) {
		if (section.kind !== 'SEATED' || !section.tierKey) continue;
		const tier = tiers.get(section.tierKey) ?? { tierKey: section.tierKey, sections: [], seats: 0 };
		tier.sections.push(section.name);
		tier.seats += section.rows * section.seatsPerRow;
		tiers.set(section.tierKey, tier);
	}
	return Array.from(tiers.values());
}

/**
 * Default name of a tier row: the section's own name when the tier is one section, otherwise the tier key as a short label
 * (a tier of many table sections must not become a 200 character list). The organizer can edit it.
 */
export function defaultTierName(tier: { tierKey: string; sections: string[] }): string {
	const name = tier.sections.length === 1 ? tier.sections[0] : tier.tierKey.replace(/[-_]+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());
	return (name || tier.sections[0] || '').slice(0, LIMITS.ticketName.max);
}

/** A venue can host a RESERVED event only with at least one SEATED section (backend DECISIONS #41). */
export const venueSupportsReserved = (venue?: OrgVenue | null) => tiersOfVenue(venue).length > 0;

/**
 * RESERVED events have one ticket type per tier of the layout, and the quantity is the seat count.
 * Rows already saved keep their data; missing tiers get an empty row. GENERAL rows are left as the organizer made them.
 */
export function rowsForSeating(rows: TicketRow[], seatingType: 'GENERAL' | 'RESERVED', venue?: OrgVenue | null): TicketRow[] {
	if (seatingType !== 'RESERVED') return rows;
	const tiers = tiersOfVenue(venue);
	const byTier = new Map(rows.filter((row) => row.tierKey).map((row) => [row.tierKey, row]));
	const result = tiers.map((tier) => {
		const row = byTier.get(tier.tierKey) ?? newRow({ tierKey: tier.tierKey, name: defaultTierName(tier) });
		return { ...row, seatCount: tier.seats, quantity: String(tier.seats) };
	});
	// saved rows whose tier is no longer in the layout stay visible so nothing silently disappears
	const known = new Set(tiers.map((tier) => tier.tierKey));
	return [...result, ...rows.filter((row) => row.id && !known.has(row.tierKey))];
}

export type FieldErrors = Record<string, string>;

const len = (value: string) => value.trim().length;
const isWholeNumber = (value: string) => /^\d+$/.test(value.trim());

const isoOf = (date: string, time: string, venue?: OrgVenue | null) => zonedToIso(date, time, venue?.venueTimezone);

export function validateDetails(values: FormValues): FieldErrors {
	const errors: FieldErrors = {};
	const title = len(values.title);
	if (title < LIMITS.title.min || title > LIMITS.title.max) errors.title = 'title';
	if (!values.category) errors.category = 'category';
	const description = len(values.description);
	if (description > 0 && (description < LIMITS.description.min || description > LIMITS.description.max)) errors.description = 'description';
	return errors;
}

export function validateImages(values: FormValues): FieldErrors {
	return values.images.length > LIMITS.maxImages ? { images: 'tooMany' } : {};
}

export function validateVenue(values: FormValues, venue?: OrgVenue | null, savedStartAt?: string | null): FieldErrors {
	const errors: FieldErrors = {};
	if (!values.venueId || !venue) errors.venueId = 'venue';
	if (values.seatingType === 'RESERVED' && venue && !venueSupportsReserved(venue)) errors.seatingType = 'noLayout';
	const start = values.startDate && values.startTime ? isoOf(values.startDate, values.startTime, venue) : null;
	const end = values.endDate && values.endTime ? isoOf(values.endDate, values.endTime, venue) : null;
	if (!start) errors.start = 'startRequired';
	if (!end) errors.end = 'endRequired';
	return { ...errors, ...dateOrderErrors(values, venue, savedStartAt) };
}

/** Start in the future, end after start. Only what is filled in is judged. The server refuses an end before the start and, at submit, dates in the past. */
export function dateOrderErrors(values: FormValues, venue?: OrgVenue | null, savedStartAt?: string | null, now = Date.now()): FieldErrors {
	const errors: FieldErrors = {};
	const start = values.startDate && values.startTime ? isoOf(values.startDate, values.startTime, venue) : null;
	const end = values.endDate && values.endTime ? isoOf(values.endDate, values.endTime, venue) : null;
	// An event that already started (or ended) can still be edited: the start is only checked for a draft or a show that has not begun
	const started = Boolean(savedStartAt && new Date(savedStartAt).getTime() <= now);
	if (start && !started && new Date(start).getTime() <= now) errors.start = 'startInPast';
	if (values.multiDay) {
		// Same daily hours on every day: the last day is not before the first, and the end time is after the start time (no overnight)
		if (values.endDate && values.startDate && values.endDate < values.startDate) errors.endDate = 'lastDayBeforeFirst';
		if (values.startTime && values.endTime && values.endTime <= values.startTime) errors.endTime = 'dailyEndBeforeStart';
	} else if (start && end && new Date(end).getTime() <= new Date(start).getTime()) errors.end = 'endBeforeStart';
	return errors;
}

/** "2026-12-12" + 1 -> "2026-12-13" (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!m) return '';
	const next = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
	return next.toISOString().slice(0, 10);
}

/** "19:30" + 2 hours -> "21:30"; wraps past midnight ("23:00" -> "01:00"). */
export function addHours(time: string, hours: number): string {
	const m = /^(\d{2}):(\d{2})$/.exec(time);
	if (!m) return '';
	const total = (Number(m[1]) + hours + 24 * 10) % 24;
	return `${String(total).padStart(2, '0')}:${m[2]}`;
}

/**
 * With the End date hidden the end is on the start date, or on the next day when the end time is earlier than the start time.
 * Returns the end date to use, or '' when there is nothing to base it on.
 */
export function impliedEndDate(startDate: string, startTime: string, endTime: string): string {
	if (!startDate) return '';
	return startTime && endTime && endTime < startTime ? addDays(startDate, 1) : startDate;
}

/** A saved event shows the End date field when it spans more than one night: an overnight show (ends the next day, earlier in the day) stays hidden. */
export function endsOnOtherDay(values: Pick<FormValues, 'startDate' | 'startTime' | 'endDate' | 'endTime'>): boolean {
	if (!values.endDate || !values.startDate || values.endDate === values.startDate) return false;
	return values.endDate !== impliedEndDate(values.startDate, values.startTime, values.endTime);
}

/**
 * Sale window rules (backend assertValidSaleWindow): start before end, end no later than the event end, start before the event end.
 * Empty fields mean "from approval until the event", so only what is filled in is judged.
 */
export function validateSaleWindow(values: FormValues, venue?: OrgVenue | null): FieldErrors {
	const errors: FieldErrors = {};
	const hasStart = Boolean(values.saleStartDate || values.saleStartTime);
	const hasEnd = Boolean(values.saleEndDate || values.saleEndTime);
	const start = hasStart ? isoOf(values.saleStartDate, values.saleStartTime, venue) : null;
	const end = hasEnd ? isoOf(values.saleEndDate, values.saleEndTime, venue) : null;
	const eventEnd = values.endDate && values.endTime ? isoOf(values.endDate, values.endTime, venue) : null;
	const ms = (iso: string) => new Date(iso).getTime();
	if (hasStart && !start) errors.saleStart = 'incomplete';
	if (hasEnd && !end) errors.saleEnd = 'incomplete';
	if (start && eventEnd && ms(start) >= ms(eventEnd)) errors.saleStart = 'saleStartAfterEventEnd';
	if (end && eventEnd && ms(end) > ms(eventEnd)) errors.saleEnd = 'saleEndAfterEventEnd';
	else if (start && end && ms(end) <= ms(start)) errors.saleEnd = 'saleEndBeforeStart';
	return errors;
}

/** True when a filled-in sale window breaks a rule that depends on the event dates (used for the notice after a date change). */
export function saleWindowConflicts(values: FormValues, venue?: OrgVenue | null): boolean {
	const errors = validateSaleWindow(values, venue);
	return errors.saleStart === 'saleStartAfterEventEnd' || errors.saleEnd === 'saleEndAfterEventEnd';
}

/** Errors per ticket row, keyed `<row key>.<field>`. */
export function validateTickets(rows: TicketRow[], seatingType: 'GENERAL' | 'RESERVED'): FieldErrors {
	const errors: FieldErrors = {};
	for (const row of rows) {
		const name = len(row.name);
		if (name < LIMITS.ticketName.min || name > LIMITS.ticketName.max) errors[`${row.key}.name`] = 'ticketName';
		if (!isWholeNumber(row.price)) errors[`${row.key}.price`] = 'ticketPrice';
		const max = Number(row.maxPerOrder);
		if (!isWholeNumber(row.maxPerOrder) || max < 1) errors[`${row.key}.maxPerOrder`] = 'ticketMax';
		if (seatingType === 'GENERAL') {
			const quantity = Number(row.quantity);
			if (!isWholeNumber(row.quantity) || quantity < 1) errors[`${row.key}.quantity`] = 'ticketQuantity';
			else if (quantity < row.sold) errors[`${row.key}.quantity`] = 'belowSold';
		}
	}
	return errors;
}

/** A refundable event needs a whole number of days from 1 to 30 (backend `getRefundPolicyError`). */
export function validateRefund(values: FormValues): FieldErrors {
	if (values.refundType !== 'REFUNDABLE') return {};
	const days = Number(values.refundDays);
	return values.refundDays.trim() !== '' && Number.isInteger(days) && days >= 1 && days <= MAX_REFUND_DAYS ? {} : { refundDays: 'refundDays' };
}

/** The policy as the API takes it, or null while the days are not valid (the server then keeps the stored policy). */
export function refundPolicyInput(values: FormValues) {
	if (values.refundType === 'NON_REFUNDABLE') return { policyType: 'NON_REFUNDABLE' as const };
	if (Object.keys(validateRefund(values)).length) return null;
	return { policyType: 'REFUNDABLE' as const, daysBefore: Number(values.refundDays) };
}

/** Translations: a language is filled in when it has any text; then the title is required and both fields follow the DTO limits. */
export function validateTranslations(values: FormValues): FieldErrors {
	const errors: FieldErrors = {};
	for (const locale of TRANSLATED_LOCALES) {
		const { title, description } = values.translations[locale];
		if (!title.trim() && !description.trim()) continue;
		const t = len(title);
		if (t < LIMITS.title.min || t > LIMITS.title.max) errors[`${locale}.title`] = 'title';
		const d = len(description);
		if (d > 0 && (d < LIMITS.description.min || d > LIMITS.description.max)) errors[`${locale}.description`] = 'description';
	}
	return errors;
}

/** Which step each error belongs to, for the "go to the first problem" jump. */
export function stepOfError(field: string): StepId {
	if (field === 'title' || field === 'category' || field === 'description') return 'details';
	if (field === 'images') return 'images';
	if (['venueId', 'seatingType', 'start', 'end', 'endDate', 'endTime'].includes(field)) return 'venue';
	if (field === 'refundDays') return 'tickets';
	if (field.startsWith('sale') || field.includes('.')) return /^(KO|RU|UZ)\./.test(field) ? 'translations' : 'tickets';
	return 'details';
}

export function allErrors(values: FormValues, rows: TicketRow[], venue?: OrgVenue | null, savedStartAt?: string | null): FieldErrors {
	return {
		...validateDetails(values),
		...validateImages(values),
		...validateVenue(values, venue, savedStartAt),
		...validateSaleWindow(values, venue),
		...validateRefund(values),
		...validateTickets(rows, values.seatingType),
		...validateTranslations(values),
	};
}

/** The fields the server needs to create the first draft: name, category, venue and the two dates. */
export function canCreateDraft(values: FormValues, venue?: OrgVenue | null, savedStartAt?: string | null): boolean {
	return Object.keys({ ...validateDetails(values), ...validateVenue(values, venue, savedStartAt), ...validateImages(values) }).filter((key) => key !== 'description' || values.description.trim()).length === 0;
}

const optionalText = (value: string) => (value.trim() ? value.trim() : null);

/** `updateEvent` content. `null` clears an optional field; translations that are empty are left out. */
export function toUpdateInput(id: string, values: FormValues, venue?: OrgVenue | null, mode: EditMode = 'full') {
	const translations = TRANSLATED_LOCALES.filter((locale) => values.translations[locale].title.trim()).map((locale) => ({
		locale,
		title: values.translations[locale].title.trim(),
		...(values.translations[locale].description.trim() ? { description: values.translations[locale].description.trim() } : {}),
	}));
	const input: Record<string, unknown> = {
		_id: id,
		eventCategory: values.category,
		eventTitle: values.title.trim(),
		eventDesc: optionalText(values.description),
		eventImages: values.images,
		eventTranslations: translations,
		startAt: isoOf(values.startDate, values.startTime, venue),
		endAt: isoOf(values.endDate, values.endTime, venue),
		saleStartAt: values.saleStartDate && values.saleStartTime ? isoOf(values.saleStartDate, values.saleStartTime, venue) : null,
		saleEndAt: values.saleEndDate && values.saleEndTime ? isoOf(values.saleEndDate, values.saleEndTime, venue) : null,
	};
	const refundPolicy = refundPolicyInput(values);
	if (refundPolicy) input.refundPolicy = refundPolicy;
	// Venue and seating type are not sent once orders can exist (an APPROVED event): see DECISIONS F98
	if (mode === 'full') {
		input.venueId = values.venueId;
		input.seatingType = values.seatingType;
	}
	return input;
}

export function toCreateInput(values: FormValues, venue?: OrgVenue | null) {
	const { _id, ...rest } = toUpdateInput('', values, venue, 'full');
	void _id;
	// createEvent has no `null` handling: leave empty optionals out
	const input: Record<string, unknown> = { ...rest };
	for (const key of ['eventDesc', 'saleStartAt', 'saleEndAt']) if (input[key] === null) delete input[key];
	return input;
}

export function toTicketInput(row: TicketRow, eventId: string, seatingType: 'GENERAL' | 'RESERVED') {
	const common = {
		ticketTypeName: row.name.trim(),
		ticketPrice: Number(row.price),
		maxPerOrder: Number(row.maxPerOrder),
	};
	if (row.id) {
		// `totalQuantity` is refused for RESERVED events; the tier key is locked once seats exist, so it is not resent
		return { _id: row.id, ...common, ticketTypeStatus: row.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE', ...(seatingType === 'GENERAL' ? { totalQuantity: Number(row.quantity) } : {}) };
	}
	return {
		eventId,
		...common,
		ticketCurrency: 'KRW',
		...(seatingType === 'RESERVED' ? { tierKey: row.tierKey } : { totalQuantity: Number(row.quantity) }),
	};
}

/** What `submitEventForApproval` checks, in the server's order (backend getEventSubmitError). */
export type CheckId = 'title' | 'image' | 'dates' | 'venue' | 'ticketType' | 'layout' | 'tiers';
export interface Check {
	id: CheckId;
	ok: boolean;
}
export function submitChecks(values: FormValues, rows: TicketRow[], venue?: OrgVenue | null, now = Date.now()): Check[] {
	const start = isoOf(values.startDate, values.startTime, venue);
	const end = isoOf(values.endDate, values.endTime, venue);
	const checks: Check[] = [
		{ id: 'title', ok: len(values.title) >= LIMITS.title.min },
		{ id: 'image', ok: values.images.length >= 1 },
		{ id: 'dates', ok: Boolean(start && end && new Date(start).getTime() > now && new Date(end).getTime() > now) },
		{ id: 'venue', ok: Boolean(venue && (venue.venueStatus ?? 'ACTIVE') === 'ACTIVE') },
		{ id: 'ticketType', ok: rows.length >= 1 },
	];
	if (values.seatingType === 'RESERVED') {
		const tiers = tiersOfVenue(venue);
		checks.push({ id: 'layout', ok: tiers.length > 0 });
		checks.push({ id: 'tiers', ok: tiers.length > 0 && tiers.every((tier) => rows.some((row) => row.tierKey === tier.tierKey)) });
	}
	return checks;
}

export const snapshot = (values: FormValues, rows: TicketRow[]) =>
	JSON.stringify({ values, rows: rows.map(({ key, ...row }) => row) });
