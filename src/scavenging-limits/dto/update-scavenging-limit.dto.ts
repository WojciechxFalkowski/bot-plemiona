import { PartialType } from '@nestjs/mapped-types';
import { CreateScavengingLimitDto } from './create-scavenging-limit.dto';

export class UpdateScavengingLimitDto extends PartialType(CreateScavengingLimitDto) {}
