import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

/**
 * Swagger decorators for GET /api/tw-database/visit-attack-planner endpoint
 */
export function VisitAttackPlannerDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Odwiedza stronę TWDatabase Attack Planner',
            description: `
                Szybki example - uruchamia Playwright, wchodzi na https://twdatabase.online/AttackPlanner/Show,
                odczytuje tytuł strony i zamyka przeglądarkę.
                
                Docelowo ma być zintegrowane w crawlera uruchamianego cyklicznie (np. co 30 minut).
            `,
        }),
        ApiQuery({
            name: 'headless',
            required: false,
            type: Boolean,
            description: 'Tryb headless przeglądarki (domyślnie true)',
        }),
        ApiResponse({
            status: 200,
            description: 'Strona odwiedzona pomyślnie (z logowaniem jeśli wymagane)',
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    loggedIn: { type: 'boolean', description: 'Czy udało się zalogować' },
                    pageTitle: { type: 'string', nullable: true },
                    url: { type: 'string' },
                    durationMs: { type: 'number' },
                    message: { type: 'string' },
                },
            },
        }),
        ApiResponse({
            status: 500,
            description: 'Błąd podczas otwierania strony (np. timeout, błąd Playwright)',
        }),
    );
}
