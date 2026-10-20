import { createTheme, Theme } from '@mui/material/styles';
import tokens from '../tokens.json';

export type ThemeMode = 'dark' | 'light';

type ColorToken = { name: string; value: { dark: string; light: string } };

/**
 * MUI needs real color values at creation time (it lightens/darkens them), so the palette is read from
 * tokens.json, the same source as tokens.css. Everything that can be a CSS variable is one, so the page
 * follows data-theme without waiting for React.
 */
const colorTokens = tokens.color.tokens as ColorToken[];
const color = (name: string, mode: ThemeMode): string => {
	const token = colorTokens.find((item) => item.name === name);
	if (!token) throw new Error(`Unknown design token: ${name}`);
	return token.value[mode];
};

const control = 'var(--control-md)';

export const getTheme = (mode: ThemeMode): Theme =>
	createTheme({
		palette: {
			mode,
			primary: { main: color('accent', mode), contrastText: color('on-accent', mode) },
			error: { main: color('danger', mode), contrastText: color('on-danger', mode) },
			success: { main: color('success-text', mode) },
			warning: { main: color('warning-text', mode) },
			info: { main: color('info-text', mode) },
			background: { default: color('bg', mode), paper: color('surface', mode) },
			text: {
				primary: color('ink', mode),
				secondary: color('ink-muted', mode),
				disabled: color('ink-subtle', mode),
			},
			divider: color('border', mode),
		},
		shape: { borderRadius: 14 },
		typography: {
			fontFamily: 'var(--font-sans)',
			button: { textTransform: 'none', fontWeight: 600, fontSize: 16, lineHeight: '24px' },
			h1: { font: 'var(--text-h1)', letterSpacing: 'var(--tracking-h1)' },
			h2: { font: 'var(--text-h2)', letterSpacing: 'var(--tracking-h2)' },
			h3: { font: 'var(--text-h3)' },
			h4: { font: 'var(--text-title)' },
			body1: { font: 'var(--text-body)' },
			body2: { font: 'var(--text-body-sm)' },
			caption: { font: 'var(--text-caption)' },
		},
		components: {
			MuiCssBaseline: {
				styleOverrides: {
					html: { height: '100%' },
					body: {
						minHeight: '100%',
						background: 'var(--bg)',
						color: 'var(--ink)',
						font: 'var(--text-body)',
						WebkitFontSmoothing: 'antialiased',
						overflowWrap: 'break-word',
					},
					'#__next': { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
					'a:focus-visible, button:focus-visible, [tabindex]:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible': {
						outline: '2px solid var(--focus)',
						outlineOffset: 2,
					},
				},
			},
			MuiButtonBase: { defaultProps: { disableRipple: true } },
			MuiButton: {
				defaultProps: { disableElevation: true },
				styleOverrides: {
					root: {
						minHeight: control,
						padding: '10px var(--space-5)',
						borderRadius: 'var(--radius-md)',
						font: 'var(--text-label-lg)',
						textTransform: 'none',
						textAlign: 'center',
						transition: 'background-color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)',
						'&:active': { transform: 'scale(.98)' },
						'&.Mui-disabled': {
							background: 'var(--surface-sunken)',
							borderColor: 'var(--border)',
							color: 'var(--ink-subtle)',
						},
					},
					contained: {
						background: 'var(--accent)',
						color: 'var(--on-accent)',
						border: '1px solid var(--accent-edge)',
						'&:hover': { background: 'var(--accent-hover)' },
						'&:active': { background: 'var(--accent-pressed)' },
					},
					outlined: {
						color: 'var(--ink)',
						borderColor: 'var(--border-control)',
						'&:hover': { background: 'var(--surface-raised)', borderColor: 'var(--border-control)' },
					},
					text: {
						color: 'var(--ink)',
						'&:hover': { background: 'var(--surface-raised)' },
					},
					sizeSmall: {
						minHeight: 'var(--control-sm)',
						padding: '7px var(--space-3)',
						font: 'var(--text-label)',
						borderRadius: 'var(--radius-sm)',
					},
					sizeLarge: { minHeight: 'var(--control-lg)', padding: '14px var(--space-6)' },
				},
			},
			MuiIconButton: {
				styleOverrides: {
					root: {
						width: control,
						height: control,
						color: 'var(--ink)',
						'&:hover': { background: 'var(--surface-raised)' },
					},
				},
			},
			MuiOutlinedInput: {
				styleOverrides: {
					root: {
						minHeight: control,
						borderRadius: 'var(--radius-md)',
						background: 'var(--surface)',
						font: 'var(--text-body)',
						'& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-control)' },
						'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ink)' },
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--focus)', borderWidth: 2 },
						'&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--danger-text)' },
						'&.Mui-disabled': { background: 'var(--surface-sunken)' },
					},
					input: {
						padding: '9px var(--space-4)',
						font: 'var(--text-body)',
						'&::placeholder': { color: 'var(--ink-subtle)', opacity: 1 },
						// MUI paints its own blue on autofill; use the field background instead (F376)
						'&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active': {
							WebkitBoxShadow: '0 0 0 100px var(--surface) inset',
							boxShadow: '0 0 0 100px var(--surface) inset',
							WebkitTextFillColor: 'var(--ink)',
							caretColor: 'var(--ink)',
							borderRadius: 'inherit',
						},
					},
				},
			},
			MuiCheckbox: {
				styleOverrides: {
					root: {
						color: 'var(--border-control)',
						'&.Mui-checked': { color: 'var(--accent-text)' },
					},
				},
			},
			MuiPaper: {
				styleOverrides: { root: { backgroundImage: 'none' } },
			},
			MuiMenu: {
				styleOverrides: {
					paper: {
						background: 'var(--surface-raised)',
						border: '1px solid var(--border)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: 'var(--shadow-md)',
						color: 'var(--ink)',
						marginTop: 8,
						minWidth: 200,
					},
					list: { padding: 'var(--space-2)' },
				},
			},
			MuiMenuItem: {
				styleOverrides: {
					root: {
						minHeight: control,
						gap: 'var(--space-3)',
						padding: '10px var(--space-3)',
						borderRadius: 'var(--radius-sm)',
						font: 'var(--text-body)',
						whiteSpace: 'normal',
						'&:hover': { background: 'var(--neutral-soft)' },
						'&.Mui-selected, &.Mui-selected:hover': { background: 'var(--accent-soft)', fontWeight: 600 },
					},
				},
			},
			MuiDrawer: {
				styleOverrides: {
					paper: { background: 'var(--surface)', borderColor: 'var(--border)', backgroundImage: 'none' },
				},
			},
			MuiBackdrop: { styleOverrides: { root: { background: 'var(--scrim)' } } },
			MuiDivider: { styleOverrides: { root: { borderColor: 'var(--border)' } } },
			MuiAvatar: {
				styleOverrides: {
					root: { background: 'var(--neutral-soft)', color: 'var(--ink)', font: 'var(--text-label)' },
				},
			},
			MuiTooltip: {
				styleOverrides: {
					tooltip: {
						background: 'var(--surface-raised)',
						color: 'var(--ink)',
						border: '1px solid var(--border)',
						font: 'var(--text-caption)',
					},
				},
			},
		},
	});
