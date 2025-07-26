import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpStatus, Logger, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { CreateServerDto, UpdateServerDto, UpdateServerCookiesDto, ServerResponseDto, ServerCookiesResponseDto } from './dto';
import {
    GetAllServersDecorators,
    GetActiveServersDecorators,
    GetServerByIdDecorators,
    GetServerByCodeDecorators,
    CreateServerDecorators,
    UpdateServerDecorators,
    DeleteServerDecorators,
    GetServerCookiesDecorators,
    UpdateServerCookiesDecorators,
    DeleteServerCookiesDecorators,
    IsServerActiveDecorators,
    IsServerActiveByCodeDecorators
} from './decorators';

@ApiTags('Servers')
@Controller('servers')
export class ServersController {
    private readonly logger = new Logger(ServersController.name);

    constructor(private readonly serversService: ServersService) { }

    @Get()
    @GetAllServersDecorators()
    async findAll(@Query('includeInactive') includeInactive?: boolean): Promise<ServerResponseDto[]> {
        this.logger.log(`Finding all servers (includeInactive: ${includeInactive})`);
        return this.serversService.findAll(includeInactive);
    }

    @Get('active')
    @GetActiveServersDecorators()
    async findActiveServers(): Promise<ServerResponseDto[]> {
        this.logger.log('Finding active servers');
        return this.serversService.findActiveServers();
    }

    @Get(':id')
    @GetServerByIdDecorators()
    async findById(@Param('id', ParseIntPipe) id: number): Promise<ServerResponseDto> {
        this.logger.log(`Finding server by ID: ${id}`);
        return this.serversService.findById(id);
    }

    @Get('code/:serverCode')
    @GetServerByCodeDecorators()
    async findByCode(@Param('serverCode') serverCode: string): Promise<ServerResponseDto> {
        this.logger.log(`Finding server by code: ${serverCode}`);
        return this.serversService.findByCode(serverCode);
    }

    @Post()
    @CreateServerDecorators()
    async create(@Body() createServerDto: CreateServerDto): Promise<ServerResponseDto> {
        this.logger.log(`Creating server: ${createServerDto.serverCode}`);
        return this.serversService.create(createServerDto);
    }

    @Put(':id')
    @UpdateServerDecorators()
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateServerDto: UpdateServerDto
    ): Promise<ServerResponseDto> {
        this.logger.log(`Updating server ID: ${id}`);
        return this.serversService.update(id, updateServerDto);
    }

    @Delete(':id')
    @DeleteServerDecorators()
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Deleting server ID: ${id}`);
        await this.serversService.delete(id);
    }

    // Cookies endpoints

    @Get(':id/cookies')
    @GetServerCookiesDecorators()
    async getServerCookies(@Param('id', ParseIntPipe) id: number): Promise<ServerCookiesResponseDto | null> {
        this.logger.log(`Getting cookies for server ID: ${id}`);
        return this.serversService.getServerCookies(id);
    }

    @Put(':id/cookies')
    @UpdateServerCookiesDecorators()
    async updateServerCookies(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCookiesDto: UpdateServerCookiesDto
    ): Promise<ServerCookiesResponseDto> {
        this.logger.log(`Updating cookies for server ID: ${id}`);
        return this.serversService.updateServerCookies(id, updateCookiesDto);
    }

    @Delete(':id/cookies')
    @DeleteServerCookiesDecorators()
    async deleteServerCookies(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Deleting cookies for server ID: ${id}`);
        await this.serversService.deleteServerCookies(id);
    }

    // Utility endpoints

    @Get(':id/active')
    @IsServerActiveDecorators()
    async isServerActive(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
        this.logger.log(`Checking if server ID ${id} is active`);
        return this.serversService.isServerActiveById(id);
    }

    @Get('code/:serverCode/active')
    @IsServerActiveByCodeDecorators()
    async isServerActiveByCode(@Param('serverCode') serverCode: string): Promise<boolean> {
        this.logger.log(`Checking if server ${serverCode} is active`);
        return this.serversService.isServerActiveByCode(serverCode);
    }
} 