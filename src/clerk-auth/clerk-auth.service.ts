import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './user.entity';
import { USER_ENTITY_REPOSITORY } from './clerk-auth.service.contracts';
import { UpdateProfileDto, UserProfileDto, TokenVerificationDto } from './dto';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';

@Injectable()
export class ClerkAuthService {
    constructor(
        private readonly configService: ConfigService,
        @Inject(USER_ENTITY_REPOSITORY)
        private readonly userRepository: Repository<UserEntity>,
        private readonly settingsService: SettingsService,
    ) { }

    async verifyToken(token: string): Promise<TokenVerificationDto> {
        try {
            const clerkSecretKey = await this.settingsService.getSetting<{ value: string }>(SettingsKey.CLERK_SECRET_KEY);
            if (!clerkSecretKey || !clerkSecretKey.value) {
                throw new Error('CLERK_SECRET_KEY is not set');
            }

            const payload = await verifyToken(token, {
                secretKey: clerkSecretKey?.value,
            });

            return {
                valid: true,
                clerkUserId: payload.sub as string,
                email: payload.email as string,
            };
        } catch (error) {
            console.log('error', error);
            return {
                valid: false,
            };
        }
    }

    async getUserProfile(clerkUserId: string): Promise<UserProfileDto> {
        const user = await this.userRepository.findOne({
            where: { clerkUserId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            id: user.id,
            clerkUserId: user.clerkUserId,
            email: user.email,
            gameNick: user.gameNick,
            gameServer: user.gameServer,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    async updateUserProfile(
        clerkUserId: string,
        updateData: UpdateProfileDto,
    ): Promise<UserProfileDto> {
        const user = await this.userRepository.findOne({
            where: { clerkUserId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Update fields if provided
        if (updateData.gameNick !== undefined) {
            user.gameNick = updateData.gameNick;
        }

        if (updateData.gameServer !== undefined) {
            user.gameServer = updateData.gameServer;
        }

        if (updateData.gamePassword !== undefined) {
            // Hash the password before saving
            const saltRounds = 10;
            user.gamePassword = await bcrypt.hash(updateData.gamePassword, saltRounds);
        }

        await this.userRepository.save(user);

        return {
            id: user.id,
            clerkUserId: user.clerkUserId,
            email: user.email,
            gameNick: user.gameNick,
            gameServer: user.gameServer,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    async findOrCreateUser(clerkUserId: string, email: string): Promise<UserEntity> {
        let user = await this.userRepository.findOne({
            where: { clerkUserId },
        });

        if (!user) {
            user = this.userRepository.create({
                clerkUserId,
                email,
            });
            await this.userRepository.save(user);
        }

        return user;
    }
} 