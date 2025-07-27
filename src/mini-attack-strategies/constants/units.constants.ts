export interface Unit {
    name: string;
    namePL: string;
    id: string;
}

export const MILITARY_UNITS: Unit[] = [
    {
        name: "spear",
        namePL: "Pikinier",
        id: "unit_input_spear"
    },
    {
        name: "sword",
        namePL: "Miecznik",
        id: "unit_input_sword"
    },
    {
        name: "axe",
        namePL: "Topornik",
        id: "unit_input_axe"
    },
    {
        name: "archer",
        namePL: "Łucznik",
        id: "unit_input_archer"
    },
    {
        name: "spy",
        namePL: "Zwiadowca",
        id: "unit_input_spy"
    },
    {
        name: "light",
        namePL: "Lekki kawalerzysta",
        id: "unit_input_light"
    },
    {
        name: "marcher",
        namePL: "Łucznik na koniu",
        id: "unit_input_marcher"
    },
    {
        name: "heavy",
        namePL: "Ciężki kawalerzysta",
        id: "unit_input_heavy"
    },
    {
        name: "ram",
        namePL: "Taran",
        id: "unit_input_ram"
    },
    {
        name: "catapult",
        namePL: "Katapulta",
        id: "unit_input_catapult"
    },
    {
        name: "knight",
        namePL: "Rycerz",
        id: "unit_input_knight"
    },
    {
        name: "snob",
        namePL: "Szlachcic",
        id: "unit_input_snob"
    }
];

// Pomocnicze mapowanie nazwa -> jednostka
export const UNITS_BY_NAME: Record<string, Unit> = MILITARY_UNITS.reduce((acc, unit) => {
    acc[unit.name] = unit;
    return acc;
}, {} as Record<string, Unit>);

// Lista nazw jednostek (dla walidacji)
export const UNIT_NAMES = MILITARY_UNITS.map(unit => unit.name);

// Domyślna strategia (wszystkie jednostki = 0)
export const DEFAULT_STRATEGY: Record<string, number> = MILITARY_UNITS.reduce((acc, unit) => {
    acc[unit.name] = 0;
    return acc;
}, {} as Record<string, number>); 