/* tslint:disable:no-console */

import * as fs from 'fs-extra';
import * as path from 'path';
import express, { Express, Request, Response } from 'express';
import multer from 'multer';

import { SoundType } from '../lib/interfaces';
import { IStorage } from './storage/IStorage';

const upload = multer({ storage: multer.memoryStorage() });

function safe<T extends (...args: any[]) => any>(fn: T): T {
  return ((async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      res.status(500);
      res.write(err.message);
    }
  }) as unknown) as T;
}

export default async function main(opts: { port?: number; storage: IStorage }) {
  const port = opts.port ?? 8080;
  const storage = opts.storage;

  console.log('Initialize app...');
  const app: Express = express();

  const root = /* electron */ path.resolve(__dirname, '..', '..');

  const staticRoot = path.resolve(__dirname, '..', '..', 'dist');
  console.log('Static root:', staticRoot);
  app.use(express.static(staticRoot));

  app.get(
    `${root}/api/:tp/list`,
    safe(async (req: Request, res: Response) => {
      res.json(await storage.loadItems(req.params.tp as SoundType));
    })
  );

  app.get(
    `${root}/api/:tp/:id`,
    safe(async (req: Request, res: Response) => {
      console.log(`Get ${req.params.tp} ${req.params.id}`);
      const { id, name, data } = await storage.loadItem(Number(req.params.id));
      res.status(200);
      res.json({ id: Number(id), name, data: data.toString('hex') });
    })
  );

  app.delete(
    `${root}/api/:tp/:id`,
    safe(async (req: Request, res: Response) => {
      throw new Error('Not implemented');
      // console.log(`Delete ${req.params.tp} ${req.params.id}`);
      // await db.run('DELETE FROM items WHERE type = $tp AND id = $id', {
      //   $tp: req.params.tp,
      //   $id: req.params.id,
      // });
      // res.status(200);
    })
  );

  app.post(
    `${root}/api/:tp/:id`,
    upload.single('data'),
    safe(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new Error('Invalid id');
      }
      console.log('POST', `/api/:tp/${id}`);
      const item = await storage.loadItem(id);
      await storage.saveItem({ ...item, data: req.file.buffer });
      res.json({ id });
    })
  );

  app.post(
    `${root}/api/:tp`,
    upload.single('data'),
    safe(async (req: Request, res: Response) => {
      const name = req.body.name;
      const data = req.file.buffer;
      if (!Buffer.isBuffer(data)) {
        res.status(400);
        res.send('Invalid data buffer');
        return;
      }

      console.log(`Received audio blob ${data.length}`);
      const item = await storage.saveItem({
        name,
        type: req.params.tp as SoundType,
        data,
      });
      res.json({ id: item.id });
    })
  );

  app.get(`*`, async (req: Request, res: Response) => {
    const pth = path.resolve(req.path);
    console.log('request:', pth);
    if (pth.startsWith(root)) {
      if (await fs.pathExists(pth)) {
        res.status(200);
        res.send(await fs.readFile(pth, 'utf8'));
      } else {
        res.status(404);
      }
      res.end();
    } else {
      res.status(200);
      res.send(`<!DOCTYPE html>
<html lang="en">
  <base>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Chordate</title>
    <base href="${path.resolve(__dirname, '..', 'dist')}" />
  </head>
  <body>
    <div id="root"></div>
    <script src="${path.resolve(
      root,
      'dist',
      `client.js?port=${port}`
    )}"></script>
  </body>
</html>`);
      res.end();
    }
  });

  console.log(`Listen on port ${port}...`);
  app.listen(port, () => console.log(`Listening on port ${port}`));
}
