import { ArmyTrainingStrategyResponseDto } from '../../dto/army-training-strategy-response.dto';
import { UnitDefinition } from '@/utils/army/armyPage/unitDefinitions';

/**
 * Formats the recruitable units status into a compact monospace table for logs
 * @param units Array of unit definitions
 * @param villageDisplayName Name of the village for display
 * @param strategy Optional strategy for calculating limits
 * @returns Formatted table string
 */
export function formatUnitsInProductionTableOperation(
    units: ReadonlyArray<UnitDefinition>,
    villageDisplayName: string,
    strategy?: ArmyTrainingStrategyResponseDto
): string {
    if (!units || units.length === 0) {
        return `📋 Units in production for ${villageDisplayName}\n(No recruitable units found)`;
    }

    type Row = {
        unit: string;
        code: string;
        inVillage: string | number;
        outside: string | number;
        total: string | number;
        canRecruit: string;
        producible: string;
        inQueue: string;
        queueCapRemaining: string;
    };

    const globalQueueCapPerUnit = strategy?.max_in_queue_per_unit_overall ?? 10;

    const rows: Row[] = units.map((u: UnitDefinition) => ({
        unit: u.staticData?.name ?? '-',
        code: u.staticData?.dataUnit ?? '-',
        inVillage: u.dynamicData?.unitsInVillage ?? '-',
        outside: u.dynamicData?.unitsOutside ?? '-',
        total: u.dynamicData?.unitsTotal ?? '-',
        canRecruit: u.dynamicData?.canRecruit ? 'YES' : 'NO',
        producible: String(u.dynamicData?.producibleCount ?? 0),
        inQueue: String(u.dynamicData?.unitsInQueue ?? 0),
        queueCapRemaining: String(Math.max(0, globalQueueCapPerUnit - (u.dynamicData?.unitsInQueue ?? 0))),
    }));

    const headers: Row = {
        unit: 'Unit',
        code: 'Code',
        inVillage: 'InVillage',
        outside: 'Outside',
        total: 'Total',
        canRecruit: 'CanRecruit',
        producible: 'Producible',
        inQueue: 'InQueue',
        queueCapRemaining: 'QueueCapRemaining',
    };

    const getWidth = (key: keyof Row): number => {
        const headerLen = headers[key].toString().length;
        const dataMax = rows.reduce((max: number, r: Row) => Math.max(max, r[key].toString().length), 0);
        return Math.max(headerLen, dataMax);
    };

    const widths = {
        unit: getWidth('unit'),
        code: getWidth('code'),
        inVillage: getWidth('inVillage'),
        outside: getWidth('outside'),
        total: getWidth('total'),
        canRecruit: getWidth('canRecruit'),
        producible: getWidth('producible'),
        inQueue: getWidth('inQueue'),
        queueCapRemaining: getWidth('queueCapRemaining'),
    } as const;

    const pad = (text: string, width: number): string => text.padEnd(width, ' ');

    const headerLine = `${pad(headers.unit, widths.unit)}  ${pad(headers.code, widths.code)}  ${pad(headers.inVillage.toString(), widths.inVillage)}  ${pad(headers.outside.toString(), widths.outside)}  ${pad(headers.total.toString(), widths.total)}  ${pad(headers.canRecruit, widths.canRecruit)}  ${pad(headers.producible, widths.producible)}  ${pad(headers.inQueue, widths.inQueue)}  ${pad(headers.queueCapRemaining, widths.queueCapRemaining)}`;
    const sepLine = `${'-'.repeat(widths.unit)}  ${'-'.repeat(widths.code)}  ${'-'.repeat(widths.inVillage)}  ${'-'.repeat(widths.outside)}  ${'-'.repeat(widths.total)}  ${'-'.repeat(widths.canRecruit)}  ${'-'.repeat(widths.producible)}  ${'-'.repeat(widths.inQueue)}  ${'-'.repeat(widths.queueCapRemaining)}`;
    const dataLines = rows
        .map((r: Row) => `${pad(r.unit, widths.unit)}  ${pad(r.code, widths.code)}  ${pad(r.inVillage.toString(), widths.inVillage)}  ${pad(r.outside.toString(), widths.outside)}  ${pad(r.total.toString(), widths.total)}  ${pad(r.canRecruit, widths.canRecruit)}  ${pad(r.producible, widths.producible)}  ${pad(r.inQueue, widths.inQueue)}  ${pad(r.queueCapRemaining, widths.queueCapRemaining)}`)
        .join('\n');

    // Global header context
    const currentTotalAllUnits = units.reduce((sum, u) => sum + (u.dynamicData?.unitsInVillage ?? 0) + (u.dynamicData?.unitsInQueue ?? 0), 0);
    const maxTotalOverall = strategy?.max_total_overall ?? '∞';
    const remainingByMaxTotal = typeof strategy?.max_total_overall === 'number' ? Math.max(0, strategy.max_total_overall - currentTotalAllUnits) : '∞';

    return [
        `📋 Units in production for ${villageDisplayName} | MaxTotalOverall=${maxTotalOverall} | CurrentTotal=${currentTotalAllUnits} | Remaining=${remainingByMaxTotal} | MaxInQueuePerUnit=${globalQueueCapPerUnit}`,
        '```',
        headerLine,
        sepLine,
        dataLines,
        '```',
    ].join('\n');
}


