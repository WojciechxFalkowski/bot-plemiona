import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SendSupportDto } from '../dto';

/**
 * Swagger decorators for POST /api/support/send endpoint
 */
export function SendSupportDecorators() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: 'Wysyła wsparcie do wioski docelowej',
      description: `
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
    ApiResponse({
      status: 404,
      description: 'Serwer nie został znaleziony',
    }),
    ApiResponse({
      status: 500,
      description: 'Błąd serwera podczas wysyłania wsparcia',
    }),
  );
}

