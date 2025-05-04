/**
 * Konfiguracja procesu zbieractwa, wzorowana na skrypcie asysten_zbieracza.js.
 */

// Główne ustawienia zbieractwa
export const scavengingSettings = {
	// Maksymalna ilość surowców do zebrania z jednego poziomu.
	// Wartość zostanie przemnożona w kodzie w zależności od poziomu (wg logiki z JS).
	max_resources: 99999,
	// Czy świat obsługuje łuczników i konnych łuczników (1 - tak, 0 - nie).
	archers: 0, // Zmień na 1 jeśli świat ma łuczników
	// Czy pomijać poziom 1 (najwolniejszy), jeśli inne poziomy są odblokowane i wolne?
	skip_level_1: 0, // Zmień na 1, aby pomijać
};

// Typy jednostek (zgodne z nazwami pól input)
export type ScavengingUnit = 'spear' | 'sword' | 'axe' | 'archer' | 'light' | 'marcher' | 'heavy';

// Ustawienia dla poszczególnych jednostek
export const unitSettings: Record<ScavengingUnit, {
	untouchable: number;
	max_unit_number: number;
	conditional_safeguard: number;
	capacity: number;
}> = {
	spear: {
		untouchable: 0,
		max_unit_number: 99999,
		conditional_safeguard: 0,
		capacity: 25, // Pojemność łupu
	},
	sword: {
		untouchable: 0,
		max_unit_number: 99999,
		conditional_safeguard: 0,
		capacity: 15,
	},
	axe: {
		untouchable: 0,
		max_unit_number: 99999,
		conditional_safeguard: 0,
		capacity: 10,
	},
	archer: {
		untouchable: 0,
		max_unit_number: 99999,
		conditional_safeguard: 0,
		capacity: 10,
	},
	light: {
		untouchable: 0,
		max_unit_number: 99999,
		conditional_safeguard: 0,
		capacity: 80,
	},
	marcher: {
		untouchable: 0,
		max_unit_number: 99999,
		conditional_safeguard: 0,
		capacity: 50,
	},
	heavy: {
		untouchable: 0,
		max_unit_number: 99999,
		conditional_safeguard: 0,
		capacity: 50,
	},
};

// Kolejność jednostek zgodna z interfejsem gry i skryptem JS
export const unitOrder: ScavengingUnit[] = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy'];

// Współczynniki "packs" dla poziomów zbieractwa (wg skryptu JS)
// Klucz: poziom (1-4), Wartość: współczynnik proporcjonalności
export const levelPacks: Record<number, number> = {
	1: 15,
	2: 6,
	3: 3,
	4: 2,
};

// Selektory do odczytu dostępnych jednostek - **POPRAWIONE**
export const availableUnitSelectors: Record<ScavengingUnit, string> = {
	spear: 'a.units-entry-all[data-unit="spear"]',
	sword: 'a.units-entry-all[data-unit="sword"]',
	axe: 'a.units-entry-all[data-unit="axe"]',
	archer: 'a.units-entry-all[data-unit="archer"]',
	light: 'a.units-entry-all[data-unit="light"]',
	marcher: 'a.units-entry-all[data-unit="marcher"]',
	heavy: 'a.units-entry-all[data-unit="heavy"]',
};

// Nazwy pól input dla jednostek
export const unitInputNames: Record<ScavengingUnit, string> = {
	spear: 'spear',
	sword: 'sword',
	axe: 'axe',
	archer: 'archer',
	light: 'light',
	marcher: 'marcher',
	heavy: 'heavy',
};

// Przykładowe selektory dla poziomów zbieractwa - **wymagają dostosowania!**
// Zakładamy, że każdy poziom ma unikalny kontener/identyfikator
export const levelSelectors = {
	levelContainerBase: '.scavenge-option', // Poprawiony selektor (myślnik zamiast podkreślnika)
	levelStartButton: 'a.btn.free_send_button:has-text("Start")', // Selektor przycisku Start
	levelUnlockButton: 'a.btn.unlock-button:has-text("Odblokowanie")', // Dodano selektor przycisku Odblokowanie
	levelInput: (levelIndex: number, unitName: string) => `#scavenge_option_${levelIndex} input[name="${unitName}"]`, // Przykład, jeśli kontenery mają ID
	levelTimeRemaining: '.return-countdown', // Selektor dla czasu pozostałego w AKTYWNEJ misji
};

// Bufor czasowy (w sekundach) dodawany do czasu najdłuższej misji przed kolejnym uruchomieniem
export const scheduleBufferSeconds = 20; // 20 sekund