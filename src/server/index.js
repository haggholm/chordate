'use strict';

const path = require('path');
const express = require('express');
const os = require('os');
const sqlite = require('sqlite');
const multer = require('multer');
const Buffer = require('buffer').Buffer;

const upload = multer({ storage: multer.memoryStorage() });


async function initDB() {
  console.log('Initialize db...');
  const db = await sqlite.open('./database.sqlite', { Promise, cached: false });
  await db.migrate({ migrationsPath: path.resolve(__dirname, 'db') });
  return db;
}


function safe(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      res.status(500);
      res.write(err.message);
    }
  };
}




async function main() {
  const db = await initDB();

  console.log('Initialize app...');
  const app = express();

  app.use(express.static('dist'));

  const saveAudio = async function saveAudio(tp, id, name, data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('Invalid data buffer');
    }

    console.log(`Received audio blob ${data.length}`);

    if (id) {
      console.log(`Update ${tp} ${id}: ${name}`);
      const res = await db.run(`UPDATE ${tp}s SET name = $name, data = $data WHERE id = $id`, { $name: name, $data: Buffer.from(data), $id: id });
      if (res.stmt.changes < 1) {
        throw new Error(`No such ${tp}: [${typeof id}] ${id}`);
      }
    } else {
      console.log(`Insert ${tp} ${id}/${name}`);
      console.log(`INSERT INTO ${tp}s (name, data) VALUES (?, ?)`);
      const dbRes = await db.run(`INSERT INTO ${tp}s (name, data) VALUES ($name, $data)`, { $name: name, $data: Buffer.from(data) });
      id = dbRes.stmt.lastID;
    }

    // Verify, I've had weird SQLite issues where the BLOB ends up being the string
    // "[object Object]"
    const { data: readData } = await db.get(`SELECT data FROM ${tp}s WHERE id = $id`, { $id: id });
    if (!Buffer.isBuffer(readData)) {
      await db.run(`DELETE FROM ${tp}s WHERE id = $id`, { $id: id });
      throw new Error('SQLite insert BLOB error');
    }

    return Number(id);
  };

  for (const tp of ['note', 'chord', 'strumming_pattern']) {
    app.get(`/api/${tp}/list`, safe(async (req, res) => {
      const data = await db.all(`SELECT id, name FROM ${tp}s`);
      console.log(`List ${tp}s:`, data);
      res.json(data);
    }));

    app.get(`/api/${tp}/:id`, safe(async (req, res) => {
      console.log(`Get ${tp} ${req.params.id}`);
      const { id, name, data } = await db.get(`SELECT id, name, data FROM ${tp}s WHERE id = $id`, { $id: Number(req.params.id) });
      res.json({ id: Number(id), name, data: data.toString('hex') });
    }));

    app.delete(`/api/${tp}/:id`, safe(async (req, res) => {
      console.log(`Delete ${tp} ${req.params.id}`);
      await db.run(`DELETE FROM ${tp}s WHERE id = $id`, { $id: req.params.id });
      res.status(200);
    }));

    app.post(`/api/${tp}/:id`, upload.single('data'), safe(async (req, res) => {
      const id = Number(req.params.id);
      console.log('POST', `/api/${tp}/${id}`)
      await saveAudio(tp, id, req.body.name, req.file.buffer);
      res.json({ id });
    }));

    app.post(`/api/${tp}`, upload.single('data'), safe(async (req, res) => {
      console.log('POST', `/api/${tp}`);
      const id = await saveAudio(tp, null, req.body.name, req.file.buffer);
      res.json({ id });
    }));

    app.post(`/api/${tp}`, upload.single('data'), safe(async (req, res) => {
      const name = req.body.name;
      const data = req.file.buffer;
      if (!Buffer.isBuffer(data)) {
        res.status(400);
        res.send('Invalid data buffer');
        return;
      }

      console.log(`Received audio blob ${data.length}`);

      const id = await saveAudio(tp, id, name, data);
      res.json({ id });
    }));

  }

  app.get('*', function(req,res) {
    console.log(req);
    res.sendFile('public/index.html');
  });

  console.log('Listen on port 8080...');
  app.listen(8080, () => console.log('Listening on port 8080!'));
}


if (module === require.main) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
}
