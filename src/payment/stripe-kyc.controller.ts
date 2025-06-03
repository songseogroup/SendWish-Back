import { Controller, Get, Param, Post, Body, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StripeKYCService } from './stripe-kyc.service';
import axios from 'axios';
import * as FormData from 'form-data';

@Controller('stripe')
export class StripeKYCController {
  constructor(private readonly stripeKYCService: StripeKYCService) {}

  @Get('check-kyc/:accountId')
  async checkKYC(@Param('accountId') accountId: string) {
    return this.stripeKYCService.checkKYCStatus(accountId);
  }

  @Post('resubmit-kyc')
  async resubmitKYC(@Body() body: any) {
    const { accountId, kycPayload } = body;
    console.log(accountId, kycPayload,"helwewWoos")
    if (!accountId || !kycPayload) {
      throw new BadRequestException('accountId and kycPayload are required');
    }
    return this.stripeKYCService.resubmitKYC(accountId, kycPayload);
  }

  @Post('upload-to-stripe')
  @UseInterceptors(FileInterceptor('file'))
  async uploadToStripe(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    try {
      const form = new FormData();
      form.append('file', file.buffer, { filename: file.originalname });
      form.append('purpose', 'identity_document');

      const response = await axios.post('https://files.stripe.com/v1/files', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${process.env.STRIPE_KEY}`,
        },
      });
      return { fileId: response.data.id };
    } catch (error) {
      console.log(error,"error")
      throw new BadRequestException(error?.response?.data?.error?.message || error.message || 'Failed to upload file to Stripe');
    }
  }
} 