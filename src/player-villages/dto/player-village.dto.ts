import { IsString, IsNumber, IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlayerVillageDto {
    @ApiProperty({ description: 'ID wioski gracza' })
    @IsNumber()
    id: number;

    @ApiProperty({ description: 'Target wioski' })
    @IsString()
    target: string;

    @ApiProperty({ description: 'ID serwera' })
    @IsNumber()
    serverId: number;

    @ApiProperty({ description: 'ID wioski w grze' })
    @IsString()
    villageId: string;

    @ApiProperty({ description: 'Nazwa wioski' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Współrzędna X' })
    @IsInt()
    @Min(0)
    @Max(1000)
    coordinateX: number;

    @ApiProperty({ description: 'Współrzędna Y' })
    @IsInt()
    @Min(0)
    @Max(1000)
    coordinateY: number;

    @ApiProperty({ description: 'Właściciel wioski' })
    @IsString()
    owner: string;

    @ApiProperty({ description: 'ID właściciela', required: false })
    @IsOptional()
    @IsString()
    ownerId?: string;

    @ApiProperty({ description: 'Plemię', required: false })
    @IsOptional()
    @IsString()
    tribe?: string;

    @ApiProperty({ description: 'ID plemienia', required: false })
    @IsOptional()
    @IsString()
    tribeId?: string;

    @ApiProperty({ description: 'Punkty wioski' })
    @IsInt()
    @Min(0)
    points: number;

    @ApiProperty({ description: 'Populacja wioski' })
    @IsInt()
    @Min(0)
    population: number;

    @ApiProperty({ description: 'Czy można atakować' })
    @IsBoolean()
    canAttack: boolean;

    @ApiProperty({ description: 'Data ostatniej weryfikacji', required: false })
    @IsOptional()
    lastVerified?: Date;

    @ApiProperty({ description: 'Data utworzenia' })
    createdAt: Date;

    @ApiProperty({ description: 'Data aktualizacji' })
    updatedAt: Date;
}
