import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from './entities/server.entity';
import { ServerCookiesEntity } from './entities/server-cookies.entity';
import { CreateServerDto, UpdateServerDto, UpdateServerCookiesDto, ServerResponseDto, ServerCookiesResponseDto } from './dto';
import { SERVER_ENTITY_REPOSITORY, SERVER_COOKIES_ENTITY_REPOSITORY } from './servers.service.contracts';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';

@Injectable()
export class ServersService {
    constructor(
        @Inject(SERVER_ENTITY_REPOSITORY)
        private readonly serverRepo: Repository<ServerEntity>,
        @Inject(SERVER_COOKIES_ENTITY_REPOSITORY)
        private readonly serverCookiesRepo: Repository<ServerCookiesEntity>,
        private readonly settingsService: SettingsService,
    ) { }

    /**
     * Pobiera wszystkie serwery
     */
    async findAll(includeInactive: boolean = false): Promise<ServerResponseDto[]> {
        const queryBuilder = this.serverRepo.createQueryBuilder('server')
            .leftJoinAndSelect('server.cookies', 'cookies');

        if (!includeInactive) {
            queryBuilder.where('server.isActive = :isActive', { isActive: true });
        }

        const servers = await queryBuilder
            .orderBy('server.id', 'ASC')
            .getMany();

        return servers.map(server => this.mapToResponseDto(server));
    }

    /**
     * Pobiera tylko aktywne serwery (dla orchestratora)
     */
    async findActiveServers(): Promise<ServerResponseDto[]> {
        return this.findAll(false);
    }

    /**
     * Pobiera serwer po ID
     */
    async findById(id: number): Promise<ServerResponseDto> {
        const server = await this.serverRepo.findOne({
            where: { id },
            relations: ['cookies']
        });

        if (!server) {
            throw new NotFoundException(`Server with ID ${id} not found`);
        }

        return this.mapToResponseDto(server);
    }

    async getServerName(serverId: number): Promise<string> {
        const server = await this.serverRepo.findOne({ where: { id: serverId } });
        return server?.serverName || '';
    }

    async getServerCode(serverId: number): Promise<string> {
        const server = await this.serverRepo.findOne({ where: { id: serverId } });
        return server?.serverCode || '';
    }

    /**
     * Pobiera serwer po kodzie (np. pl216)
     */
    async findByCode(serverCode: string): Promise<ServerResponseDto> {
        const server = await this.serverRepo.findOne({
            where: { serverCode },
            relations: ['cookies']
        });

        if (!server) {
            throw new NotFoundException(`Server with code ${serverCode} not found`);
        }

        return this.mapToResponseDto(server);
    }

    /**
     * Tworzy nowy serwer
     */
    async create(createServerDto: CreateServerDto): Promise<ServerResponseDto> {
        // Sprawdź czy serwer o podanym ID już istnieje
        const existingServerById = await this.serverRepo.findOne({
            where: { id: createServerDto.id }
        });

        if (existingServerById) {
            throw new ConflictException(`Server with ID ${createServerDto.id} already exists`);
        }

        // Sprawdź czy serwer o podanym kodzie już istnieje
        const existingServerByCode = await this.serverRepo.findOne({
            where: { serverCode: createServerDto.serverCode }
        });

        if (existingServerByCode) {
            throw new ConflictException(`Server with code ${createServerDto.serverCode} already exists`);
        }

        const server = this.serverRepo.create({
            id: createServerDto.id,
            serverCode: createServerDto.serverCode,
            serverName: createServerDto.serverName,
            isActive: createServerDto.isActive ?? true
        });

        const savedServer = await this.serverRepo.save(server);

        // Utwórz domyślne ustawienia dla nowego serwera
        await this.createDefaultSettings(savedServer.id);

        return this.mapToResponseDto(savedServer);
    }

    /**
     * Aktualizuje serwer
     */
    async update(id: number, updateServerDto: UpdateServerDto): Promise<ServerResponseDto> {
        const server = await this.serverRepo.findOne({ where: { id } });

        if (!server) {
            throw new NotFoundException(`Server with ID ${id} not found`);
        }

        // Sprawdź czy nowy kod serwera nie jest już zajęty
        if (updateServerDto.serverCode && updateServerDto.serverCode !== server.serverCode) {
            const existingServer = await this.serverRepo.findOne({
                where: { serverCode: updateServerDto.serverCode }
            });

            if (existingServer) {
                throw new ConflictException(`Server with code ${updateServerDto.serverCode} already exists`);
            }
        }

        Object.assign(server, updateServerDto);
        const updatedServer = await this.serverRepo.save(server);

        return this.findById(updatedServer.id);
    }

