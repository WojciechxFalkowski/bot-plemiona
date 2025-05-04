// settings.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsKey } from './settings-keys.enum';
import { ApiProperty, ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

/**
 * Data transfer object for a single Plemiona cookie
 * Contains all essential properties for a cookie used in the Plemiona game
 */
class PlemionaCookieDto {
    @ApiProperty({
        example: 'pl_auth',
        description: 'The name of the cookie as defined by the Plemiona website',
        required: true
    })
    name: string;

    @ApiProperty({
        example: 'd10f35ddd864:c449c0dffdf525d354be8b618cb73de0e1c42b42f388623341cb5c2ae2bce504',
        description: 'The value of the cookie, typically a hash or identifier',
        required: true
    })
    value: string;

    @ApiProperty({
        example: '.plemiona.pl',
        description: 'The domain for which the cookie is valid, usually .plemiona.pl or pl214.plemiona.pl',
        required: true
    })
    domain: string;

    @ApiProperty({
        example: '/',
        description: 'The path for which the cookie is valid, usually /',
        required: true
    })
    path: string;

    @ApiProperty({
        example: 1714464392,
        description: 'The expiration timestamp of the cookie in seconds (Unix timestamp). Use -1 for session cookies',
        required: true
    })
    expires: number;
}

/**
 * Data transfer object for the collection of Plemiona cookies
 * Contains an array of all cookies needed for the Plemiona bot to function
 */
class PlemionaCookiesDto {
    @ApiProperty({
        type: [PlemionaCookieDto],
        description: 'Array of Plemiona cookies. At minimum should include pl_auth, cid, sid, and global_village_id',
        example: [
            {
                name: 'pl_auth',
                value: 'd10f35ddd864:c449c0dffdf525d354be8b618cb73de0e1c42b42f388623341cb5c2ae2bce504',
                domain: '.plemiona.pl',
                path: '/',
                expires: 1714464392
            },
            {
                name: 'cid',
                value: '113995269',
                domain: '.plemiona.pl',
                path: '/',
                expires: 1714464392
            },
            {
                name: 'sid',
                value: '0%3Abba1c87a4d77b774238cfdde1ddf8c8b426c1a4416e0f0f375d2c7edaa23202126cb0af5fbe1e0fc7143bfd36637a86e614391359155067522dcfdcd80bbaf7f',
                domain: 'pl214.plemiona.pl',
                path: '/',
                expires: -1
            },
            {
                name: 'global_village_id',
                value: '12142',
                domain: 'pl214.plemiona.pl',
                path: '/',
                expires: -1
            }
        ]
    })
    cookies: PlemionaCookieDto[];
}

/**
 * Data transfer object for the auto-scavenging setting
 * Controls whether the bot should automatically run scavenging missions
 */
class AutoScavengingDto {
    @ApiProperty({
        example: true,
        description: 'Whether automatic scavenging is enabled or disabled',
        required: true
    })
    enabled: boolean;
}

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

    @Get(':key')
    @ApiOperation({ summary: 'Get setting by key', description: 'Retrieves a setting value by its key' })
    @ApiParam({ name: 'key', description: 'Setting key name from SettingsKey enum', example: 'LAST_CHECKED_CAR_ID' })
    @ApiResponse({ status: 200, description: 'Setting found and returned' })
    @ApiResponse({ status: 404, description: 'Setting not found' })
    async getSetting(@Param('key') key: string) {
        this.validateKey(key);
        return this.settingsService.getSetting(SettingsKey[key]);
    }

    @Post(':key')
    @ApiOperation({ summary: 'Create setting', description: 'Creates a new setting with the specified key and value' })
    @ApiParam({ name: 'key', description: 'Setting key name from SettingsKey enum', example: 'LAST_CHECKED_CAR_ID' })
    @ApiResponse({ status: 201, description: 'Setting created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
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
    @ApiOperation({ summary: 'Update setting', description: 'Updates an existing setting with the specified key' })
    @ApiParam({ name: 'key', description: 'Setting key name from SettingsKey enum', example: 'LAST_CHECKED_CAR_ID' })
    @ApiResponse({ status: 200, description: 'Setting updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data or key' })
    @ApiResponse({ status: 404, description: 'Setting not found' })
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
    @ApiOperation({ summary: 'Delete setting', description: 'Deletes a setting with the specified key' })
    @ApiParam({ name: 'key', description: 'Setting key name from SettingsKey enum', example: 'LAST_CHECKED_CAR_ID' })
    @ApiResponse({ status: 200, description: 'Setting deleted successfully' })
    @ApiResponse({ status: 404, description: 'Setting not found' })
    async deleteSetting(@Param('key') key: string) {
        this.validateKey(key);
        await this.settingsService.deleteSetting(SettingsKey[key]);
        return { message: 'Setting deleted successfully' };
    }

    // Dedicated endpoints for Plemiona cookies

    @Get('plemiona/cookies')
    @ApiOperation({
        summary: 'Get Plemiona cookies',
        description: 'Retrieves all Plemiona cookies needed for the bot to function'
    })
    @ApiResponse({
        status: 200,
        description: 'Cookies found and returned',
        type: PlemionaCookiesDto
    })
    @ApiResponse({ status: 404, description: 'Cookies not found' })
    async getPlemionaCookies() {
        const cookies = await this.settingsService.getSetting<PlemionaCookieDto[]>(SettingsKey.PLEMIONA_COOKIES);
        return { cookies };
    }

    @Post('plemiona/cookies')
    @ApiOperation({
        summary: 'Set Plemiona cookies',
        description: 'Sets all Plemiona cookies needed for the bot to function. This will overwrite any existing cookies.'
    })
    @ApiBody({
        type: PlemionaCookiesDto,
        description: 'The cookies data for Plemiona login'
    })
    @ApiResponse({ status: 201, description: 'Cookies saved successfully' })
    @ApiResponse({ status: 400, description: 'Invalid cookie data format' })
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
    @ApiOperation({
        summary: 'Update Plemiona cookies',
        description: 'Updates all Plemiona cookies needed for the bot to function. This will overwrite any existing cookies.'
    })
    @ApiBody({
        type: PlemionaCookiesDto,
        description: 'The cookies data for Plemiona login'
    })
    @ApiResponse({ status: 200, description: 'Cookies updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid cookie data format' })
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
    @ApiOperation({
        summary: 'Delete Plemiona cookies',
        description: 'Deletes all Plemiona cookies. The bot will fall back to manual login.'
    })
    @ApiResponse({ status: 200, description: 'Cookies deleted successfully' })
    async deletePlemionaCookies() {
        await this.settingsService.deleteSetting(SettingsKey.PLEMIONA_COOKIES);
        return { message: 'Plemiona cookies deleted successfully' };
    }

    @Get('scavenging/auto')
    @ApiOperation({
        summary: 'Get auto-scavenging setting',
        description: 'Retrieves whether automatic scavenging is enabled or disabled'
    })
    @ApiResponse({
        status: 200,
        description: 'Auto-scavenging setting retrieved successfully',
        type: AutoScavengingDto
    })
    async getAutoScavenging() {
        const setting = await this.settingsService.getSetting<{ value: boolean }>(SettingsKey.AUTO_SCAVENGING_ENABLED);
        return { enabled: setting?.value !== undefined ? setting.value : false };
    }

    @Put('scavenging/auto')
    @ApiOperation({
        summary: 'Update auto-scavenging setting',
        description: 'Enables or disables automatic scavenging'
    })
    @ApiBody({
        type: AutoScavengingDto,
        description: 'The auto-scavenging setting value'
    })
    @ApiResponse({ status: 200, description: 'Auto-scavenging setting updated successfully' })
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
