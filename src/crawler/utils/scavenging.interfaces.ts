import { Locator } from 'playwright';
import { ScavengingUnit } from '../../utils/scavenging.config';

// Interfejs dla stanu poziomu zbieractwa
export interface ScavengeLevelStatus {
	level: number; // Poziom (1-4)
	isLocked: boolean;
	isBusy: boolean;
	isAvailable: boolean;
	isUnlocking: boolean; // Nowa flaga dla stanu odblokowywania
	containerLocator: Locator; // Locator kontenera danego poziomu
}

// Interfejs dla danych czasu scavenging pojedynczego poziomu
export interface ScavengingLevelTimeData {
	level: number;
	timeRemaining: string | null; // Format "HH:MM:SS" lub null jeśli niedostępny
	timeRemainingSeconds: number; // Czas w sekundach, 0 jeśli niedostępny
	status: 'busy' | 'available' | 'locked' | 'unlocking';
	estimatedCompletionTime?: Date; // Szacowany czas zakończenia misji
}

// Interfejs dla danych czasu scavenging całej wioski
export interface VillageScavengingData {
	villageId: string;
	villageName: string;
	lastUpdated: Date;
	levels: ScavengingLevelTimeData[];
}

// Interfejs dla globalnych danych o czasach scavenging
export interface ScavengingTimeData {
	lastCollected: Date;
	villages: VillageScavengingData[];
}

// Interfejs dla planu wysyłki na jeden poziom
export interface LevelDispatchPlan {
	level: number;
	dispatchUnits: Partial<Record<ScavengingUnit, number>>;
} 