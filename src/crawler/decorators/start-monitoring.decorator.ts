import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const StartMonitoringDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Manually start orchestrator monitoring',
            description: `Manually triggers the orchestrator monitoring check. This is useful when:
            
            • The application starts with no servers having CRAWLER_ORCHESTRATOR_ENABLED=true
            • Later, you enable the orchestrator for a server using settings API
            • You need to force the orchestrator to detect the change immediately
            
            **Typical workflow:**
            1. Application starts with orchestrator disabled
            2. Enable orchestrator: \`POST /api/settings/{serverId}/CRAWLER_ORCHESTRATOR_ENABLED\` with \`{"value": true}\`
            3. Call this endpoint to force monitoring check
            4. Orchestrator will start if any server has it enabled
            
            **Note:** The monitoring runs automatically every 3 minutes, but this endpoint allows immediate response to setting changes.`
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Monitoring check completed successfully',
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Monitoring check completed successfully' },
                    orchestratorStatus: {
                        type: 'string',
                        example: 'started',
                        description: 'Current orchestrator status after the check'
                    }
                }
            }
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Internal server error during monitoring check'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}; 