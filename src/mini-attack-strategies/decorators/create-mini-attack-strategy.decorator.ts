import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateMiniAttackStrategyDto, MiniAttackStrategyResponseDto } from '../dto';

export const CreateMiniAttackStrategyDecorator = () => applyDecorators(
    ApiOperation({
        summary: 'Utwórz nową strategię mini ataków',
        description: 'Tworzy nową strategię mini ataków dla konkretnego serwera i wioski. Każda strategia definiuje skład jednostek używanych w pojedynczym mini ataku. Dla jednej wioski na serwerze może istnieć tylko jedna strategia.'
    }),
    ApiBody({
        type: CreateMiniAttackStrategyDto,
        description: 'Dane nowej strategii mini ataków. Wymagane jest podanie serverId i villageId. Wszystkie jednostki są opcjonalne i domyślnie ustawione na 0.',
        examples: {
            'spear-sword-strategy': {
                summary: 'Strategia: 2 pikinierzy + 2 miecznicy',
                description: 'Klasyczna strategia do mini ataków na wioski barbarzyńskie',
                value: {
                    serverId: 217,
                    villageId: '32005',
                    spear: 2,
                    sword: 2
                }
            },
            'light-cavalry-strategy': {
                summary: 'Strategia: 2 lekka kawaleria',
                description: 'Szybka strategia dla ataków na większe odległości',
                value: {
                    serverId: 217,
                    villageId: '32006',
                    light: 2
                }
            },
            'mixed-strategy': {
                summary: 'Strategia mieszana',
                description: 'Kombinacja różnych jednostek',
                value: {
                    serverId: 217,
                    villageId: '32007',
                    spear: 1,
                    sword: 1,
                    light: 1,
                    archer: 2
                }
            }
        }
    }),
    ApiResponse({
        status: 201,
        description: 'Strategia została pomyślnie utworzona',
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
        status: 400,
        description: 'Nieprawidłowe dane wejściowe - błędy walidacji',
        content: {
            'application/json': {
                example: {
                    statusCode: 400,
                    message: [
                        'serverId must be an integer number',
                        'villageId must be a string',
                        'spear must not be less than 0'
                    ],
                    error: 'Bad Request'
                }
            }
        }
    }),
    ApiResponse({
        status: 409,
        description: 'Strategia już istnieje dla tego serwera i wioski',
        content: {
            'application/json': {
                example: {
                    statusCode: 409,
                    message: 'Strategy already exists for server 217, village 32005',
                    error: 'Conflict'
                }
            }
        }
    })
); 