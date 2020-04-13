import sqlite, { Database } from 'sqlite';
import * as path from 'path';

import { SoundItem, SoundType } from '../../lib/interfaces';
import { IStorage } from './IStorage';

export default class SqliteStorage implements IStorage {
  private db: Database;

  async init() {
    console.log('Initialize db...');
    // this.db = await sqlite.open('./database.sqlite', {
    //   promise: Promise,
    //   cached: false,
    // });
    await this.db.migrate({ migrationsPath: path.resolve(__dirname, 'db') });
  }

  async saveItem(item: SoundItem & { data?: Buffer }): Promise<SoundItem> {
    if (item.data && !Buffer.isBuffer(item.data)) {
      throw new Error('Invalid data buffer');
    }

    console.log(`Received audio blob ${item.data.length}`);

    if (item.id) {
      console.log(`Update ${item.type} ${item.id}: ${name}`);
      const res = await this.db.run(
        `UPDATE items SET name = $name, data = $data WHERE type = $tp AND id = $id`,
        {
          $name: name,
          $data: Buffer.from(item.data),
          $tp: item.type,
          $id: item.id,
        }
      );
      if (res.changes < 1) {
        throw new Error(`No such ${item.type}: [${typeof item.id}] ${item.id}`);
      }
    } else {
      console.log(`Insert ${item.name} ${item.id}/${item.name}`);
      const dbRes = await this.db.run(
        `INSERT INTO items (name, type, data) VALUES ($name, $tp, $data)`,
        { $name: name, $tp: item.type, $data: Buffer.from(item.data) }
      );
      item.id = dbRes.lastID;
    }

    // Verify, I've had weird SQLite issues where the BLOB ends up being the string
    // "[object Object]"
    const {
      data: readData,
    } = await this.db.get(
      `SELECT data FROM items WHERE type = $tp AND id = $id`,
      { $tp: item.type, $id: item.id }
    );
    if (!Buffer.isBuffer(readData)) {
      await this.db.run(`DELETE FROM ${item.type}s WHERE id = $id`, {
        $id: item.id,
      });
      throw new Error('SQLite insert BLOB error');
    }

    return { ...item, id: Number(item.id) };
  }

  async loadItem(id: number | string): Promise<SoundItem & { data: Buffer }> {
    const {
      name,
      type,
      data,
    } = await this.db.get(
      'SELECT name, data FROM items WHERE type = $tp AND id = $id',
      { $id: id }
    );
    return { id, type, name, data };
  }

  async loadItems(type: SoundType): Promise<Exclude<SoundItem, 'data'>[]> {
    const data: {
      id: string;
      name: string;
    }[] = await this.db.all('SELECT id, name FROM items WHERE type = $tp', {
      $tp: type,
    });
    return data.map(({ id, name }) => ({ id: Number(id), type, name }));
  }
}
