import { WarningCircle } from 'phosphor-react';
import { useTranslation } from 'next-i18next';
import { ApiError, knownMessageKey, NETWORK_ERROR } from '../../errors';

/** Text for a failed call: a translation for the server messages we know, the server's own message otherwise. */
export const useErrorText = () => {
	const { t } = useTranslation('auth');
	return (error: ApiError): string => {
		const key = knownMessageKey(error);
		if (key) return t(key);
		if (error.code === NETWORK_ERROR) return t('errors.network');
		return error.message || t('errors.generic');
	};
};

/** Inline error block at the top of a form (design: LoginError). */
const AuthError = ({ error }: { error: ApiError | null }) => {
	const errorText = useErrorText();
	if (!error) return null;
	return (
		<div className="tz-alert tz-alert--danger" role="alert" data-code={error.code}>
			<span className="tz-alert__icon">
				<WarningCircle size={18} weight="fill" aria-hidden="true" />
			</span>
			<span className="tz-alert__title">{errorText(error)}</span>
		</div>
	);
};

export default AuthError;
