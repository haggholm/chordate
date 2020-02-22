import fs from 'fs-extra';
import { Buffer } from 'buffer';
import * as path from 'path';
import uuidv4 = require('uuid/v4');

import { SoundItem, SoundType } from '../../lib/interfaces';
import { IStorage } from './IStorage';

interface DB {
  items: { [key: string]: SoundItem };
}

export default class JSONStorage implements IStorage {
  private readonly appDataPath: string;
  private data: DB;

  constructor(appDataPath: string) {
    this.appDataPath = appDataPath;
    this.data = fs.pathExistsSync(this.dbPath)
      ? fs.readJSONSync(this.dbPath)
      : { items: {} };
  }

  private get dbPath() {
    return path.join(this.appDataPath, 'db.v1.json');
  }

  private filePath(id: string): string {
    return path.join(this.appDataPath, 'db', `${id}.json`);
  }

  async saveItem(item: SoundItem & { data?: Buffer }): Promise<SoundItem> {
    if (item.data && !Buffer.isBuffer(item.data)) {
      throw new Error('Invalid data buffer');
    }

    if (!item.id) {
      item = { ...item, id: uuidv4() };
    }

    this.data.items[item.id] = {
      ...(this.data.items[item.id] ?? {}),
      id: item.id,
      name: item.name,
      type: item.type,
    };
    await Promise.all([
      fs.writeJSON(this.dbPath),
      item.data
        ? fs.writeFile(this.filePath(`${item.id}`), item.data)
        : Promise.resolve(),
    ]);
    return item;
  }

  async loadItem(id: number | string): Promise<SoundItem & { data: Buffer }> {
    const item = this.data.items[id];
    return {
      ...item,
      data: await fs.readFile(this.filePath(`${id}`)),
    } as SoundItem & { data: Buffer };
  }

  async loadItems(type: SoundType): Promise<Exclude<SoundItem, 'data'>[]> {
    const items = [];
    for (const id of Object.keys(this.data.items)) {
      const item = this.data.items[id];
      if (item.type === type) {
        items.push(item);
      }
    }
    return items;
  }
}
