// plemiona/buildingPage/stable/stablePage.ts
import { Locator, Page } from "@playwright/test";
import { UnitDefinition, unitDefinitionsStatic } from "./unitDefinitions";
import { buildingUrl } from "@/utils/url/url-utils";
import { Logger } from "@nestjs/common";

export class ArmyPage {
  readonly page: Page;
  private readonly logger = new Logger(ArmyPage.name);

  constructor(page: Page) {
    this.page = page;
  }

  public async goToBuilding(serverCode: string, villageId: string, buildingName: string) {
    this.logger.log(`Going to building ${buildingName} on server ${serverCode} for village ${villageId} -> ${buildingUrl(serverCode, villageId, buildingName)}`);
    await this.page.goto(buildingUrl(serverCode, villageId, buildingName));
  }

  /**
   * Metoda główna, która scala wszystkie dane dynamiczne i zwraca pełną tablicę
   */
  public async getRecruitableUnitsStatus(): Promise<UnitDefinition[]> {
    const unitsStatic = this.getAllUnitDefinitions();

    const canRecruitSet = await this.fetchCanRecruitUnits();
    // Tutaj pobieramy wszystkie 3 wartości naraz
    const unitsCountsMap = await this.fetchUnitsCounts();
    const recruitmentQueueMap = await this.fetchRecruitmentQueue();
    const producibleCountMap = await this.getProducibleCount();
    return unitsStatic.map((unit) => {
      const dataUnit = unit.staticData.dataUnit;
      const counts = unitsCountsMap.get(dataUnit);
      const inQueue = recruitmentQueueMap.get(dataUnit) ?? 0;
      const producibleCount = producibleCountMap.get(dataUnit) ?? undefined;
      return {
        staticData: unit.staticData,
        dynamicData: {
          ...unit.dynamicData,
          canRecruit: canRecruitSet.has(dataUnit),
          unitsInVillage: counts?.unitsInVillage,
          unitsOutside: counts?.unitsOutside,
          unitsTotal: counts?.total,
          unitsInQueue: inQueue,
          producibleCount,
          // jeśli chcesz możesz też przekazać total pod inną nazwą lub pominąć
        },
      };
    });
  }

  /**
   * Zwraca bazowe definicje jednostek ze statycznymi danymi oraz pustymi dynamicznymi.
   */
  public getAllUnitDefinitions(): UnitDefinition[] {
    // Kopiujemy array, aby uniknąć mutacji oryginału (opcjonalnie - zależnie od potrzeb)
    return unitDefinitionsStatic.map((unit) => ({
      staticData: { ...unit.staticData },
      dynamicData: { ...unit.dynamicData },
    }));
  }

  private async fetchCanRecruitUnits(): Promise<Set<string>> {
    const recruitableUnitsLocator = this.page.locator(
      "form#train_form a.unit_link"
    );
    const formExists = (await this.page.locator("form#train_form").count()) > 0;

    if (!formExists) {
      console.log(
        "Nie znaleziono formularza rekrutacyjnego #train_form na stronie."
      );
      return new Set();
    }

    const count = await recruitableUnitsLocator.count();
    if (count === 0) {
      console.log(
        "Nie znaleziono żadnych jednostek do rekrutacji w formularzu."
      );
    }

    const recruitableUnitKeys = new Set<string>();
    for (let i = 0; i < count; i++) {
      const key = await recruitableUnitsLocator
        .nth(i)
        .getAttribute("data-unit");
      if (key) recruitableUnitKeys.add(key);
    }
    return recruitableUnitKeys;
  }

  private async fetchUnitsCounts(): Promise<
    Map<string, { unitsInVillage: number; total: number; unitsOutside: number }>
  > {
    const unitsMap = new Map<
      string,
      { unitsInVillage: number; total: number; unitsOutside: number }
    >();

    const rows = this.page.locator("form#train_form table.vis > tbody > tr");
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);

      const unitLink = row.locator("td a.unit_link");
      if ((await unitLink.count()) === 0) {
        // Nie jest to wiersz jednostki, pomijamy
        continue;
      }

      const dataUnit = await unitLink.getAttribute("data-unit");
      if (!dataUnit) {
        continue;
      }

      // Komórka z wartością "wioska/ogólnie" to 3. <td> w wierszu (index 2)
      const countText = (await row.locator("td").nth(2).textContent())?.trim();

      if (!countText) {
        // Jeśli brak tekstu to dajemy 0
        unitsMap.set(dataUnit, {
          unitsInVillage: 0,
          total: 0,
          unitsOutside: 0,
        });
        continue;
      }

      // Parsujemy tekst np. "64/74"
      const match = countText.match(/^(\d+)\/(\d+)$/);
      if (!match) {
        unitsMap.set(dataUnit, {
          unitsInVillage: 0,
          total: 0,
          unitsOutside: 0,
        });
        continue;
      }

      const unitsInVillage = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      const unitsOutside =
        total - unitsInVillage >= 0 ? total - unitsInVillage : 0;

