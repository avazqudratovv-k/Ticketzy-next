import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Prohibit, WarningCircle } from 'phosphor-react';
import { ApolloError } from '@apollo/client';
import StateBlock from '../states/StateBlock';
import { NETWORK_ERROR, parseApiError } from '../../errors';

/** Network failures offer a retry; anything else is "not found or not yours" with a way back. */
const LoadError = ({
	error,
	onRetry,
	notFoundTitle,
	notFoundText,
	back,
}: {
	error: ApolloError;
	onRetry: () => void;
	notFoundTitle: string;
	notFoundText: string;
	back?: React.ReactNode;
}) => {
	const { t } = useTranslation('account');
	const network = parseApiError(error).code === NETWORK_ERROR;
	return (
		<StateBlock
			alert={network}
			icon={network ? <WarningCircle size={28} /> : <Prohibit size={28} />}
			title={network ? t('state.loadError') : notFoundTitle}
			text={network ? t('state.network') : notFoundText}
			actions={
				network ? (
					<Button variant="outlined" onClick={onRetry}>
						{t('state.retry')}
					</Button>
				) : (
					back
				)
			}
		/>
	);
};

export default LoadError;
