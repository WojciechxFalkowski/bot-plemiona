/**
 * Fejk method configuration loaded from config/fejk-methods.json
 */

export interface FejkMethodConfig {
    /** Min spies in village to use this method (method1 only) */
    minSpyInVillage?: number;
    /** Unit counts - "siege" is placeholder, resolved to ram or catapult */
    units: Record<string, number>;
    /** Siege unit types to try in order (first available wins) */
    siegeUnits: string[];
}

export interface FejkMethodsConfig {
    method1: FejkMethodConfig;
    method2: FejkMethodConfig;
}
