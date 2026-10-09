import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme, ThemeMode } from '../../scss/MaterialTheme';

export const THEME_STORAGE_KEY = 'ticketzy-theme';

/** Browser bar colours (same values as the --bg tokens). */
const THEME_COLORS: Record<ThemeMode, string> = { dark: '#0a0b0d', light: '#f6f6f3' };

interface ThemeModeValue {
	mode: ThemeMode;
	toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeValue>({ mode: 'dark', toggleMode: () => undefined });

export const useThemeMode = () => useContext(ThemeModeContext);

/** data-theme is set before paint by the inline script in _document; this keeps React and storage in step. */
export const ThemeModeProvider = ({ children }: { children: React.ReactNode }) => {
	const [mode, setMode] = useState<ThemeMode>('dark');

	useEffect(() => {
		const current = document.documentElement.getAttribute('data-theme');
		if (current === 'light' || current === 'dark') setMode(current);
	}, []);

	const toggleMode = useCallback(() => {
		setMode((prev) => {
			const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
			document.documentElement.setAttribute('data-theme', next);
			try {
				localStorage.setItem(THEME_STORAGE_KEY, next);
			} catch {
				// storage can be blocked; the choice then lasts for this visit only
			}
			return next;
		});
	}, []);

	useEffect(() => {
		document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', THEME_COLORS[mode]));
	}, [mode]);

	const theme = useMemo(() => getTheme(mode), [mode]);
	const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

	return (
		<ThemeModeContext.Provider value={value}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				{children}
			</ThemeProvider>
		</ThemeModeContext.Provider>
	);
};
