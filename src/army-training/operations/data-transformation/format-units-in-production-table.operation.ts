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
        maxTotalRemaining: string | number;
    };

    const globalQueueCapPerUnit = strategy?.max_in_queue_per_unit_overall ?? 10;
    const maxTotalPerUnit = strategy?.max_total_per_unit ?? null;

    const rows: Row[] = units.map((u: UnitDefinition) => {
        const currentUnitTotal = (u.dynamicData?.unitsTotal ?? 0) + (u.dynamicData?.unitsInQueue ?? 0);
        const maxTotalRemaining = maxTotalPerUnit !== null
            ? Math.max(0, maxTotalPerUnit - currentUnitTotal)
            : '∞';
        
        return {
            unit: u.staticData?.name ?? '-',
            code: u.staticData?.dataUnit ?? '-',
            inVillage: u.dynamicData?.unitsInVillage ?? '-',
            outside: u.dynamicData?.unitsOutside ?? '-',
            total: u.dynamicData?.unitsTotal ?? '-',
            canRecruit: u.dynamicData?.canRecruit ? 'YES' : 'NO',
            producible: String(u.dynamicData?.producibleCount ?? 0),
            inQueue: String(u.dynamicData?.unitsInQueue ?? 0),
            queueCapRemaining: String(Math.max(0, globalQueueCapPerUnit - (u.dynamicData?.unitsInQueue ?? 0))),
            maxTotalRemaining,
        };
    });

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
        maxTotalRemaining: 'MaxTotalRemaining',
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
        maxTotalRemaining: getWidth('maxTotalRemaining'),
    } as const;

    const pad = (text: string, width: number): string => text.padEnd(width, ' ');

    const headerLine = `${pad(headers.unit, widths.unit)}  ${pad(headers.code, widths.code)}  ${pad(headers.inVillage.toString(), widths.inVillage)}  ${pad(headers.outside.toString(), widths.outside)}  ${pad(headers.total.toString(), widths.total)}  ${pad(headers.canRecruit, widths.canRecruit)}  ${pad(headers.producible, widths.producible)}  ${pad(headers.inQueue, widths.inQueue)}  ${pad(headers.queueCapRemaining, widths.queueCapRemaining)}  ${pad(headers.maxTotalRemaining.toString(), widths.maxTotalRemaining)}`;
    const sepLine = `${'-'.repeat(widths.unit)}  ${'-'.repeat(widths.code)}  ${'-'.repeat(widths.inVillage)}  ${'-'.repeat(widths.outside)}  ${'-'.repeat(widths.total)}  ${'-'.repeat(widths.canRecruit)}  ${'-'.repeat(widths.producible)}  ${'-'.repeat(widths.inQueue)}  ${'-'.repeat(widths.queueCapRemaining)}  ${'-'.repeat(widths.maxTotalRemaining)}`;
    const dataLines = rows
        .map((r: Row) => `${pad(r.unit, widths.unit)}  ${pad(r.code, widths.code)}  ${pad(r.inVillage.toString(), widths.inVillage)}  ${pad(r.outside.toString(), widths.outside)}  ${pad(r.total.toString(), widths.total)}  ${pad(r.canRecruit, widths.canRecruit)}  ${pad(r.producible, widths.producible)}  ${pad(r.inQueue, widths.inQueue)}  ${pad(r.queueCapRemaining, widths.queueCapRemaining)}  ${pad(r.maxTotalRemaining.toString(), widths.maxTotalRemaining)}`)
        .join('\n');

    const maxTotalPerUnitDisplay = maxTotalPerUnit !== null ? String(maxTotalPerUnit) : '∞';

    return [
        `📋 Units in production for ${villageDisplayName} | MaxTotalPerUnit=${maxTotalPerUnitDisplay} | MaxInQueuePerUnit=${globalQueueCapPerUnit}`,
        '```',
        headerLine,
        sepLine,
        dataLines,
        '```',
    ].join('\n');
}



