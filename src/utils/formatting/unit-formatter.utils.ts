import { Logger } from '@nestjs/common';

interface LogUnitsTableOptions {
    hideZeros?: boolean;
    logLevel?: 'debug' | 'log' | 'warn' | 'error';
    unitOrder?: string[];
}

export class UnitFormatter {
    private static logger = new Logger(UnitFormatter.name);

    /**
     * Formatuje i loguje jednostki w formie tabelki ASCII
     * @param units Obiekt z jednostkami (Record<string, number> lub Partial<Record<string, number>>)
     * @param title Opcjonalny tytuł tabelki
     * @param options Opcje formatowania
     */
    static logUnitsTable(
        units: Record<string, number> | Partial<Record<string, number>>,
        title?: string,
        options: LogUnitsTableOptions = {}
    ): void {
        const { hideZeros = false, logLevel = 'debug', unitOrder } = options;

        // Obsługa pustego obiektu
        if (!units || Object.keys(units).length === 0) {
            const message = title ? `${title}: (No units data)` : '(No units data)';
            this.logByLevel(message, logLevel);
            return;
        }

        // Przygotuj dane do wyświetlenia
        let unitsToDisplay: Array<{ name: string; value: number }> = [];

        // Określ kolejność jednostek
        const order = unitOrder || Object.keys(units);

        // Zbierz jednostki w określonej kolejności
        for (const unitName of order) {
            const value = units[unitName] ?? 0;
            
            // Jeśli hideZeros jest true, pomiń jednostki z wartością 0
            if (hideZeros && value === 0) {
                continue;
            }

            unitsToDisplay.push({ name: unitName, value });
        }

        // Jeśli po filtrowaniu nie ma jednostek do wyświetlenia
        if (unitsToDisplay.length === 0) {
            const message = title ? `${title}: (No available units)` : '(No available units)';
            this.logByLevel(message, logLevel);
            return;
        }

        // Oblicz szerokość każdej kolumny
        const columnWidths = unitsToDisplay.map(unit => {
            const nameWidth = unit.name.length;
            const valueWidth = unit.value.toString().length;
            return Math.max(nameWidth, valueWidth, 4); // Minimum 4 znaki dla czytelności
        });

        // Zbuduj tabelkę
        const table = this.buildTable(unitsToDisplay, columnWidths, title);

        // Wyświetl tabelkę używając odpowiedniego poziomu logowania
        this.logByLevel(table, logLevel);
    }

    /**
     * Buduje tabelkę ASCII z jednostkami
     */
    private static buildTable(
        units: Array<{ name: string; value: number }>,
        columnWidths: number[],
        title?: string
    ): string {
        const lines: string[] = [];

        // Tytuł (jeśli podany)
        if (title) {
            lines.push(title + ':');
        }

        // Górna krawędź
        const topBorder = '┌' + columnWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
        lines.push(topBorder);

        // Wiersz z nazwami jednostek
        const headerRow = '│' + units.map((unit, i) => {
            const padded = unit.name.padEnd(columnWidths[i], ' ');
            return ` ${padded} `;
        }).join('│') + '│';
        lines.push(headerRow);

        // Separator między nagłówkiem a danymi
        const separator = '├' + columnWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
        lines.push(separator);

        // Wiersz z wartościami
        const dataRow = '│' + units.map((unit, i) => {
            const valueStr = unit.value.toString();
            const padded = valueStr.padStart(columnWidths[i], ' ');
            return ` ${padded} `;
        }).join('│') + '│';
        lines.push(dataRow);

        // Dolna krawędź
        const bottomBorder = '└' + columnWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
        lines.push(bottomBorder);

        return lines.join('\n');
    }

    /**
     * Formatuje i loguje statusy poziomów zbieractwa w formie tabelki ASCII
     * @param statuses Tablica statusów poziomów
     * @param title Opcjonalny tytuł tabelki
     * @param options Opcje formatowania
     */
    static logLevelsStatusTable(
        statuses: Array<{ level: number; isLocked: boolean; isUnlocking: boolean; isBusy: boolean; isAvailable: boolean }>,
        title?: string,
        options: { logLevel?: 'debug' | 'log' | 'warn' | 'error' } = {}
    ): void {
        const { logLevel = 'debug' } = options;

        if (!statuses || statuses.length === 0) {
            const message = title ? `${title}: (No levels data)` : '(No levels data)';
            this.logByLevel(message, logLevel);
            return;
        }

        const headers = ['Level', 'Locked', 'Unlocking', 'Busy', 'Available'];
        const rows = statuses.map(status => [
            status.level.toString(),
            status.isLocked.toString(),
            status.isUnlocking.toString(),
            status.isBusy.toString(),
            status.isAvailable.toString()
        ]);

        const table = this.buildMultiRowTable(headers, rows, title);
        this.logByLevel(table, logLevel);
    }

