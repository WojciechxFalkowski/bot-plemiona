import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UpdateMiniAttackStrategyDto, MiniAttackStrategyResponseDto } from '../dto';

export const UpdateMiniAttackStrategyDecorator = () => applyDecorators(
    ApiOperation({
        summary: 'Aktualizuj strategię mini ataków',
        description: 'Aktualizuje istniejącą strategię mini ataków dla konkretnego serwera i wioski. Można aktualizować tylko wybrane jednostki - nie podane pola pozostaną bez zmian.'
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
    ApiBody({
        type: UpdateMiniAttackStrategyDto,
        description: 'Dane strategii do aktualizacji. Wszystkie pola są opcjonalne - zostaną zaktualizowane tylko podane jednostki.',
        examples: {
            'increase-spear': {
                summary: 'Zwiększ liczbę pikinierów',
                description: 'Zmiana liczby pikinierów z 2 na 3',
                value: {
                    spear: 3
                }
            },
            'add-light-cavalry': {
                summary: 'Dodaj lekką kawalerię',
                description: 'Dodanie 1 lekkiej kawalerii do istniejącej strategii',
                value: {
                    light: 1
                }
            },
            'remove-units': {
                summary: 'Usuń niektóre jednostki',
                description: 'Ustawienie jednostek na 0 aby je usunąć ze strategii',
                value: {
                    sword: 0,
                    archer: 0
                }
            },
            'major-update': {
                summary: 'Duża aktualizacja strategii',
                description: 'Zmiana kilku typów jednostek jednocześnie',
                value: {
                    spear: 1,
                    sword: 3,
                    light: 2,
                    archer: 0
                }
            }
        }
    }),
    ApiResponse({
        status: 200,
        description: 'Strategia została pomyślnie zaktualizowana',
        type: MiniAttackStrategyResponseDto,
        content: {
            'application/json': {
                example: {
                    serverId: 217,
                    villageId: '32005',
                    spear: 3,
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
                    updatedAt: '2025-01-26T13:30:00.000Z'
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
                        'spear must not be less than 0',
                        'sword must be an integer number'
                    ],
                    error: 'Bad Request'
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