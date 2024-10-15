import { Provider } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export const oauth2ClientProvider: Provider = {
    provide: 'OAuth2Client',
    useFactory: () => {
        return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    },
};