    /**
     * Formatuje i loguje dane czasowe poziomów zbieractwa w formie tabelki ASCII
     * @param levels Tablica danych czasowych poziomów
     * @param title Opcjonalny tytuł tabelki
     * @param options Opcje formatowania
     */
    static logLevelsTimeTable(
        levels: Array<{ level: number; status: string; timeRemaining: string | null; timeRemainingSeconds: number; estimatedCompletionTime?: Date }>,
        title?: string,
        options: { logLevel?: 'debug' | 'log' | 'warn' | 'error' } = {}
    ): void {
        const { logLevel = 'debug' } = options;

        if (!levels || levels.length === 0) {
            const message = title ? `${title}: (No levels data)` : '(No levels data)';
            this.logByLevel(message, logLevel);
            return;
        }

        const headers = ['Level', 'Status', 'Time Rem.', 'Time Rem. (seconds)', 'Estimated Completion'];
        const rows = levels.map(level => {
            const timeRemainingStr = level.timeRemaining || '-';
            const timeRemainingSecondsStr = level.timeRemainingSeconds > 0 ? level.timeRemainingSeconds.toString() : '-';
            const estimatedCompletionStr = level.estimatedCompletionTime
                ? level.estimatedCompletionTime.toISOString().replace('T', ' ').substring(0, 19)
                : '-';

            return [
                level.level.toString(),
                level.status,
                timeRemainingStr,
                timeRemainingSecondsStr,
                estimatedCompletionStr
            ];
        });

        const table = this.buildMultiRowTable(headers, rows, title);
        this.logByLevel(table, logLevel);
    }

    /**
     * Buduje tabelkę ASCII z wieloma wierszami danych
     * @param headers Nagłówki kolumn
     * @param rows Wiersze danych (każdy wiersz to tablica wartości)
     * @param title Opcjonalny tytuł tabelki
     */
    private static buildMultiRowTable(
        headers: string[],
        rows: string[][],
        title?: string
    ): string {
        if (rows.length === 0) {
            return title ? `${title}: (No data)` : '(No data)';
        }

        // Oblicz szerokość każdej kolumny
        const columnWidths = headers.map((header, colIndex) => {
            const headerWidth = header.length;
            const maxDataWidth = rows.reduce((max, row) => {
                const cellValue = row[colIndex] || '';
                return Math.max(max, cellValue.length);
            }, 0);
            return Math.max(headerWidth, maxDataWidth, 4); // Minimum 4 znaki
        });

        const lines: string[] = [];

        // Tytuł (jeśli podany)
        if (title) {
            lines.push(title + ':');
        }

        // Górna krawędź
        const topBorder = '┌' + columnWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
        lines.push(topBorder);

        // Wiersz nagłówków
        const headerRow = '│' + headers.map((header, i) => {
            const padded = header.padEnd(columnWidths[i], ' ');
            return ` ${padded} `;
        }).join('│') + '│';
        lines.push(headerRow);

        // Separator między nagłówkiem a danymi
        const separator = '├' + columnWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
        lines.push(separator);

        // Wiersze danych
        for (const row of rows) {
            const dataRow = '│' + row.map((cell, i) => {
                const cellValue = cell || '-';
                // Dla kolumny Level - wyrównaj do prawej, dla reszty do lewej
                const padded = i === 0 
                    ? cellValue.padStart(columnWidths[i], ' ')
                    : cellValue.padEnd(columnWidths[i], ' ');
                return ` ${padded} `;
            }).join('│') + '│';
            lines.push(dataRow);
        }

        // Dolna krawędź
        const bottomBorder = '└' + columnWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
        lines.push(bottomBorder);

        return lines.join('\n');
    }

    /**
     * Loguje wiadomość używając odpowiedniego poziomu logowania
     */
    private static logByLevel(message: string, level: 'debug' | 'log' | 'warn' | 'error'): void {
        switch (level) {
            case 'debug':
                this.logger.debug(message);
                break;
            case 'log':
                this.logger.log(message);
                break;
            case 'warn':
                this.logger.warn(message);
                break;
            case 'error':
                this.logger.error(message);
                break;
        }
    }
}

