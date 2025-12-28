import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { SendSupportDto } from '../dto';

/**
 * Swagger decorators for POST /api/support/send endpoint (queued)
 */
export function SendSupportDecorators() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: 'Dodaje zadanie wysłania wsparcia do kolejki',
      description: `
        Dodaje zadanie wysłania wsparcia do kolejki manualnych zadań.
        Zadanie zostanie wykonane przez orchestrator gdy będzie to bezpieczne
        (nie zakłóci innych sesji przeglądarki).
        
        Proces:
        1. Walidacja danych wejściowych
        2. Dodanie zadania do kolejki manualnych zadań
        3. Zwrot ID zadania i pozycji w kolejce
        4. Wykonanie przez orchestrator (asynchroniczne)
      `,
    }),
    ApiBody({
      type: SendSupportDto,
      description: 'Dane do wysłania wsparcia',
      examples: {
        example1: {
          summary: 'Przykład wysłania 50 paczek z 3 wiosek',
          value: {
            serverId: 218,
            targetVillageId: 30707,
            allocations: [
              {
                villageName: '0001 Główna',
                villageId: '26972',
                coordinates: '549|582',
                packagesFromVillage: 20,
                spearToSend: 2000,
                swordToSend: 2000,
              },
              {
                villageName: '0002 Druga',
                villageId: '14021',
                coordinates: '547|580',
                packagesFromVillage: 20,
                spearToSend: 2000,
                swordToSend: 2000,
              },
              {
                villageName: '0003 Trzecia',
                villageId: '15789',
                coordinates: '549|580',
                packagesFromVillage: 10,
                spearToSend: 1000,
                swordToSend: 1000,
              },
            ],
            totalPackages: 50,
            packageSize: 100,
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Zadanie dodane do kolejki',
      schema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Unikalny identyfikator zadania (UUID)',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          queuePosition: {
            type: 'number',
            description: 'Pozycja w kolejce (1-based)',
            example: 1,
          },
          estimatedWaitTime: {
            type: 'number',
            description: 'Szacowany czas oczekiwania w sekundach',
            example: 0,
          },
          message: {
            type: 'string',
            description: 'Komunikat statusowy',
            example: 'Zadanie wysłania wsparcia dodane do kolejki. Rozpocznie się wkrótce.',
          },
          totalAllocations: {
            type: 'number',
            description: 'Całkowita liczba przydziałów (wiosek)',
            example: 3,
          },
          targetVillageId: {
            type: 'number',
            description: 'ID wioski docelowej',
            example: 30707,
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Nieprawidłowe dane wejściowe (validation error)',
    }),
    ApiResponse({
      status: 404,
      description: 'Serwer nie został znaleziony',
    }),
    ApiResponse({
      status: 500,
      description: 'Błąd serwera podczas dodawania do kolejki',
    }),
  );
}

/**
 * Swagger decorators for POST /api/support/send-direct endpoint
 */
export function SendSupportDirectDecorators() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: 'Wysyła wsparcie bezpośrednio (pomija kolejkę)',
      description: `
        ⚠️ UWAGA: Ta operacja pomija kolejkę i może zakłócić inne sesje przeglądarki!
        Używaj tylko w sytuacjach awaryjnych lub do testów.
        
        Wysyła wsparcie (pikinierów i mieczników) z wielu wiosek źródłowych do jednej wioski docelowej.
        
        Proces:
        1. Logowanie do gry Tribal Wars
        2. Dla każdej wioski w tablicy allocations:
           - Nawigacja do ekranu place z target=targetVillageId
           - Wpisanie liczby pikinierów i mieczników
           - Kliknięcie przycisku "Pomoc" (#target_support)
           - Potwierdzenie na stronie confirmation
        3. Zwrot podsumowania: ile wysłano, ile nie udało się
      `,
    }),
    ApiBody({
      type: SendSupportDto,
      description: 'Dane do wysłania wsparcia',
    }),
    ApiResponse({
      status: 200,
      description: 'Wsparcie wysłane (całkowicie lub częściowo)',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Czy wszystkie wysyłki zakończyły się powodzeniem',
          },
          message: {
            type: 'string',
            description: 'Opis wyniku operacji',
          },
          totalAllocations: {
            type: 'number',
            description: 'Całkowita liczba przydziałów (wiosek)',
          },
          successfulDispatches: {
            type: 'number',
            description: 'Liczba udanych wysyłek',
          },
          failedDispatches: {
            type: 'number',
            description: 'Liczba nieudanych wysyłek',
          },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                villageId: { type: 'string' },
                villageName: { type: 'string' },
                success: { type: 'boolean' },
                spearSent: { type: 'number' },
                swordSent: { type: 'number' },
                error: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Nieprawidłowe dane wejściowe (validation error)',
    }),
  );
}

/**
 * Swagger decorators for GET /api/support/task/:taskId endpoint
 */
export function GetTaskStatusDecorators() {
  return applyDecorators(
    ApiOperation({
      summary: 'Pobiera status zadania wysyłania wsparcia',
      description: 'Zwraca aktualny status zadania na podstawie jego ID.',
    }),
    ApiParam({
      name: 'taskId',
      description: 'ID zadania (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Status zadania',
      schema: {
        type: 'object',
        properties: {
          found: {
            type: 'boolean',
            description: 'Czy zadanie zostało znalezione',
          },
          message: {
            type: 'string',
            description: 'Komunikat (tylko gdy nie znaleziono)',
          },
          task: {
            type: 'object',
            description: 'Dane zadania (tylko gdy znaleziono)',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['sendSupport', 'fetchVillageUnits'] },
              serverId: { type: 'number' },
              status: { type: 'string', enum: ['pending', 'executing', 'completed', 'failed'] },
              queuedAt: { type: 'string', format: 'date-time' },
              scheduledFor: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              error: { type: 'string', nullable: true },
            },
          },
        },
      },
    }),
  );
}

