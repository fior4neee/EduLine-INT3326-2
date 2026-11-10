import { Controller, Get, HttpStatus, Param, Put, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { createWriteStream, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Public } from '../decorators/public.decorator';
import { AppException } from '../errors/app.exception';
import type { LocalStorageDriver, LocalToken } from './local-storage.driver';
import { StorageService } from './storage.service';

const notFound = () => new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Not found.');

// Upload and download links of the local storage driver (development only). The
// signed token in the URL is the only credential, like a Cloud Storage signed URL,
// so these routes are public. With the gcs driver they answer 404.
@ApiExcludeController()
@Public()
@Controller('storage/local')
export class LocalStorageController {
  constructor(private readonly storage: StorageService) {}

  @Put(':token')
  async upload(@Param('token') token: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const { driver, t } = this.open(token, 'put');
    const file = driver.filePath(t.b, t.k);
    const partial = `${file}.part`;
    await fs.mkdir(path.dirname(file), { recursive: true });

    // Stop writing as soon as the limit is passed, so an oversized upload never
    // fills the disk. The rest of the body is read and dropped (not cut off), so
    // the browser still receives the 413 answer.
    let received = 0;
    let tooLarge = false;
    const limit = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        received += chunk.length;
        if (t.max !== undefined && received > t.max) tooLarge = true;
        done(null, tooLarge ? undefined : chunk);
      },
    });
    try {
      await pipeline(req, limit, createWriteStream(partial));
    } catch (err) {
      await fs.rm(partial, { force: true });
      throw err;
    }
    if (tooLarge) {
      await fs.rm(partial, { force: true });
      throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, 'FILE_TOO_LARGE', 'The file is larger than allowed.');
    }
    await fs.rename(partial, file);
    await fs.writeFile(driver.metaPath(t.b, t.k), JSON.stringify({ contentType: t.ct ?? 'application/octet-stream' }));
    res.status(200).end();
  }

  @Get(':token')
  async download(@Param('token') token: string, @Res() res: Response): Promise<void> {
    const { driver, t } = this.open(token, 'get');
    const stat = await driver.stat(t.b, t.k);
    if (!stat) throw notFound();
    // The frontend runs on another origin (localhost:5173): allow <video>/<img> there.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', stat.contentType);
    if (t.dn) res.attachment(t.dn);
    // sendFile answers Range requests, so videos can seek.
    res.sendFile(driver.filePath(t.b, t.k), { headers: { 'Cache-Control': 'private, max-age=60' } });
  }

  private open(token: string, op: LocalToken['op']): { driver: LocalStorageDriver; t: LocalToken } {
    const driver = this.storage.local;
    const t = driver?.verify(token);
    if (!driver || !t || t.op !== op) throw notFound();
    return { driver, t };
  }
}
