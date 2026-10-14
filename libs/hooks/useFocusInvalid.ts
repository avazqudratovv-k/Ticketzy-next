import { RefObject, useCallback, useEffect, useState } from 'react';

/**
 * Focus goes to the first invalid control of a form (document order) after a failed submit, client check or server answer.
 * Call the returned function in the submit handler next to the `setState` that sets the errors: the effect runs after
 * that render, when `aria-invalid="true"` is on the controls.
 */
export default function useFocusInvalid(form: RefObject<HTMLElement>) {
	const [request, setRequest] = useState(0);
	useEffect(() => {
		if (request === 0) return;
		form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
	}, [request, form]);
	return useCallback(() => setRequest((n) => n + 1), []);
}
