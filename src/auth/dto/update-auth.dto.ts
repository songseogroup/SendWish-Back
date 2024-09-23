import { PartialType } from '@nestjs/swagger';
import { CreateAuthDto } from './create-auth.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString , IsNotEmpty} from 'class-validator';

export class UpdateAuthDto extends PartialType(CreateAuthDto) {
    @ApiProperty()
    @IsString()
    currentPassword?:string;

    @ApiProperty()
    @IsString()
    newPassword?:string;
}
