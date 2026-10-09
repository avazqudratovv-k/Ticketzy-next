/** Round check mark that draws itself (CSS, 600 ms). Decorative: the text next to it says what happened. */
const SuccessCheck = ({ size = 32 }: { size?: number }) => (
	<svg className="tz-check" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
		<circle className="tz-check__ring" cx="16" cy="16" r="13" pathLength={1} />
		<path className="tz-check__tick" d="M10 16.5l4 4 8-9" pathLength={1} />
	</svg>
);

export default SuccessCheck;
