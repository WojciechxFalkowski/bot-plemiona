import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for building operations
 */
export class CreateBuildingCrawlerDto {
    /**
     * ID of the building (e.g. 'barracks', 'farm', 'wall')
     * @example 'barracks'
     */
    @IsString()
    @IsNotEmpty()
    buildingId: string;

    /**
     * Target level to upgrade the building to
     * @example 3
     */
    @IsInt()
    @Min(1)
    level: number;

    /**
     * Priority in the building queue (lower number = higher priority)
     * @example 1
     */
    @IsInt()
    @Min(1)
    priority: number;

    /**
     * Village ID or village name where to build
     * @example '12345' or 'Moja Wioska'
     */
    @IsString()
    @IsNotEmpty()
    village: string;
}