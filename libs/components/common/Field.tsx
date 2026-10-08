import React, { useId, useState } from 'react';
import { IconButton, InputAdornment, OutlinedInput } from '@mui/material';
import { Eye, EyeSlash, WarningCircle } from 'phosphor-react';
import { useTranslation } from 'next-i18next';

interface FieldProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: 'text' | 'email' | 'password';
	name?: string;
	placeholder?: string;
	hint?: string;
	error?: string;
	autoComplete?: string;
	required?: boolean;
	disabled?: boolean;
	autoFocus?: boolean;
}

/** Label above the control, hint or error below (design: Input). Controls are 16px so iOS does not zoom. */
const Field = ({
	label,
	value,
	onChange,
	type = 'text',
	name,
	placeholder,
	hint,
	error,
	autoComplete,
	required,
	disabled,
	autoFocus,
}: FieldProps) => {
	const { t } = useTranslation('auth');
	const id = useId();
	const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
	const [shown, setShown] = useState(false);
	const isPassword = type === 'password';

	return (
		<div className="tz-field">
			<label className="tz-field__label" htmlFor={id}>
				{label}
			</label>
			<OutlinedInput
				id={id}
				name={name}
				type={isPassword && shown ? 'text' : type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				autoComplete={autoComplete}
				required={required}
				disabled={disabled}
				autoFocus={autoFocus}
				error={Boolean(error)}
				fullWidth
				inputProps={{ 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined }}
				endAdornment={
					isPassword ? (
						<InputAdornment position="end">
							<IconButton
								edge="end"
								size="small"
								onClick={() => setShown((prev) => !prev)}
								aria-label={shown ? t('fields.hidePassword') : t('fields.showPassword')}
								aria-pressed={shown}
								sx={{ width: 36, height: 36 }}
							>
								{shown ? <EyeSlash size={20} /> : <Eye size={20} />}
							</IconButton>
						</InputAdornment>
					) : undefined
				}
			/>
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

export default Field;
