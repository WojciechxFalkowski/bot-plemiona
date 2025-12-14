/**
 * Oblicza ile jednostek można wytrenować dla danej jednostki
 * @param requested Liczba jednostek żądana w strategii
 * @param producible Liczba jednostek możliwych do wyprodukowania
 * @param inQueue Liczba jednostek w kolejce
 * @param queueRemaining Pozostałe miejsce w kolejce
 * @param remainingByMaxTotal Pozostały limit globalny
 * @returns Liczba jednostek do wytrenowania (grant)
 */
export function calculateUnitTrainingGrantOperation(
    requested: number,
    producible: number,
    inQueue: number,
    queueRemaining: number,
    remainingByMaxTotal: number
): number {
    return Math.min(requested, producible, queueRemaining, remainingByMaxTotal);
}