      unitsMap.set(dataUnit, { unitsInVillage, total, unitsOutside });
    }

    return unitsMap;
  }

  /**
   * 4) Szczytanie aktualnej kolejki jednostek do rekrutacji i typów
   * Metoda iteruje po wszystkich wierszach kolejki produkcji i sumuje ilości jednostek wg dataUnit.
   */
  private async fetchRecruitmentQueue(): Promise<Map<string, number>> {
    const isBlocked = await this.isBuildingBlockedDueToRequirements();
    if (isBlocked) {
      console.log("Budynek zablokowany, brak kolejki produkcji.");
      return new Map();
    }

    const isTraining = await this.isUnitBeingTrained();
    if (!isTraining) {
      console.log("Brak jednostek w kolejce produkcji.");
      return new Map();
    }

    const queueMap = new Map<string, number>();

    // Lokator na oba tbodyy z wierszami kolejki
    const queueWrappersLocator = this.page.locator(
      "#trainqueue_wrap_stable table.vis > tbody"
    );
    const tbodyCount = await queueWrappersLocator.count();

    for (let i = 0; i < tbodyCount; i++) {
      const tbody = queueWrappersLocator.nth(i);
      // Wiersze w każdym tbody
      const rows = tbody.locator("tr");
      const rowCount = await rows.count();

      for (let j = 0; j < rowCount; j++) {
        const row = rows.nth(j);

        // Klasy na wierszach to bearne 'lit' lub 'sortable_row'
        // Ignorujemy wiersze, które nie mają klasy lit ani sortable_row
        const classAttr = (await row.getAttribute("class")) || "";
        if (!classAttr.includes("lit") && !classAttr.includes("sortable_row")) {
          continue;
        }

        // Szukamy elementu div w pierwszej kolumnie zawierającego klasę unit_sprite_smaller oraz klasę jednostki (np. spy, light)
        const firstTd = row.locator("td").first();
        const unitSpriteDiv = firstTd.locator("div.unit_sprite_smaller");
        if ((await unitSpriteDiv.count()) === 0) {
          continue; // brak info o jednostce — pomijamy
        }

        const classes = (await unitSpriteDiv.getAttribute("class")) || "";
        // Klasy są w formacie: "unit_sprite unit_sprite_smaller spy"
        // Wśród nich jest nazwa jednostki (dataUnit)
        const classList = classes.split(/\s+/);
        // Znajdujemy klasę dataUnit (spośród wszystkich klas wybieramy pierwszą, która nie jest unit_sprite ani unit_sprite_smaller)
        const dataUnitClass = classList.find(
          (c) => c !== "unit_sprite" && c !== "unit_sprite_smaller"
        );
        if (!dataUnitClass) {
          continue;
        }

        // W treści pierwszej kolumny jest np. "1 Zwiadowca"
        const tdText = (await firstTd.textContent()) || "";
        // Wyciągamy liczbę na początku — liczba jednostek w kolejce tego typu
        const countMatch = tdText.trim().match(/^(\d+)/);
        const count = countMatch ? parseInt(countMatch[1], 10) : 0;

        // Sumujemy do mapy
        queueMap.set(dataUnitClass, (queueMap.get(dataUnitClass) ?? 0) + count);
      }
    }

    return queueMap;
  }

  public async getProducibleCount(): Promise<Map<string, number>> {
    const producibleCountMap = new Map<string, number>();
    const producibleCount = this.page.locator("form#train_form");
    const canRecruitSet = await this.fetchCanRecruitUnits();

    for (const unit of canRecruitSet) {
      const producibleCountRow = producibleCount.locator(`#${unit}_0_a`);
      const producibleCountRowCount = (await producibleCountRow.textContent())?.replace("(", "").replace(")", "");
      producibleCountMap.set(unit, producibleCountRowCount ? parseInt(producibleCountRowCount, 10) : 0);
    }

    return producibleCountMap;
  }

  public async isBuildingBlockedDueToRequirements(): Promise<boolean> {
    // Znajdujemy tabelę z klasą 'vis tall'
    const requirementsTable = this.page.locator("table.vis.tall");

    // Sprawdzamy, czy tabela istnieje i ma nagłówek <th> z tekstem "Wymagania:"
    const exists = (await requirementsTable.count()) > 0;
    if (!exists) {
      return false; // brak tabeli = brak wymagań blokujących
    }

    // Sprawdzamy, czy w tabeli jest <th> z tekstem "Wymagania:"
    const header = requirementsTable.locator("th");
    const headerCount = await header.count();

    for (let i = 0; i < headerCount; i++) {
      const text = (await header.nth(i).textContent())?.trim() ?? "";
      if (text === "Wymagania:") {
        return true; // wykryto tabelę informującą o wymaganiach blokujących
      }
    }

    return false; // tabela jest, ale nie ma takiego nagłówka - uznajemy, że jest OK
  }

  /**
   * Sprawdza czy istnieje sekcja produkcji (div.current_prod_wrapper)
   * oraz czy w kolejce produkcji jest co najmniej jedna jednostka (tr.lit)
   */
  public async isUnitBeingTrained(): Promise<boolean> {
    // Szukamy kontenera produkcji
    const prodWrapper = this.page.locator("div.current_prod_wrapper");

    const prodWrapperExists = (await prodWrapper.count()) > 0;
    if (!prodWrapperExists) {
      // Brak całej sekcji produkcji - czyli żadna jednostka nie jest budowana
      return false;
    }

    // Jeśli jest kontener, szukamy w nim wierszy kolejki
    const trainingRowsLocator = prodWrapper.locator("table.vis tr.lit");
    const count = await trainingRowsLocator.count();

    return count > 0;
  }
}
