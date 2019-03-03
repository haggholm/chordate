#!./node_modules/.bin/ts-node --pretty
/* tslint:disable:no-console */

import { Buffer } from 'buffer';
import express from 'express';
import multer from 'multer';
import * as path from 'path';
import sqlite from 'sqlite';
import { SoundType } from '../lib/interfaces';

const upload = multer({ storage: multer.memoryStorage() });

async function initDB() {
	console.log('Initialize db...');
	const db = await sqlite.open('./database.sqlite', {
		promise: Promise,
		cached: false,
	});
	await db.migrate({ migrationsPath: path.resolve(__dirname, 'db') });
	return db;
}

function safe<T extends Function>(fn: T): T {
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

async function main() {
	const db = await initDB();

	console.log('Initialize app...');
	const app = express();

	app.use(express.static('dist'));

	const saveAudio = async function save(
		tp: SoundType,
		id: number | undefined,
		name: string,
		data: Buffer
	): Promise<number> {
		if (!Buffer.isBuffer(data)) {
			throw new Error('Invalid data buffer');
		}

		console.log(`Received audio blob ${data.length}`);

		if (id) {
			console.log(`Update ${tp} ${id}: ${name}`);
			const res = await db.run(
				`UPDATE items SET name = $name, data = $data WHERE type = $tp AND id = $id`,
				{ $name: name, $data: Buffer.from(data), $tp: tp, $id: id }
			);
			if (res.changes < 1) {
				throw new Error(`No such ${tp}: [${typeof id}] ${id}`);
			}
		} else {
			console.log(`Insert ${tp} ${id}/${name}`);
			const dbRes = await db.run(
				`INSERT INTO items (name, type, data) VALUES ($name, $tp, $data)`,
				{ $name: name, $tp: tp, $data: Buffer.from(data) }
			);
			id = dbRes.lastID;
		}

		// Verify, I've had weird SQLite issues where the BLOB ends up being the string
		// "[object Object]"
		const { data: readData } = await db.get(
			`SELECT data FROM items WHERE type = $tp AND id = $id`,
			{ $tp: tp, $id: id }
		);
		if (!Buffer.isBuffer(readData)) {
			await db.run(`DELETE FROM ${tp}s WHERE id = $id`, { $id: id });
			throw new Error('SQLite insert BLOB error');
		}

		return Number(id);
	};

	app.get(
		`/api/:tp/list`,
		safe(async (req, res) => {
			const data = await db.all('SELECT id, name FROM items WHERE type=$tp', {
				$tp: req.params.tp,
			});
			console.log(`List ${req.params.tp}s:`, data);
			res.json(data);
		})
	);

	app.get(
		`/api/:tp/:id`,
		safe(async (req, res) => {
			console.log(`Get ${req.params.tp} ${req.params.id}`);
			const { id, name, data } = await db.get(
				'SELECT id, name, data FROM items WHERE type = $tp AND id = $id',
				{ $tp: req.params.tp, $id: Number(req.params.id) }
			);
			res.json({ id: Number(id), name, data: data.toString('hex') });
		})
	);

	app.delete(
		`/api/:tp/:id`,
		safe(async (req, res) => {
			console.log(`Delete ${req.params.tp} ${req.params.id}`);
			await db.run('DELETE FROM items WHERE type = $tp AND id = $id', {
				$tp: req.params.tp,
				$id: req.params.id,
			});
			res.status(200);
		})
	);

	app.post(
		`/api/:tp/:id`,
		upload.single('data'),
		safe(async (req, res) => {
			const id = Number(req.params.id);
			if (isNaN(id)) {
				throw new Error('Invalid id');
			}
			console.log('POST', `/api/:tp/${id}`);
			await saveAudio(
				req.params.tp as SoundType,
				id,
				req.body.name,
				req.file.buffer
			);
			res.json({ id });
		})
	);

	app.post(
		`/api/:tp`,
		upload.single('data'),
		safe(async (req, res) => {
			const name = req.body.name;
			const data = req.file.buffer;
			if (!Buffer.isBuffer(data)) {
				res.status(400);
				res.send('Invalid data buffer');
				return;
			}

			console.log(`Received audio blob ${data.length}`);

			const id = await saveAudio(
				req.params.tp as SoundType,
				undefined,
				name,
				data
			);
			res.json({ id });
		})
	);

	app.get('*', (req, res) => {
		console.log(req);
		res.sendFile('public/index.html');
	});

	console.log('Listen on port 8080...');
	app.listen(8080, () => console.log('Listening on port 8080!'));
}

if (module === require.main) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
