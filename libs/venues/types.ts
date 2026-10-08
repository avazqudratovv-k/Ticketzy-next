import { LayoutSection } from '../seats/types';
import { VenueType } from './model';

export interface VenueRecord {
	_id: string;
	venueName: string;
	venueType: VenueType;
	venueCity: string;
	venueAddress: string;
	venueTimezone: string;
	venueCapacity: number;
	venueImages: string[];
	venueStatus: 'ACTIVE' | 'CLOSED' | 'DELETE';
	memberId: string;
	createdAt: string;
	updatedAt: string;
	venueLayout?: { sections: LayoutSection[] } | null;
}
