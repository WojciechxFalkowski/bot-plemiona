import { IsInt, IsString, Min } from 'class-validator';

export class CreateScavengingLimitDto {
    @IsInt()
    serverId: number;

    @IsString()
    villageId: string;

    @IsInt()
    @Min(0)
    maxSpearUnits: number;
}