    /**
     * Usuwa serwer
     */
    async delete(id: number): Promise<void> {
        const server = await this.serverRepo.findOne({ where: { id } });

        if (!server) {
            throw new NotFoundException(`Server with ID ${id} not found`);
        }

        await this.serverRepo.remove(server);
    }

    /**
     * Pobiera cookies dla serwera
     */
    async getServerCookies(serverId: number): Promise<ServerCookiesResponseDto | null> {
        const server = await this.serverRepo.findOne({ where: { id: serverId } });

        if (!server) {
            throw new NotFoundException(`Server with ID ${serverId} not found`);
        }

        const cookies = await this.serverCookiesRepo.findOne({
            where: { serverId }
        });

        return cookies ? this.mapToCookiesResponseDto(cookies) : null;
    }

    /**
     * Aktualizuje cookies dla serwera
     */
    async updateServerCookies(serverId: number, updateCookiesDto: UpdateServerCookiesDto): Promise<ServerCookiesResponseDto> {
        const server = await this.serverRepo.findOne({ where: { id: serverId } });

        if (!server) {
            throw new NotFoundException(`Server with ID ${serverId} not found`);
        }

        let cookies = await this.serverCookiesRepo.findOne({
            where: { serverId }
        });

        if (cookies) {
            cookies.cookiesData = updateCookiesDto.cookiesData ?? null;
        } else {
            cookies = this.serverCookiesRepo.create({
                serverId,
                cookiesData: updateCookiesDto.cookiesData ?? null
            });
        }

        const savedCookies = await this.serverCookiesRepo.save(cookies);
        return this.mapToCookiesResponseDto(savedCookies);
    }

    /**
     * Usuwa cookies dla serwera
     */
    async deleteServerCookies(serverId: number): Promise<void> {
        const cookies = await this.serverCookiesRepo.findOne({
            where: { serverId }
        });

        if (cookies) {
            await this.serverCookiesRepo.remove(cookies);
        }
    }

    /**
     * Sprawdza czy serwer istnieje i jest aktywny
     */
    async isServerActiveById(serverId: number): Promise<boolean> {
        const server = await this.serverRepo.findOne({
            where: { id: serverId, isActive: true }
        });
        return !!server;
    }

    /**
     * Sprawdza czy serwer istnieje i jest aktywny po kodzie
     */
    async isServerActiveByCode(serverCode: string): Promise<boolean> {
        const server = await this.serverRepo.findOne({
            where: { serverCode, isActive: true }
        });
        return !!server;
    }

    /**
     * Tworzy domyślne ustawienia dla nowego serwera
     */
    private async createDefaultSettings(serverId: number): Promise<void> {

        const defaultSettings = [
            { key: SettingsKey.PLEMIONA_COOKIES, value: [] },
            { key: SettingsKey.AUTO_SCAVENGING_ENABLED, value: { value: false } },
            { key: SettingsKey.AUTO_CONSTRUCTION_QUEUE_ENABLED, value: { value: false } },
            { key: SettingsKey.CRAWLER_ORCHESTRATOR_ENABLED, value: { value: false } },
            { key: SettingsKey.MINI_ATTACKS_ENABLED, value: { value: false } },
            { key: SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, value: { value: 0 } },
            { key: SettingsKey.MINI_ATTACKS_VILLAGE_ID, value: { value: null } },
            { key: SettingsKey.MINI_ATTACKS_MIN_INTERVAL, value: { value: 10 } }, // 10 minutes
            { key: SettingsKey.MINI_ATTACKS_MAX_INTERVAL, value: { value: 15 } }, // 15 minutes
        ];

        // Tworzenie ustawień równolegle dla lepszej wydajności
        await Promise.all(
            defaultSettings.map(setting =>
                this.settingsService.setSetting(serverId, setting.key, setting.value)
            )
        );
    }

    /**
     * Mapuje entity na response DTO
     */
    private mapToResponseDto(server: ServerEntity): ServerResponseDto {
        return {
            id: server.id,
            serverCode: server.serverCode,
            serverName: server.serverName,
            isActive: server.isActive,
            createdAt: server.createdAt,
            updatedAt: server.updatedAt,
            cookies: server.cookies ? this.mapToCookiesResponseDto(server.cookies) : undefined
        };
    }

    /**
     * Mapuje cookies entity na response DTO
     */
    private mapToCookiesResponseDto(cookies: ServerCookiesEntity): ServerCookiesResponseDto {
        return {
            serverId: cookies.serverId,
            cookiesData: cookies.cookiesData,
            createdAt: cookies.createdAt,
            updatedAt: cookies.updatedAt
        };
    }
} 