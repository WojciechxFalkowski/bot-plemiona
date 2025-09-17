export interface StaticUnitData {
  dataUnit: string;
  name: string;
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
