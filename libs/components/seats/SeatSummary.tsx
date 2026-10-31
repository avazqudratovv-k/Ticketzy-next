import { ReactNode, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import { CaretUp, X } from 'phosphor-react';
import { formatPrice } from '../../format';

export interface SummaryLine {
	key: string;
	title: string;
	meta: string;
	price: number;
	/** Remove button; omitted for read-only lines */
	onRemove?: () => void;
	removeLabel?: string;
}

interface Props {
	heading: string;
	lines: SummaryLine[];
	count: number;
	total: number;
	currency: string;
	/** Short line under the total ("Up to 8 seats per order") */
	note?: string;
	timer?: ReactNode;
	/** `blocked`: nothing to continue with yet; outlined `tz-blocked` look with `aria-disabled` and the `hint` line (F329). `disabled` is for a request in flight. */
	action: { label: string; busyLabel: string; busy: boolean; disabled: boolean; blocked?: boolean; hint?: string; onClick: () => void };
	secondary?: ReactNode;
	/** The refund policy of the event, under the total */
	policy?: ReactNode;
	/** The non-refundable confirmation (a checkbox), right above the button */
	gate?: ReactNode;
	empty: string;
	/** Overrides of the "N seats" labels, for tickets without seats */
	countLabel?: string;
	totalLabel?: string;
}

/** The sticky summary of the picked seats or tickets; on phones it is a bottom sheet with the total always visible. */
const SeatSummary = ({ heading, lines, count, total, currency, note, timer, action, secondary, policy, gate, empty, countLabel, totalLabel }: Props) => {
	const { t } = useTranslation('checkout');
	const { locale } = useRouter();
	const [open, setOpen] = useState(false);

	return (
		<aside className={`summary${open ? ' is-open' : ''}`} aria-label={heading}>
			<button
				type="button"
				className="summary__grip"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				aria-controls="summary-body"
			>
				<span>{countLabel ?? t('summary.count', { count })}</span>
				<strong>{formatPrice(total, locale, currency)}</strong>
				<CaretUp size={18} aria-hidden="true" className="summary__caret" />
			</button>
			<div className="summary__body" id="summary-body">
				{timer}
				<h2 className="summary__title">{heading}</h2>
				{lines.length === 0 ? (
					<p className="summary__empty">{empty}</p>
				) : (
					<ul className="summary__list">
						{lines.map((line) => (
							<li key={line.key} className="summary__line">
								<div>
									<span className="summary__name">{line.title}</span>
									<span className="summary__meta">{line.meta}</span>
								</div>
								<span className="summary__price">{formatPrice(line.price, locale, currency)}</span>
								{line.onRemove && (
									<button type="button" className="summary__remove" onClick={line.onRemove} aria-label={line.removeLabel}>
										<X size={18} />
									</button>
								)}
							</li>
						))}
					</ul>
				)}
				<div className="summary__total">
					<div>
						<span className="summary__meta">{totalLabel ?? t('summary.total', { count })}</span>
						<strong className="summary__sum">{formatPrice(total, locale, currency)}</strong>
					</div>
					{note && <span className="summary__note">{note}</span>}
				</div>
				{policy}
			</div>
			<div className="summary__actions">
				{gate}
				{action.blocked && action.hint && (
					<p id="summary-hint" className="summary__hint">
						{action.hint}
					</p>
				)}
				<Button
					variant="contained"
					size="large"
					fullWidth
					className={action.blocked ? 'tz-blocked' : undefined}
					disabled={action.disabled || action.busy}
					aria-disabled={action.blocked ? true : undefined}
					aria-describedby={action.blocked && action.hint ? 'summary-hint' : undefined}
					onClick={() => {
						if (!action.blocked) action.onClick();
					}}
				>
					{action.busy ? action.busyLabel : action.label}
				</Button>
				{secondary}
			</div>
		</aside>
	);
};

export default SeatSummary;
