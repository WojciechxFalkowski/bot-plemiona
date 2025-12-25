/**
 * Oblicza ile jednostek można wytrenować dla danej jednostki
 * @param requested Liczba jednostek żądana w strategii
 * @param producible Liczba jednostek możliwych do wyprodukowania
 * @param inQueue Liczba jednostek w kolejce
 * @param queueRemaining Pozostałe miejsce w kolejce
 * @param maxTotalPerUnit Maksymalna liczba jednostek dla tego typu (null = brak limitu)
 * @param currentUnitTotal Aktualna liczba jednostek tego typu (unitsTotal + unitsInQueue)
 * @returns Liczba jednostek do wytrenowania (grant)
 */
export function calculateUnitTrainingGrantOperation(
    requested: number,
    producible: number,
    inQueue: number,
    queueRemaining: number,
    maxTotalPerUnit: number | null,
    currentUnitTotal: number
): number {
    const remainingForThisUnit = maxTotalPerUnit !== null
        ? Math.max(0, maxTotalPerUnit - currentUnitTotal)
        : Number.POSITIVE_INFINITY;
    
    return Math.min(requested, producible, queueRemaining, remainingForThisUnit);
}



