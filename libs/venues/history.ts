import { useCallback, useReducer } from 'react';
import { Layout } from './model';

export const HISTORY_LIMIT = 100;
const COALESCE_MS = 900;

interface State {
	past: Layout[];
	present: Layout;
	future: Layout[];
	/** The layout before a drag or another gesture that is still going on (it becomes one undo step when it ends) */
	base: Layout | null;
	lastKey: string | null;
	lastAt: number;
	/** Bumped when the history is replaced (load, save), so the editor can tell a reset from an edit */
	epoch: number;
}

type Action =
	| { type: 'set'; layout: Layout; key?: string; now: number }
	| { type: 'preview'; layout: Layout }
	| { type: 'commit' }
	| { type: 'undo' }
	| { type: 'redo' }
	| { type: 'reset'; layout: Layout };

const push = (past: Layout[], layout: Layout) => [...past, layout].slice(-HISTORY_LIMIT);

function reduce(state: State, action: Action): State {
	switch (action.type) {
		case 'set': {
			if (action.layout === state.present) return state;
			const merge = action.key && action.key === state.lastKey && action.now - state.lastAt < COALESCE_MS && !state.base;
			return {
				...state,
				past: merge ? state.past : push(state.past, state.base ?? state.present),
				present: action.layout,
				future: [],
				base: null,
				lastKey: action.key ?? null,
				lastAt: action.now,
			};
		}
		case 'preview':
			return { ...state, base: state.base ?? state.present, present: action.layout, lastKey: null };
		case 'commit':
			if (!state.base) return state;
			return { ...state, past: state.base === state.present ? state.past : push(state.past, state.base), future: [], base: null, lastKey: null };
		case 'undo': {
			// A gesture in progress is dropped first
			if (state.base) return { ...state, present: state.base, base: null, lastKey: null };
			const previous = state.past[state.past.length - 1];
			if (!previous) return state;
			return { ...state, past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future], lastKey: null };
		}
		case 'redo': {
			const next = state.future[0];
			if (!next) return state;
			return { ...state, past: push(state.past, state.present), present: next, future: state.future.slice(1), lastKey: null };
		}
		case 'reset':
			return { past: [], present: action.layout, future: [], base: null, lastKey: null, lastAt: 0, epoch: state.epoch + 1 };
	}
}

/** Undo and redo of the layout (the last 100 steps). `set` records a step, `preview` + `commit` make one step of a drag. */
export default function useLayoutHistory(initial: Layout) {
	const [state, dispatch] = useReducer(reduce, { past: [], present: initial, future: [], base: null, lastKey: null, lastAt: 0, epoch: 0 });
	const set = useCallback((layout: Layout, key?: string) => dispatch({ type: 'set', layout, key, now: Date.now() }), []);
	const preview = useCallback((layout: Layout) => dispatch({ type: 'preview', layout }), []);
	const commit = useCallback(() => dispatch({ type: 'commit' }), []);
	const undo = useCallback(() => dispatch({ type: 'undo' }), []);
	const redo = useCallback(() => dispatch({ type: 'redo' }), []);
	const reset = useCallback((layout: Layout) => dispatch({ type: 'reset', layout }), []);
	return {
		layout: state.present,
		set,
		preview,
		commit,
		undo,
		redo,
		reset,
		canUndo: state.past.length > 0 || state.base !== null,
		canRedo: state.future.length > 0,
		steps: state.past.length,
		epoch: state.epoch,
	};
}
