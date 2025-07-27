import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

export const DeleteMiniAttackStrategyDecorator = () => applyDecorators(
    ApiOperation({
        summary: 'Usuń strategię mini ataków',
        description: 'Usuwa strategię mini ataków dla konkretnego serwera i wioski. Ta operacja jest nieodwracalna - po usunięciu strategii będzie trzeba ją utworzyć ponownie.'
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
        description: 'Strategia została pomyślnie usunięta',
        content: {
            'application/json': {
                example: {
                    message: 'Strategy deleted successfully'
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