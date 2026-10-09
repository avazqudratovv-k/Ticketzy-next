import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import CountUp from '../common/CountUp';
import { formatPrice } from '../../format';
import { PayoutTotals } from '../../payouts';

interface Props {
	totals?: PayoutTotals | null;
	loading?: boolean;
	/** accessible name of the list of tiles */
	label: string;
}

/** Paid out / Due now / Upcoming (net amounts). Shared by the organizer and admin payouts pages. */
const PayoutTiles = ({ totals, loading, label }: Props) => {
	const { t } = useTranslation('common');
	const { locale } = useRouter();
	const money = (amount: number) => formatPrice(amount, locale, 'KRW');
	const tiles = [
		{ key: 'paid', label: t('payoutTiles.paid'), hint: t('payoutTiles.paidHint'), value: totals?.totalPaidOut },
		{ key: 'due', label: t('payoutTiles.due'), hint: t('payoutTiles.dueHint'), value: totals?.totalDue },
		{ key: 'upcoming', label: t('payoutTiles.upcoming'), hint: t('payoutTiles.upcomingHint'), value: totals?.totalUpcoming },
	];
	return (
		<ul className="org-stats org-stats--three" aria-label={label} aria-busy={loading || undefined}>
			{tiles.map((tile) => (
				<li className="org-stat" key={tile.key}>
					<span className="org-stat__label">{tile.label}</span>
					<strong className="org-stat__value">
						{totals ? <CountUp value={tile.value ?? 0} format={money} /> : loading ? <span className="tz-skel tz-skel--title" /> : '–'}
					</strong>
					<span className="org-row__meta">{tile.hint}</span>
				</li>
			))}
		</ul>
	);
};

export default PayoutTiles;
