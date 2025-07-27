import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

export const GetActiveUnitsDecorator = () => applyDecorators(
    ApiOperation({
        summary: 'Pobierz aktywne jednostki ze strategii',
        description: 'Zwraca tylko jednostki z liczbą większą niż 0 ze strategii. Przydatne do szybkiego sprawdzenia, jakie jednostki są używane w danej strategii bez pobierania pełnych danych.'
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
        description: 'Aktywne jednostki zostały pomyślnie pobrane',
        content: {
            'application/json': {
                examples: {
                    'spear-sword-strategy': {
                        summary: 'Strategia pikinierzy + miecznicy',
                        description: 'Strategia używająca 2 pikinierów i 2 mieczników',
                        value: {
                            spear: 2,
                            sword: 2
                        }
                    },
                    'light-cavalry-strategy': {
                        summary: 'Strategia lekka kawaleria',
                        description: 'Strategia używająca tylko 2 lekkich kawalerzystów',
                        value: {
                            light: 2
                        }
                    },
                    'mixed-strategy': {
                        summary: 'Strategia mieszana',
                        description: 'Strategia używająca różnych typów jednostek',
                        value: {
                            spear: 1,
                            sword: 1,
                            archer: 3,
                            light: 1
                        }
                    },
                    'empty-strategy': {
                        summary: 'Strategia bez aktywnych jednostek',
                        description: 'Strategia gdzie wszystkie jednostki są ustawione na 0',
                        value: {}
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
    })
); 