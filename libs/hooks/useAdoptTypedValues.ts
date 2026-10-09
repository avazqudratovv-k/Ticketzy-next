import { RefObject, useEffect, useState } from 'react';

/**
 * Text typed into server-rendered inputs before React hydrates stays in the DOM, but the controlled state is still
 * empty, so the first submit sees empty fields ("required") and the user has to type again. After hydration this
 * copies those values into state. Only non-empty DOM values are taken, and only once.
 *
 * Returns false until then. Submitting before hydration is a native form post (nothing handles it yet: the page just
 * reloads and the fields are empty), so the submit button stays disabled for that moment, which also stops Enter.
 */
export default function useAdoptTypedValues(
	form: RefObject<HTMLFormElement>,
	setters: Record<string, (value: string) => void>,
): boolean {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const elements = form.current?.elements;
		if (!elements) return;
		for (const [name, set] of Object.entries(setters)) {
			const input = elements.namedItem(name);
			if (input instanceof HTMLInputElement && input.value) set(input.value);
		}
		setReady(true);
		// once, right after hydration
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return ready;
}
