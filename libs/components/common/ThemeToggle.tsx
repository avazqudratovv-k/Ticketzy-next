import { IconButton, Tooltip } from '@mui/material';
import { Moon, Sun } from 'phosphor-react';
import { useTranslation } from 'next-i18next';
import { useThemeMode } from '../../theme/ThemeModeProvider';

const ThemeToggle = () => {
	const { t } = useTranslation('common');
	const { mode, toggleMode } = useThemeMode();
	const label = mode === 'dark' ? t('header.themeToLight') : t('header.themeToDark');

	return (
		<Tooltip title={label}>
			<IconButton onClick={toggleMode} aria-label={label}>
				{mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
			</IconButton>
		</Tooltip>
	);
};

export default ThemeToggle;
