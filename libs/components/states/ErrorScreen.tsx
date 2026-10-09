import React from 'react';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ArrowClockwise, Compass, WarningOctagon } from 'phosphor-react';
import { ROUTES } from '../../routes';

interface Props {
	kind: 'notFound' | 'server';
	/** Offered on the server error and on the error boundary. */
	onRetry?: () => void;
}

/** Full-page error: 404, 500 and the error boundary. Always offers a way home and to the events. */
const ErrorScreen = ({ kind, onRetry }: Props) => {
	const { t } = useTranslation('common');
	const notFound = kind === 'notFound';
	return (
		<div className="tz-container err">
			<div className="err__art" aria-hidden="true">
				{notFound ? <Compass size={40} /> : <WarningOctagon size={40} />}
			</div>
			<p className="err__code" aria-hidden="true">
				{notFound ? '404' : '500'}
			</p>
			<h1 className="err__title">{notFound ? t('notFound.title') : t('errors.serverTitle')}</h1>
			<p className="err__text">{notFound ? t('notFound.text') : t('errors.serverText')}</p>
			<div className="err__actions">
				{!notFound && (
					<Button variant="contained" startIcon={<ArrowClockwise size={18} aria-hidden="true" />} onClick={onRetry ?? (() => window.location.reload())}>
						{t('errors.retry')}
					</Button>
				)}
				<Button component={Link} href={ROUTES.home} variant={notFound ? 'contained' : 'outlined'}>
					{t('notFound.back')}
				</Button>
				<Button component={Link} href={ROUTES.events} variant="outlined">
					{t('errors.browseEvents')}
				</Button>
			</div>
		</div>
	);
};

export default ErrorScreen;
