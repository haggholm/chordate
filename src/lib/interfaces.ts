export enum TestType {
  MultipleChoice = 'multiple-choice',
  Entry = 'text-entry',
}

export enum SoundType {
  Chord = 'chord',
  Note = 'note',
  Pattern = 'strumming_pattern',
}

export interface SoundItem {
  id?: number | string;
  type: SoundType;
  name: string;
}
