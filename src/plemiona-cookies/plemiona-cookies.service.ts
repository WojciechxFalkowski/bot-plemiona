import { Inject, Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PlemionaCookiesEntity } from './entities/plemiona-cookies.entity';
import { UpdatePlemionaCookiesDto, PlemionaCookieResponseDto } from './dto';
import { PLEMIONA_COOKIES_ENTITY_REPOSITORY } from './plemiona-cookies.service.contracts';

@Injectable()
export class PlemionaCookiesService {
    private readonly logger = new Logger(PlemionaCookiesService.name);

    constructor(
        @Inject(PLEMIONA_COOKIES_ENTITY_REPOSITORY)
        private readonly cookiesRepo: Repository<PlemionaCookiesEntity>,
    ) { }

    /**
     * Pobiera wszystkie cookies (max 1 rekord zgodnie z singleton pattern)
     */
    async getCookies(): Promise<PlemionaCookieResponseDto[]> {
        this.logger.log('Getting plemiona cookies');
        const cookies = await this.cookiesRepo.find();
        return cookies.map(cookie => this.mapToResponseDto(cookie));
    }

    /**
     * Ustawia cookies (singleton pattern - usuwa stare, dodaje nowe)
     */
    async setCookies(updateDto: UpdatePlemionaCookiesDto): Promise<PlemionaCookieResponseDto[]> {
        this.logger.log(`Setting ${updateDto.cookies.length} plemiona cookies`);

        return await this.cookiesRepo.manager.transaction(async manager => {
            // 1. Usuń wszystkie istniejące cookies (singleton pattern)
            await manager.delete(PlemionaCookiesEntity, {});
            this.logger.log('Cleared existing cookies');

            // 2. Dodaj nowe cookies
            const newCookies = updateDto.cookies.map(cookie => 
                manager.create(PlemionaCookiesEntity, {
                    name: cookie.name,
                    path: cookie.path,
                    value: cookie.value,
                    domain: cookie.domain
                })
            );

            const savedCookies = await manager.save(PlemionaCookiesEntity, newCookies);
            this.logger.log(`Saved ${savedCookies.length} new cookies`);

            return savedCookies.map(cookie => this.mapToResponseDto(cookie));
        });
    }

    /**
     * Usuwa wszystkie cookies
     */
    async deleteCookies(): Promise<void> {
        this.logger.log('Deleting all plemiona cookies');
        const result = await this.cookiesRepo.delete({});
        this.logger.log(`Deleted ${result.affected} cookies`);
    }

    /**
     * Sprawdza czy są ustawione jakieś cookies
     */
    async hasCookies(): Promise<boolean> {
        const count = await this.cookiesRepo.count();
        return count > 0;
    }

    /**
     * Mapuje entity na response DTO
     */
    private mapToResponseDto(cookie: PlemionaCookiesEntity): PlemionaCookieResponseDto {
        return {
            id: cookie.id,
            name: cookie.name,
            path: cookie.path,
            value: cookie.value,
            domain: cookie.domain,
            createdAt: cookie.createdAt,
            updatedAt: cookie.updatedAt
        };
    }
} 