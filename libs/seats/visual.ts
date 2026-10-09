import { TakenSeat } from './types';

export type SeatVisual = 'available' | 'selected' | 'held' | 'sold' | 'mine' | 'locked';

/** How a seat is drawn. Lives outside SeatMap so the picker can use it without loading the map's code up front. */
export const seatVisual = (taken: TakenSeat | undefined, isSelected: boolean, locked: boolean): SeatVisual => {
	if (isSelected) return 'selected';
	if (taken) return taken.mine ? 'mine' : taken.seatStatus === 'SOLD' ? 'sold' : 'held';
	return locked ? 'locked' : 'available';
};
