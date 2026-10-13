import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { Minus, Plus, Warning } from 'phosphor-react';
import { clearSession } from '../../auth';
import { parseApiError } from '../../errors';
import { ticketAvailability } from '../../events';
import { formatPrice } from '../../format';
import { checkoutQuantities } from '../../seats/checkout';
import { checkoutErrorKey } from '../../seats/errors';
import { checkoutUrl } from '../../routes';
import { TicketTypeItem } from '../../types/event';
import { SeatConfig } from '../../seats/types';
import SeatSummary, { SummaryLine } from './SeatSummary';

interface Props {
	eventId: string;
	ticketTypes: TicketTypeItem[];
	config: SeatConfig;
}

/**
 * General admission: no map. The order itself reserves the stock, so there is no separate hold step; the order
 * then expires after the same hold time (backend DECISIONS #46).
 */
const GeneralPicker = ({ eventId, ticketTypes, config }: Props) => {
	const { t } = useTranslation('checkout');
	const { locale, push } = useRouter();
	const client = useApolloClient();
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const busyRef = useRef(false);

	const limit = (tt: TicketTypeItem) => Math.max(0, Math.min(tt.maxPerOrder, tt.totalQuantity - tt.soldQuantity));
	const currency = ticketTypes[0]?.ticketCurrency ?? 'KRW';

	const picked = useMemo(() => ticketTypes.filter((tt) => (counts[tt._id] ?? 0) > 0), [ticketTypes, counts]);
	const count = picked.reduce((sum, tt) => sum + (counts[tt._id] ?? 0), 0);
	const total = picked.reduce((sum, tt) => sum + (counts[tt._id] ?? 0) * tt.ticketPrice, 0);

	const set = (tt: TicketTypeItem, value: number) => {
		setError(null);
		setCounts((current) => ({ ...current, [tt._id]: Math.max(0, Math.min(limit(tt), value)) }));
	};

	const goOn = async () => {
		if (busyRef.current || picked.length === 0) return;
		busyRef.current = true;
		setBusy(true);
		setError(null);
		try {
			const orderId = await checkoutQuantities(
				client,
				eventId,
				picked.map((tt) => ({ ticketTypeId: tt._id, quantity: counts[tt._id] })),
			);
			await push(checkoutUrl(orderId));
		} catch (err) {
			const known = checkoutErrorKey(parseApiError(err));
			if (known.auth) clearSession();
			else setError(known.key);
			busyRef.current = false;
			setBusy(false);
		}
	};

	const lines: SummaryLine[] = picked.map((tt) => ({
		key: tt._id,
		title: `${counts[tt._id]} × ${tt.ticketTypeName}`,
		meta: formatPrice(tt.ticketPrice, locale, tt.ticketCurrency),
		price: counts[tt._id] * tt.ticketPrice,
	}));

	return (
		<div className="picker">
			<div className="picker__main">
				{error && (
					<div className="tz-alert tz-alert--danger" role="alert">
						<span className="tz-alert__icon">
							<Warning size={18} />
						</span>
						<p className="tz-alert__title">{t(error)}</p>
					</div>
				)}
				<ul className="ga">
					{ticketTypes.map((tt) => {
						const availability = ticketAvailability(tt);
						const max = limit(tt);
						const usable = availability === 'available' && max > 0;
						const value = counts[tt._id] ?? 0;
						return (
							<li key={tt._id} className={`ga__item${usable ? '' : ' is-disabled'}`}>
								<div className="ga__head">
									<h2 className="ga__name">{tt.ticketTypeName}</h2>
									<div className="ga__price">
										<span>{t('general.perTicket')}</span>
										<strong>{formatPrice(tt.ticketPrice, locale, tt.ticketCurrency)}</strong>
									</div>
								</div>
								{usable ? (
									<div className="ga__row">
										<div>
											<span className="ga__label" id={`qty-${tt._id}`}>
												{t('general.quantity')}
											</span>
											<span className="ga__hint">{t('general.max', { count: max })}</span>
										</div>
										<div className="stepper" role="group" aria-labelledby={`qty-${tt._id}`}>
											<button type="button" onClick={() => set(tt, value - 1)} disabled={value <= 0} aria-label={t('general.less', { name: tt.ticketTypeName })}>
												<Minus size={18} />
											</button>
											<output aria-live="polite">{value}</output>
											<button type="button" onClick={() => set(tt, value + 1)} disabled={value >= max} aria-label={t('general.more', { name: tt.ticketTypeName })}>
												<Plus size={18} />
											</button>
										</div>
									</div>
								) : (
									<p className="ga__hint">{t(`general.unavailable.${availability === 'available' ? 'soldOut' : availability}`)}</p>
								)}
							</li>
						);
					})}
				</ul>
				<p className="picker__hint">{t('general.note')}</p>
			</div>
			<SeatSummary
				heading={t('general.summary')}
				lines={lines}
				count={count}
				total={total}
				currency={currency}
				empty={t('general.empty')}
				countLabel={t('general.count', { count })}
				totalLabel={t('general.totalLabel', { count })}
				timer={
					<div className="countdown countdown--idle">
						<p className="countdown__text">{t('general.idle', { seconds: config.seatHoldSeconds })}</p>
					</div>
				}
				action={{ label: t('summary.continue'), busyLabel: t('summary.holding'), busy, disabled: false, blocked: count === 0, hint: t('general.selectHint'), onClick: goOn }}
			/>
		</div>
	);
};

export default GeneralPicker;
