import { cloneElement, isValidElement, ReactElement, ReactNode, useId } from 'react';
import { useTranslation } from 'next-i18next';
import { WarningCircle } from 'phosphor-react';

/** Label above the control, hint or error below (design: Input). The control gets the ids it needs. */
export const FormField = ({
	label,
	hint,
	error,
	required,
	children,
	className,
}: {
	label: ReactNode;
	hint?: ReactNode;
	error?: string;
	required?: boolean;
	children: ReactElement;
	className?: string;
}) => {
	const id = useId();
	const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
	const control = isValidElement(children)
		? cloneElement(children as ReactElement<any>, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })
		: children;
	return (
		<div className={`tz-field ${className ?? ''}`}>
			<label className="tz-field__label" htmlFor={id}>
				{label}
				{required && (
					<span className="org-req" aria-hidden="true">
						{' '}
						*
					</span>
				)}
			</label>
			{control}
			{error ? (
				<span className="tz-field__error" id={`${id}-error`}>
					<WarningCircle size={18} weight="fill" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
					{error}
				</span>
			) : hint ? (
				<span className="tz-field__hint" id={`${id}-hint`}>
					{hint}
				</span>
			) : null}
		</div>
	);
};

/** Turns the code a validator returns into the translated sentence. */
export function useErrorText() {
	const { t } = useTranslation('organizer');
	return (code?: string) => (code ? t(`form.errors.${code}`) : undefined);
}
