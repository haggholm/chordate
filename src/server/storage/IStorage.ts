import { SoundType, SoundItem } from '../../lib/interfaces';

export interface IStorage {
  saveItem(item: SoundItem & { data?: Buffer }): Promise<SoundItem>;
  loadItem(id: number): Promise<SoundItem & { data: Buffer }>;
  loadItems(type: SoundType): Promise<Exclude<SoundItem, 'data'>[]>;
}
