export type EventTagKind = 'fewLeft' | 'sellingFast' | 'salesStart' | 'soldOut';

/**
 * The one status tag of an event card (seat availability or "Sales start <date>"): a small dark tag in the top-right
 * corner of the picture. The text carries the meaning; the dot is decoration. Place it inside `.tz-media`.
 */
const EventTag = ({ kind, children }: { kind: EventTagKind; children: string }) => (
	<span className={`tz-tag tz-tag--${kind}`}>
		<span className="tz-tag__dot" aria-hidden="true" />
		<span className="tz-tag__text">{children}</span>
	</span>
);

export default EventTag;
