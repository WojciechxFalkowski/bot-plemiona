import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BarbarianVillagesService } from './barbarian-villages.service';
import { CreateBarbarianVillageDto, UpdateBarbarianVillageDto } from './dto';
import {
  GetAllBarbarianVillagesDecorators,
  GetBarbarianVillageDecorators,
  CreateBarbarianVillageDecorators,
  UpdateBarbarianVillageDecorators,
  DeleteBarbarianVillageDecorators
} from './decorators';

@ApiTags('Barbarian Villages')
@Controller('barbarian-villages')
export class BarbarianVillagesController {
  constructor(
    private readonly barbarianVillagesService: BarbarianVillagesService
  ) {}

  @Get()
  @GetAllBarbarianVillagesDecorators()
  async findAll() {
    return await this.barbarianVillagesService.findAll();
  }

  @Get(':target')
  @GetBarbarianVillageDecorators()
  async findOne(@Param('target') target: string) {
    return await this.barbarianVillagesService.findOne(target);
  }

  @Post()
  @CreateBarbarianVillageDecorators()
  async create(@Body() createBarbarianVillageDto: CreateBarbarianVillageDto) {
    return await this.barbarianVillagesService.create(createBarbarianVillageDto);
  }

  @Put(':target')
  @UpdateBarbarianVillageDecorators()
  async update(
    @Param('target') target: string,
    @Body() updateBarbarianVillageDto: UpdateBarbarianVillageDto
  ) {
    return await this.barbarianVillagesService.update(target, updateBarbarianVillageDto);
  }

  @Delete(':target')
  @DeleteBarbarianVillageDecorators()
  async remove(@Param('target') target: string) {
    await this.barbarianVillagesService.remove(target);
    return { message: `Barbarian village ${target} deleted successfully` };
  }
} 