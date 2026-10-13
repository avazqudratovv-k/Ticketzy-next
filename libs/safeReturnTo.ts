const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f-\u009f\\]/;
const MAX_LENGTH = 2048;
const MAX_DECODES = 3;
const ORIGIN = 'http://same-site.invalid';

/**
 * Only same-site paths are accepted as returnTo, so a crafted link cannot send the member elsewhere.
 * The value must be a single-slash path and stay one in every decoded form (the URL parser drops tab, CR and LF, so
 * `/<TAB>/evil.com` would become `//evil.com`; `%09`, `%0a`, `%5c` and double-encoded forms are checked the same way).
 * Any control character or backslash rejects the value. Kept free of imports so scripts/check-return-to.js can run it.
 */
export const safeReturnTo = (value: string | string[] | undefined): string | null => {
	const path = Array.isArray(value) ? value[0] : value;
	if (typeof path !== 'string' || path.length === 0 || path.length > MAX_LENGTH) return null;

	// Check the value and every decoded form of it (up to three layers); more layers than that are not a real link.
	let form = path;
	for (let layer = 0; ; layer += 1) {
		if (CONTROL_OR_BACKSLASH.test(form) || !form.startsWith('/') || form.startsWith('//')) return null;
		let next: string;
		try {
			next = decodeURIComponent(form);
		} catch {
			break; // a lone % cannot be decoded by the browser either
		}
		if (next === form) break;
		if (layer === MAX_DECODES) return null;
		form = next;
	}

	try {
		const url = new URL(path, ORIGIN);
		if (url.origin !== ORIGIN || url.pathname.startsWith('//')) return null;
	} catch {
		return null;
	}
	return path;
};
