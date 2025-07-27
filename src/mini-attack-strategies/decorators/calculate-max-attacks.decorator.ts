import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CalculateAttacksRequestDto, CalculateAttacksResponseDto } from '../dto';

export const CalculateMaxAttacksDecorator = () => applyDecorators(
    ApiOperation({
        summary: 'Oblicz maksymalną liczbę ataków',
        description: 'Kalkuluje maksymalną liczbę mini ataków na podstawie dostępnych jednostek w wiosce i zdefiniowanej strategii. System automatycznie znajdzie jednostkę ograniczającą (bottleneck) i obliczy ile ataków można wysłać.'
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
        type: CalculateAttacksRequestDto,
        description: 'Dostępne jednostki w wiosce. Podaj liczbę jednostek każdego typu, które są aktualnie dostępne do wysłania w atakach.',
        examples: {
            'basic-calculation': {
                summary: 'Podstawowa kalkulacja',
                description: 'Strategia: 2 pikinierów + 2 mieczników, dostępne: 10 pikinierów, 8 mieczników',
                value: {
                    availableSpear: 10,
                    availableSword: 8
                }
            },
            'cavalry-calculation': {
                summary: 'Kalkulacja z kawalerią',
                description: 'Strategia z lekką kawalerią',
                value: {
                    availableLight: 6,
                    availableSpear: 15
                }
            },
            'mixed-army-calculation': {
                summary: 'Kalkulacja mieszanej armii',
                description: 'Różne jednostki dostępne w wiosce',
                value: {
                    availableSpear: 25,
                    availableSword: 12,
                    availableAxe: 5,
                    availableArcher: 8,
                    availableLight: 4,
                    availableHeavy: 2
                }
            }
        }
    }),
    ApiResponse({
        status: 200,
        description: 'Kalkulacja została pomyślnie wykonana',
        type: CalculateAttacksResponseDto,
        content: {
            'application/json': {
                example: {
                    maxAttacks: 4,
                    bottleneckUnit: 'sword',
                    bottleneckUnitPL: 'Miecznik',
                    availableBottleneckUnits: 8,
                    requiredBottleneckUnits: 2,
                    calculationDetails: {
                        spear: {
                            available: 10,
                            required: 2,
                            maxAttacks: 5
                        },
                        sword: {
                            available: 8,
                            required: 2,
                            maxAttacks: 4
                        },
                        axe: {
                            available: 0,
                            required: 0,
                            maxAttacks: null
                        }
                    }
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
    }),
    ApiResponse({
        status: 400,
        description: 'Nieprawidłowe dane wejściowe - błędy walidacji',
        content: {
            'application/json': {
                example: {
                    statusCode: 400,
                    message: [
                        'availableSpear must not be less than 0',
                        'availableSword must be an integer number'
                    ],
                    error: 'Bad Request'
                }
            }
        }
    })
); 