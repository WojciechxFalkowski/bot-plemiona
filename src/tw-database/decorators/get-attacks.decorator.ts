import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

/**
 * Swagger decorators for GET /api/tw-database/attacks endpoint
 */
export function GetAttacksDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Pobiera listę ataków TW Database',
            description: 'Zwraca ataki z filtrem po serverId i opcjonalnie status (pending/sent/failed)',
        }),
        ApiQuery({
            name: 'serverId',
            required: true,
            type: Number,
            description: 'ID serwera (wymagany)',
        }),
        ApiQuery({
            name: 'status',
            required: false,
            enum: ['pending', 'sent', 'failed'],
            description: 'Filtr statusu ataku',
        }),
        ApiResponse({
            status: 200,
            description: 'Lista ataków z danymi szczegółowymi',
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'number' },
                                fingerprint: { type: 'string' },
                                status: { type: 'string', enum: ['pending', 'sent', 'failed'] },
                                sentAt: { type: 'string', format: 'date-time', nullable: true },
                                failureReason: { type: 'string', nullable: true },
                                clearedFromTwDatabase: { type: 'boolean' },
                                createdAt: { type: 'string', format: 'date-time' },
                                details: {
                                    type: 'object',
                                    properties: {
                                        lp: { type: 'string', nullable: true },
                                        etykietaAtaku: { type: 'string', nullable: true },
                                        wioskaWysylajaca: { type: 'string', nullable: true },
                                        wioskaDocelowa: { type: 'string', nullable: true },
                                        czasDoWysylki: { type: 'string', nullable: true },
                                        akcjaUrl: { type: 'string', nullable: true },
                                        attackType: { type: 'string', nullable: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowy serverId',
        }),
    );
}
