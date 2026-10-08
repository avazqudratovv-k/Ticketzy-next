const TOKEN_KEY = 'accessToken';

export function getJwtToken(): string {
	if (typeof window === 'undefined') return '';
	try {
		return localStorage.getItem(TOKEN_KEY) ?? '';
	} catch {
		return '';
	}
}

export function setJwtToken(token: string) {
	localStorage.setItem(TOKEN_KEY, token);
}

export function removeJwtToken() {
	try {
		localStorage.removeItem(TOKEN_KEY);
	} catch {
		// nothing stored, nothing to remove
	}
}

export const TOKEN_STORAGE_KEY = TOKEN_KEY;
