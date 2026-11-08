import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Every route needs a valid access token unless it is marked @Public().
// On a public route a valid token is still read, so the handler knows who is calling.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
