// settings.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus, Logger, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SettingsKey } from './settings-keys.enum';
import { PlemionaCookieDto, PlemionaCookiesDto } from './dto';
import {
    GetSettingDecorators,
    CreateSettingDecorators,
    UpdateSettingDecorators,
    DeleteSettingDecorators,
    GetAllKeysDecorators,
    GetAllSettingsForServerDecorators,
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

    @Get(':serverId')
    @GetAllSettingsForServerDecorators()
    async getAllSettingsForServer(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Getting all settings for server ${serverId}`);
        return this.settingsService.getAllSettingsForServer(serverId);
    }

    @Get(':serverId/:key')
    @GetSettingDecorators()
    async getSetting(@Param('serverId', ParseIntPipe) serverId: number, @Param('key') key: string) {
        this.validateKey(key);
        this.logger.log(`Getting setting ${key} for server ${serverId}`);
        return this.settingsService.getSetting(serverId, SettingsKey[key]);
    }

    @Post(':serverId/:key')
    @CreateSettingDecorators()
    async createSetting(@Param('serverId', ParseIntPipe) serverId: number, @Param('key') key: string, @Body() value: any) {
        this.validateKey(key);
        this.logger.log(`Creating setting ${key} for server ${serverId}`);

        // If this is for Plemiona cookies, validate the format
        if (key === 'PLEMIONA_COOKIES' && value.cookies) {
            await this.settingsService.setSetting(serverId, SettingsKey[key], value.cookies);
        } else {
            await this.settingsService.setSetting(serverId, SettingsKey[key], value);
        }

        return { message: 'Setting created successfully' };
    }

    @Put(':serverId/:key')
    @UpdateSettingDecorators()
    async updateSetting(@Param('serverId', ParseIntPipe) serverId: number, @Param('key') key: string, @Body() value: any) {
        this.validateKey(key);
        this.logger.log(`Updating setting ${key} for server ${serverId}`);

        // If this is for Plemiona cookies, validate the format
        if (key === 'PLEMIONA_COOKIES' && value.cookies) {
            await this.settingsService.setSetting(serverId, SettingsKey[key], value.cookies);
        } else {
            await this.settingsService.setSetting(serverId, SettingsKey[key], value);
        }

        return { message: 'Setting updated successfully' };
    }

    @Delete(':serverId/:key')
    @DeleteSettingDecorators()
    async deleteSetting(@Param('serverId', ParseIntPipe) serverId: number, @Param('key') key: string) {
        this.validateKey(key);
        this.logger.log(`Deleting setting ${key} for server ${serverId}`);
        await this.settingsService.deleteSetting(serverId, SettingsKey[key]);
        return { message: 'Setting deleted successfully' };
    }

    // Dedicated endpoints for Plemiona cookies

    @Get(':serverId/plemiona/cookies')
    @GetPlemionaCookiesDecorators()
    async getPlemionaCookies(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Getting Plemiona cookies for server ${serverId}`);
        const cookies = await this.settingsService.getSetting<PlemionaCookieDto[]>(serverId, SettingsKey.PLEMIONA_COOKIES);
        return { cookies };
    }

    @Post(':serverId/plemiona/cookies')
    @SetPlemionaCookiesDecorators()
    async setPlemionaCookies(@Param('serverId', ParseIntPipe) serverId: number, @Body() data: PlemionaCookieDto) {
        this.logger.log(`Setting Plemiona cookies for server ${serverId}`);

        if (!data) {
            throw new HttpException('Invalid cookies data: must provide an array of cookies', HttpStatus.BAD_REQUEST);
        }

        await this.settingsService.setSetting(serverId, SettingsKey.PLEMIONA_COOKIES, data);
        return { message: 'Plemiona cookies saved successfully' };
    }

    @Put(':serverId/plemiona/cookies')
    @UpdatePlemionaCookiesDecorators()
    async updatePlemionaCookies(@Param('serverId', ParseIntPipe) serverId: number, @Body() data: PlemionaCookieDto) {
        this.logger.log(`Updating Plemiona cookies for server ${serverId}`);

        if (!data) {
            throw new HttpException('Invalid cookies data: must provide an array of cookies', HttpStatus.BAD_REQUEST);
        }

        await this.settingsService.setSetting(serverId, SettingsKey.PLEMIONA_COOKIES, data);
        return { message: 'Plemiona cookies updated successfully' };
    }

    @Delete(':serverId/plemiona/cookies')
    @DeletePlemionaCookiesDecorators()
    async deletePlemionaCookies(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Deleting Plemiona cookies for server ${serverId}`);
        await this.settingsService.deleteSetting(serverId, SettingsKey.PLEMIONA_COOKIES);
        return { message: 'Plemiona cookies deleted successfully' };
    }

    @Get(':serverId/scavenging/auto')
    @GetAutoScavengingDecorators()
    async getAutoScavenging(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Getting auto-scavenging setting for server ${serverId}`);
        const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.AUTO_SCAVENGING_ENABLED);
        return { enabled: setting?.value !== undefined ? setting.value : false };
    }

    @Put(':serverId/scavenging/auto')
    @UpdateAutoScavengingDecorators()
    async updateAutoScavenging(@Param('serverId', ParseIntPipe) serverId: number, @Body() data: any) {
        this.logger.log(`Updating auto-scavenging for server ${serverId}`);
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

        await this.settingsService.setSetting(serverId, SettingsKey.AUTO_SCAVENGING_ENABLED, { value: enabledValue });
        return {
            message: `Auto-scavenging has been ${enabledValue ? 'enabled' : 'disabled'} successfully`,
            enabled: enabledValue
        };
    }
}
