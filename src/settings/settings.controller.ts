// settings.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SettingsKey } from './settings-keys.enum';
import { PlemionaCookieDto, PlemionaCookiesDto, AutoScavengingDto } from './dto';
import {
    GetSettingDecorators,
    CreateSettingDecorators,
    UpdateSettingDecorators,
    DeleteSettingDecorators,
    GetAllKeysDecorators,
    GetPlemionaCookiesDecorators,
    SetPlemionaCookiesDecorators,
    UpdatePlemionaCookiesDecorators,
    DeletePlemionaCookiesDecorators,
    GetAutoScavengingDecorators,
    UpdateAutoScavengingDecorators
} from './decorators';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
    private readonly logger = new Logger(SettingsController.name);

    constructor(private readonly settingsService: SettingsService) { }

    private validateKey(key: string): void {
        if (!(key in SettingsKey)) {
            throw new HttpException(`Invalid settings key: ${key}`, HttpStatus.BAD_REQUEST);
        }
    }

    @Get('keys')
    @GetAllKeysDecorators()
    async getAllKeys() {
        const keys = Object.values(SettingsKey);
        return {
            keys,
            total: keys.length
        };
    }

    @Get(':key')
    @GetSettingDecorators()
    async getSetting(@Param('key') key: string) {
        this.validateKey(key);
        return this.settingsService.getSetting(SettingsKey[key]);
    }

    @Post(':key')
    @CreateSettingDecorators()
    async createSetting(@Param('key') key: string, @Body() value: any) {
        this.validateKey(key);

        // If this is for Plemiona cookies, validate the format
        if (key === 'PLEMIONA_COOKIES' && value.cookies) {
            await this.settingsService.setSetting(SettingsKey[key], value.cookies);
        } else {
            await this.settingsService.setSetting(SettingsKey[key], value);
        }

        return { message: 'Setting created successfully' };
    }

    @Put(':key')
    @UpdateSettingDecorators()
    async updateSetting(@Param('key') key: string, @Body() value: any) {
        this.validateKey(key);

        // If this is for Plemiona cookies, validate the format
        if (key === 'PLEMIONA_COOKIES' && value.cookies) {
            await this.settingsService.setSetting(SettingsKey[key], value.cookies);
        } else {
            await this.settingsService.setSetting(SettingsKey[key], value);
        }

        return { message: 'Setting updated successfully' };
    }

    @Delete(':key')
    @DeleteSettingDecorators()
    async deleteSetting(@Param('key') key: string) {
        this.validateKey(key);
        await this.settingsService.deleteSetting(SettingsKey[key]);
        return { message: 'Setting deleted successfully' };
    }

    // Dedicated endpoints for Plemiona cookies

    @Get('plemiona/cookies')
    @GetPlemionaCookiesDecorators()
    async getPlemionaCookies() {
        const cookies = await this.settingsService.getSetting<PlemionaCookieDto[]>(SettingsKey.PLEMIONA_COOKIES);
        return { cookies };
    }

    @Post('plemiona/cookies')
    @SetPlemionaCookiesDecorators()
    async setPlemionaCookies(@Body() data: PlemionaCookiesDto) {
        if (!data.cookies || !Array.isArray(data.cookies) || data.cookies.length === 0) {
            throw new HttpException('Invalid cookies data: must provide an array of cookies', HttpStatus.BAD_REQUEST);
        }

        // Validate required cookies
        const requiredCookies = ['pl_auth', 'cid', 'sid', 'global_village_id'];
        const cookieNames = data.cookies.map(c => c.name);

        const missingCookies = requiredCookies.filter(name => !cookieNames.includes(name));
        if (missingCookies.length > 0) {
            throw new HttpException(
                `Missing required cookies: ${missingCookies.join(', ')}`,
                HttpStatus.BAD_REQUEST
            );
        }

        await this.settingsService.setSetting(SettingsKey.PLEMIONA_COOKIES, data.cookies);
        return { message: 'Plemiona cookies saved successfully' };
    }

    @Put('plemiona/cookies')
    @UpdatePlemionaCookiesDecorators()
    async updatePlemionaCookies(@Body() data: PlemionaCookiesDto) {
        if (!data.cookies || !Array.isArray(data.cookies) || data.cookies.length === 0) {
            throw new HttpException('Invalid cookies data: must provide an array of cookies', HttpStatus.BAD_REQUEST);
        }

        // Validate required cookies
        const requiredCookies = ['pl_auth', 'cid', 'sid', 'global_village_id'];
        const cookieNames = data.cookies.map(c => c.name);

        const missingCookies = requiredCookies.filter(name => !cookieNames.includes(name));
        if (missingCookies.length > 0) {
            throw new HttpException(
                `Missing required cookies: ${missingCookies.join(', ')}`,
                HttpStatus.BAD_REQUEST
            );
        }

        await this.settingsService.setSetting(SettingsKey.PLEMIONA_COOKIES, data.cookies);
        return { message: 'Plemiona cookies updated successfully' };
    }

    @Delete('plemiona/cookies')
    @DeletePlemionaCookiesDecorators()
    async deletePlemionaCookies() {
        await this.settingsService.deleteSetting(SettingsKey.PLEMIONA_COOKIES);
        return { message: 'Plemiona cookies deleted successfully' };
    }

    @Get('scavenging/auto')
    @GetAutoScavengingDecorators()
    async getAutoScavenging() {
        const setting = await this.settingsService.getSetting<{ value: boolean }>(SettingsKey.AUTO_SCAVENGING_ENABLED);
        return { enabled: setting?.value !== undefined ? setting.value : false };
    }

    @Put('scavenging/auto')
    @UpdateAutoScavengingDecorators()
    async updateAutoScavenging(@Body() data: any) {
        // Log the entire request body for debugging
        this.logger.log(`Received request body: ${JSON.stringify(data)}`);

        // Try to get the enabled value in a more flexible way
        let enabledValue: boolean;

        if (data && typeof data === 'object') {
            if ('enabled' in data) {
                enabledValue = Boolean(data.enabled);
                this.logger.log(`Parsed enabled value: ${enabledValue}`);
            } else {
                this.logger.error(`No 'enabled' property found in request body`);
                throw new HttpException('Invalid data: missing "enabled" property', HttpStatus.BAD_REQUEST);
            }
        } else {
            // If data is not an object, check if it's a boolean itself
            if (typeof data === 'boolean') {
                enabledValue = data;
                this.logger.log(`Using request body directly as boolean: ${enabledValue}`);
            } else {
                this.logger.error(`Invalid request body format: ${typeof data}`);
                throw new HttpException('Invalid request format: body should be an object with "enabled" property', HttpStatus.BAD_REQUEST);
            }
        }

        await this.settingsService.setSetting(SettingsKey.AUTO_SCAVENGING_ENABLED, { value: enabledValue });
        return {
            message: `Auto-scavenging has been ${enabledValue ? 'enabled' : 'disabled'} successfully`,
            enabled: enabledValue
        };
    }
}
