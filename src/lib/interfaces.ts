export enum TestType {
  MULTIPLE = 'multiple-choice',
  ENTRY = 'text-entry',
}

export enum SoundType {
  CHORD = 'chord',
  NOTE = 'note',
  PATTERN = 'strumming_pattern',
}

export interface SoundItem {
  id?: number|string;
  type: SoundType;
  name: string;
}
