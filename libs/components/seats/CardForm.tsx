import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { WarningCircle } from 'phosphor-react';
import {
	CARD_FIELDS,
	CardField,
	CardIssues,
	CardValues,
	EMPTY_CARD,
	formatCardNumber,
	formatCvc,
	formatExpiry,
	validateCard,
	validateField,
} from '../../checkout/card';

export interface CardFormHandle {
	/** Checks every field and shows the errors. True when the card is complete and valid. */
	validate: () => boolean;
	/** Moves focus to the first field with a problem (called once the summary message is on screen). */
	focusFirstIssue: () => void;
}

/**
 * The demo card fields of checkout (F366). What is typed lives in this component's state only: it is not passed up, not
 * sent, logged, stored in the browser or put in the URL (this is a group of inputs, not a `<form>`, so it cannot be submitted
 * or turned into a query string). Browser card autofill is off: `autocomplete="off"`, no `cc-*` tokens, no name that
 * suggests a card, and the password-manager hints are set.
 */
const CardForm = forwardRef<CardFormHandle>(function CardForm(_props, ref) {
	const { t } = useTranslation('checkout');
	const [values, setValues] = useState<CardValues>(EMPTY_CARD);
	const [issues, setIssues] = useState<CardIssues>({});
	const root = useRef<HTMLDivElement>(null);
	const inputs = useRef<Partial<Record<CardField, HTMLInputElement | null>>>({});
	const firstIssue = useRef<CardField | undefined>();

	useImperativeHandle(ref, () => ({
		validate: () => {
			const found = validateCard(values);
			setIssues(found);
			firstIssue.current = CARD_FIELDS.find((field) => found[field]);
			return !firstIssue.current;
		},
		focusFirstIssue: () => {
			if (firstIssue.current) inputs.current[firstIssue.current]?.focus();
		},
	}));

	const change = (field: CardField, next: string) => {
		setValues((prev) => ({ ...prev, [field]: next }));
		// typing clears this field's message; it comes back when the field is left or when Pay is pressed
		setIssues((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
	};
	const leave = (field: CardField) => {
		const rule = values[field] ? validateField(field, values) : null;
		setIssues((prev) => ({ ...prev, [field]: rule ?? undefined }));
	};

	const field = (id: CardField, label: string, input: Partial<React.InputHTMLAttributes<HTMLInputElement>>) => {
		const rule = issues[id];
		const errorId = `card-${id}-error`;
		return (
			<div className="tz-field" key={id}>
				<label className="tz-field__label" htmlFor={`card-${id}`}>
					{label}
				</label>
				<input
					ref={(node) => {
						inputs.current[id] = node;
					}}
					id={`card-${id}`}
					className="tz-input"
					type="text"
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					data-lpignore="true"
					data-1p-ignore="true"
					data-form-type="other"
					value={values[id]}
					aria-invalid={rule ? true : undefined}
					aria-describedby={rule ? errorId : undefined}
					onBlur={() => leave(id)}
					{...input}
				/>
				{rule && (
					<span className="tz-field__error" id={errorId}>
						<WarningCircle size={18} weight="fill" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
						{t(`card.errors.${id}.${rule}`)}
					</span>
				)}
			</div>
		);
	};

	return (
		<div ref={root} className="demo__fields" role="group" aria-label={t('card.group')}>
			{field('number', t('card.number'), {
				inputMode: 'numeric',
				placeholder: '1234 5678 9012 3456',
				maxLength: 23,
				onChange: (event) => change('number', formatCardNumber(event.target.value)),
			})}
			{field('name', t('card.name'), {
				maxLength: 60,
				placeholder: t('card.namePlaceholder'),
				autoCapitalize: 'words',
				onChange: (event) => change('name', event.target.value),
			})}
			{field('expiry', t('card.expiry'), {
				inputMode: 'numeric',
				placeholder: t('card.expiryPlaceholder'),
				maxLength: 5,
				onChange: (event) => {
					const deleting = event.target.value.length < values.expiry.length;
					change('expiry', formatExpiry(event.target.value, deleting));
				},
			})}
			{field('cvc', t('card.cvc'), {
				inputMode: 'numeric',
				placeholder: '123',
				maxLength: 4,
				onChange: (event) => change('cvc', formatCvc(event.target.value)),
			})}
		</div>
	);
});

export default CardForm;
