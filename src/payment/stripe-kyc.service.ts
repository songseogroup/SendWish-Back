import { Injectable, BadRequestException } from '@nestjs/common';
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2023-10-16',
  timeout: 60000,
  maxNetworkRetries: 3,
});

@Injectable()
export class StripeKYCService {
  async checkKYCStatus(accountId: string) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      if (account.payouts_enabled && (!account.requirements.errors || account.requirements.errors.length === 0)) {
        return { status: 'verified' };
      }
      if (account.requirements.errors && account.requirements.errors.length > 0) {
        console.log(account.requirements.errors,"helooos")
        return {
          status: 'requires_resubmission',
          errors: account.requirements.errors.map((err: any) => ({
            field: err.field,
            reason: err.reason,
            code: err.code,
          })),
        };  
      }
      return {
        status: 'pending',
        next_action: account.requirements.currently_due || [],
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to check KYC status');
    }
  }

  async resubmitKYC(accountId: string, kycPayload: any) {
    try {
      const updated = await stripe.accounts.update(accountId, kycPayload);
      console.log(updated,"updated")
      return { status: 'updated', account: updated };
    } catch (error) {
      const errorMessage = error?.raw?.message || error.message || 'Failed to resubmit KYC';
      throw new BadRequestException(errorMessage);
    }
  }
} 