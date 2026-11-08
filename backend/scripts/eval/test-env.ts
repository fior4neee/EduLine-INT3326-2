// Import this first in any eval that touches the database: AppModule reads the
// environment when it is imported, so the check and defaults must already be in place.
import { requireTestDatabase } from './lib';

requireTestDatabase();
