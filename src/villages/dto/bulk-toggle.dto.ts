import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BulkToggleDto {
    @ApiProperty({
        description: 'Whether to enable or disable the setting for all villages',
        example: true
    })
    @IsBoolean()
    enabled: boolean;
}
