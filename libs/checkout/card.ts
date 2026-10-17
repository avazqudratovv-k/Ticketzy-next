/**
 * Checks for the demo card form (F366). Pure functions, no I/O: the values are typed by the buyer and checked in the browser,
 * and never sent anywhere (the payment call carries only the order id and the success or failure choice).
 */

export type CardField = 'number' | 'name' | 'expiry' | 'cvc';
/** `required`: empty. `invalid`: wrong shape or failed the Luhn check. `expired`: the expiry month has passed. */
export type CardRule = 'required' | 'invalid' | 'expired';
export type CardIssues = Partial<Record<CardField, CardRule>>;
export interface CardValues {
	number: string;
	name: string;
	expiry: string;
	cvc: string;
}

export const EMPTY_CARD: CardValues = { number: '', name: '', expiry: '', cvc: '' };
export const CARD_FIELDS: readonly CardField[] = ['number', 'name', 'expiry', 'cvc'];

const MAX_DIGITS = 19;
const MAX_YEARS_AHEAD = 20;

const digitsOf = (value: string) => value.replace(/\D/g, '');

/** "4242424242424242" or "4242 4242-4242" shown as "4242 4242 4242 4242" (groups of 4, at most 19 digits). */
export const formatCardNumber = (raw: string): string => (digitsOf(raw).slice(0, MAX_DIGITS).match(/.{1,4}/g) ?? []).join(' ');

/**
 * Digits become "MM/YY". A first digit of 2 to 9 is a month with a leading zero ("5" gives "05/"); the slash appears once the month
 * is complete. While deleting the slash is not put back, so Backspace can pass it.
 */
export function formatExpiry(raw: string, deleting = false): string {
	let digits = digitsOf(raw).slice(0, 4);
	if (digits.length === 1 && digits > '1') digits = `0${digits}`;
	if (digits.length < 2) return digits;
	if (digits.length === 2) return deleting ? digits : `${digits}/`;
	return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export const formatCvc = (raw: string): string => digitsOf(raw).slice(0, 4);

/** Luhn check of a digits-only string. */
export function passesLuhn(digits: string): boolean {
	let sum = 0;
	let double = false;
	for (let index = digits.length - 1; index >= 0; index--) {
		let digit = digits.charCodeAt(index) - 48;
		if (double) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
		double = !double;
	}
	return digits.length > 0 && sum % 10 === 0;
}

export function checkNumber(value: string): CardRule | null {
	if (!value.trim()) return 'required';
	// spaces are allowed; anything else that is not a digit is not
	if (/[^\d\s]/.test(value)) return 'invalid';
	const digits = digitsOf(value);
	return digits.length >= 13 && digits.length <= MAX_DIGITS && passesLuhn(digits) ? null : 'invalid';
}

export function checkName(value: string): CardRule | null {
	return value.trim() ? null : 'required';
}

/** MM/YY. The card is good through the end of its month, so the current month still passes. */
export function checkExpiry(value: string, now: Date = new Date()): CardRule | null {
	if (!value.trim()) return 'required';
	const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
	if (!match) return 'invalid';
	const month = Number(match[1]);
	const year = 2000 + Number(match[2]);
	if (month < 1 || month > 12) return 'invalid';
	const current = now.getFullYear() * 12 + now.getMonth();
	const given = year * 12 + (month - 1);
	if (given < current) return 'expired';
	return given > current + MAX_YEARS_AHEAD * 12 ? 'invalid' : null;
}

export function checkCvc(value: string): CardRule | null {
	if (!value) return 'required';
	return /^\d{3,4}$/.test(value) ? null : 'invalid';
}

export function validateCard(values: CardValues, now: Date = new Date()): CardIssues {
	const found: CardIssues = {};
	const set = (field: CardField, rule: CardRule | null) => {
		if (rule) found[field] = rule;
	};
	set('number', checkNumber(values.number));
	set('name', checkName(values.name));
	set('expiry', checkExpiry(values.expiry, now));
	set('cvc', checkCvc(values.cvc));
	return found;
}

export function validateField(field: CardField, values: CardValues, now: Date = new Date()): CardRule | null {
	switch (field) {
		case 'number':
			return checkNumber(values.number);
		case 'name':
			return checkName(values.name);
		case 'expiry':
			return checkExpiry(values.expiry, now);
		default:
			return checkCvc(values.cvc);
	}
}
