import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MiniAttackStrategyResponseDto } from '../dto';

export const GetMiniAttackStrategyDecorator = () => applyDecorators(
    ApiOperation({
        summary: 'Pobierz strategię mini ataków',
        description: 'Zwraca strategię mini ataków dla konkretnego serwera i wioski. Strategia definiuje liczbę jednostek każdego typu używanych w mini ataku.'
    }),
    ApiParam({ 
        name: 'serverId', 
        description: 'ID serwera Plemion', 
        example: 217,
        type: 'number'
    }),
    ApiParam({ 
        name: 'villageId', 
        description: 'ID wioski w grze', 
        example: '32005',
        type: 'string'
    }),
    ApiResponse({
        status: 200,
        description: 'Strategia została pomyślnie pobrana',
        type: MiniAttackStrategyResponseDto,
        content: {
            'application/json': {
                example: {
                    serverId: 217,
                    villageId: '32005',
                    spear: 2,
                    sword: 2,
                    axe: 0,
                    archer: 0,
                    spy: 0,
                    light: 0,
                    marcher: 0,
                    heavy: 0,
                    ram: 0,
                    catapult: 0,
                    knight: 0,
                    snob: 0,
                    createdAt: '2025-01-26T12:00:00.000Z',
                    updatedAt: '2025-01-26T12:00:00.000Z'
                }
            }
        }
    }),
    ApiResponse({
        status: 404,
        description: 'Strategia nie została znaleziona dla podanego serwera i wioski',
        content: {
            'application/json': {
                example: {
                    statusCode: 404,
                    message: 'Strategy not found for server 217, village 32005',
                    error: 'Not Found'
                }
            }
        }
    })
); 