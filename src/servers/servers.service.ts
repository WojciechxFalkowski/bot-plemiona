import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from './entities/server.entity';
import { ServerCookiesEntity } from './entities/server-cookies.entity';
import { CreateServerDto, UpdateServerDto, UpdateServerCookiesDto, ServerResponseDto, ServerCookiesResponseDto } from './dto';
import { SERVER_ENTITY_REPOSITORY, SERVER_COOKIES_ENTITY_REPOSITORY } from './servers.service.contracts';
import { SettingsService } from '@/settings/settings.service';
import {
    findAllServersOperation,
    findActiveServersOperation,
    findServerByIdOperation,
    findServerByCodeOperation,
    getServerNameOperation,
    getServerCodeOperation,
    createServerOperation,
    updateServerOperation,
    deleteServerOperation,
    getServerCookiesOperation,
    updateServerCookiesOperation,
    deleteServerCookiesOperation,
    isServerActiveByIdOperation,
    isServerActiveByCodeOperation
} from './operations';

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
        return findAllServersOperation(includeInactive, {
            serverRepository: this.serverRepo
        });
    }

    /**
     * Pobiera tylko aktywne serwery (dla orchestratora)
     */
    async findActiveServers(): Promise<ServerResponseDto[]> {
        return findActiveServersOperation({
            findAllServersDeps: {
                serverRepository: this.serverRepo
            }
        });
    }

    /**
     * Pobiera serwer po ID
     */
    async findById(id: number): Promise<ServerResponseDto> {
        return findServerByIdOperation(id, {
            serverRepository: this.serverRepo
        });
    }

    async getServerName(serverId: number): Promise<string> {
        return getServerNameOperation(serverId, {
            serverRepository: this.serverRepo
        });
    }

    async getServerCode(serverId: number): Promise<string> {
        return getServerCodeOperation(serverId, {
            serverRepository: this.serverRepo
        });
    }

    /**
     * Pobiera serwer po kodzie (np. pl216)
     */
    async findByCode(serverCode: string): Promise<ServerResponseDto> {
        return findServerByCodeOperation(serverCode, {
            serverRepository: this.serverRepo
        });
    }

    /**
     * Tworzy nowy serwer
     */
    async create(createServerDto: CreateServerDto): Promise<ServerResponseDto> {
        return createServerOperation(createServerDto, {
            serverRepository: this.serverRepo,
            createDefaultSettingsDeps: {
                settingsService: this.settingsService
            }
        });
    }

    /**
     * Aktualizuje serwer
     */
    async update(id: number, updateServerDto: UpdateServerDto): Promise<ServerResponseDto> {
        return updateServerOperation(id, updateServerDto, {
            serverRepository: this.serverRepo,
            findServerByIdDeps: {
                serverRepository: this.serverRepo
            }
        });
    }

    /**
     * Usuwa serwer
     */
    async delete(id: number): Promise<void> {
        return deleteServerOperation(id, {
            serverRepository: this.serverRepo
        });
    }

    /**
     * Pobiera cookies dla serwera
     */
    async getServerCookies(serverId: number): Promise<ServerCookiesResponseDto | null> {
        return getServerCookiesOperation(serverId, {
            serverRepository: this.serverRepo,
            serverCookiesRepository: this.serverCookiesRepo
        });
    }

    /**
     * Aktualizuje cookies dla serwera
     */
    async updateServerCookies(serverId: number, updateCookiesDto: UpdateServerCookiesDto): Promise<ServerCookiesResponseDto> {
        return updateServerCookiesOperation(serverId, updateCookiesDto, {
            serverRepository: this.serverRepo,
            serverCookiesRepository: this.serverCookiesRepo
        });
    }

    /**
     * Usuwa cookies dla serwera
     */
    async deleteServerCookies(serverId: number): Promise<void> {
        return deleteServerCookiesOperation(serverId, {
            serverCookiesRepository: this.serverCookiesRepo
        });
    }

    /**
     * Sprawdza czy serwer istnieje i jest aktywny
     */
    async isServerActiveById(serverId: number): Promise<boolean> {
        return isServerActiveByIdOperation(serverId, {
            serverRepository: this.serverRepo
        });
    }

    /**
     * Sprawdza czy serwer istnieje i jest aktywny po kodzie
     */
    async isServerActiveByCode(serverCode: string): Promise<boolean> {
        return isServerActiveByCodeOperation(serverCode, {
            serverRepository: this.serverRepo
        });
    }
}
