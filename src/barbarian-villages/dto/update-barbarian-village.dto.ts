import { PartialType } from '@nestjs/swagger';
import { CreateBarbarianVillageDto } from './create-barbarian-village.dto';
import { OmitType } from '@nestjs/swagger';

/**
 * Data transfer object for updating a barbarian village
 * All fields are optional except target which cannot be changed
 */
export class UpdateBarbarianVillageDto extends PartialType(
    OmitType(CreateBarbarianVillageDto, ['target'] as const)
) {} 