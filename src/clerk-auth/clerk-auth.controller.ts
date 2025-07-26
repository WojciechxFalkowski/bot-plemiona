import { Controller, Get, Put, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClerkAuthService } from './clerk-auth.service';
import { UpdateProfileDto, UserProfileDto, TokenVerificationDto } from './dto';
import { UserEntity } from './user.entity';
import {
  GetProfileDecorators,
  UpdateProfileDecorators,
  VerifyTokenDecorators,
  ClerkAuth,
  CurrentUser,
} from './decorators';

@ApiTags('Authentication')
@Controller('auth')
export class ClerkAuthController {
  constructor(private readonly clerkAuthService: ClerkAuthService) {}

  // @Get('profile')
  // @ClerkAuth()
  // @GetProfileDecorators()
  // async getProfile(@CurrentUser() user: UserEntity): Promise<UserProfileDto> {
  //   console.log('GET -> getProfile');
  //   return this.clerkAuthService.getUserProfile(user.clerkUserId);
  // }

  @Put('profile') 
  @ClerkAuth()
  @UpdateProfileDecorators()
  async updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() updateData: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    console.log('updateData', updateData);
    return this.clerkAuthService.updateUserProfile(user.clerkUserId, updateData);
  }

  // @Post('verify')
  // @VerifyTokenDecorators()
  // async verifyToken(@Headers('authorization') authHeader: string): Promise<TokenVerificationDto> {
  //   console.log('POST -> verifyToken');
  //   if (!authHeader) {
  //     throw new UnauthorizedException('No authorization header provided');
  //   }

  //   const [type, token] = authHeader.split(' ');
  //   if (type !== 'Bearer' || !token) {
  //     throw new UnauthorizedException('Invalid authorization header format');
  //   }

  //   return this.clerkAuthService.verifyToken(token);
  // }
} 