import { Controller, Get, Put, Delete, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlemionaCookiesService } from './plemiona-cookies.service';
import { UpdatePlemionaCookiesDto, PlemionaCookieResponseDto } from './dto';
import { GetPlemionaCookiesDecorators, SetPlemionaCookiesDecorators, DeletePlemionaCookiesDecorators } from './decorators';

@ApiTags('Plemiona Cookies')
@Controller('plemiona-cookies')
export class PlemionaCookiesController {
    private readonly logger = new Logger(PlemionaCookiesController.name);

    constructor(
        private readonly cookiesService: PlemionaCookiesService
    ) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @GetPlemionaCookiesDecorators()
    async getCookies(): Promise<PlemionaCookieResponseDto[]> {
        this.logger.log('Request to get plemiona cookies');
        
        try {
            const cookies = await this.cookiesService.getCookies();
            this.logger.log(`Successfully retrieved ${cookies.length} cookies`);
            return cookies;
        } catch (error) {
            this.logger.error(`Failed to get cookies: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    @SetPlemionaCookiesDecorators()
    async setCookies(
        @Body() updateDto: UpdatePlemionaCookiesDto
    ): Promise<PlemionaCookieResponseDto[]> {
        this.logger.log(`Request to set ${updateDto.cookies.length} plemiona cookies`);
        
        try {
            const savedCookies = await this.cookiesService.setCookies(updateDto);
            this.logger.log(`Successfully set ${savedCookies.length} cookies`);
            return savedCookies;
        } catch (error) {
            this.logger.error(`Failed to set cookies: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @DeletePlemionaCookiesDecorators()
    async deleteCookies(): Promise<{ message: string }> {
        this.logger.log('Request to delete all plemiona cookies');
        
        try {
            await this.cookiesService.deleteCookies();
            this.logger.log('Successfully deleted all cookies');
            return { message: 'All cookies have been deleted' };
        } catch (error) {
            this.logger.error(`Failed to delete cookies: ${error.message}`, error.stack);
            throw error;
        }
    }
} 