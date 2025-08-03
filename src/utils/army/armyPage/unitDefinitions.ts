export interface StaticUnitData {
  dataUnit: string;
  name: string;
  population: number;
  wood: number;
  clay: number;
  iron: number;
}

interface DynamicUnitData {
  canRecruit: boolean | undefined; // czy jednostkę można aktualnie rekrutować
  unitsInQueue: number | undefined; // ile jednostek jest aktualnie w kolejce produkcji
  unitsInVillage: number | undefined; // ile jednostek jest w wiosce
  unitsOutside: number | undefined; // ile jednostek jest poza wioską (np. na wyprawach)
  producibleCount: number | undefined; // ile jednostek można aktualnie wyprodukować (bazując na surowcach)
}

export interface UnitDefinition {
  staticData: StaticUnitData;
  dynamicData: DynamicUnitData;
}

// Statyczne dane jednostek (bazowe definicje)
export const unitDefinitionsStatic: UnitDefinition[] = [
  {
    staticData: {
      dataUnit: "spear",
      name: "Pikinier",
      population: 2,
      wood: 50,
      clay: 30,
      iron: 10,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "sword",
      name: "Miecznik",
      population: 2,
      wood: 30,
      clay: 30,
      iron: 70,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "axe",
      name: "Topornik",
      population: 2,
      wood: 60,
      clay: 30,
      iron: 40,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "archer",
      name: "Łucznik",
      population: 2,
      wood: 100,
      clay: 30,
      iron: 60,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "spy",
      name: "Zwiadowca",
      population: 2,
      wood: 50,
      clay: 50,
      iron: 20,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "light",
      name: "Lekki kawalerzysta",
      population: 4,
      wood: 125,
      clay: 100,
      iron: 250,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "marcher",
      name: "Łucznik na koniu",
      population: 5,
      wood: 250,
      clay: 100,
      iron: 150,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "heavy",
      name: "Ciężki kawalerzysta",
      population: 6,
      wood: 200,
      clay: 150,
      iron: 600,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "ram",
      name: "Taran",
      population: 6,
      wood: 300,
      clay: 200,
      iron: 200,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
  {
    staticData: {
      dataUnit: "catapult",
      name: "Katapulta",
      population: 6,
      wood: 320,
      clay: 400,
      iron: 100,
    },
    dynamicData: {
      canRecruit: undefined,
      unitsInQueue: undefined,
      unitsInVillage: undefined,
      unitsOutside: undefined,
      producibleCount: undefined,
    },
  },
];
