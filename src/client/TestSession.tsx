import { remote } from 'electron';
import * as path from 'path';
import { autobind } from 'core-decorators';
import { find, isEqual, noop, sample, some } from 'lodash';
import React, { PureComponent } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  FormControl,
  FormGroup,
  FormLabel,
  ListGroup,
  ListGroupItem,
  Modal,
  ProgressBar,
  Row,
} from 'react-bootstrap';
import * as fs from 'fs-extra';

import { SoundItem, SoundType, TestType } from '../lib/interfaces';

const app = remote.app;

interface TestSessionProps {
  type: SoundType;
  mode: TestType;
  items: Array<SoundItem>;
}

interface TestSessionState {
  audioSpeed: number;
  answered: number;
  right: number;
  wrong: number;
  currentItem?: SoundItem | SoundItem[];
  currentAnswer: string;
  lastAnswerCorrect: boolean;
  isPlaying: boolean;
  audioBlobs?: Blob[] | null;
  audioURLs?: string[] | null;
  audioElements?: HTMLAudioElement[] | null;
  showModal: boolean;
  patternGuess:
    | null
    | [
        string | number | null,
        string | number | null,
        string | number | null,
        string | number | null
      ];
  stats: {
    [SoundType.Chord]: Stats;
    [SoundType.Note]: Stats;
    [SoundType.Pattern]: Stats;
  };
  repetitions: number;
}

type Guess =
  | { id: number | string }
  | { ids: Array<number | string> }
  | { answer: string };

interface Stats {
  guesses: Array<{
    soundType: SoundType;
    testType: TestType;
    answer: Guess;
    correct: boolean;
    timestamp: string;
  }>;
}

class Player {
  private audio: HTMLAudioElement[];
  private repetitions: number;
  private cancelled: boolean;
  public readonly promise: Promise<void>;
  private resolve: (value?: PromiseLike<void> | void) => void;
  private reject: (reason?: any) => void;
  #speed: number;

  constructor(
    audio: HTMLAudioElement | HTMLAudioElement[],
    repetitions: number = 1,
    speed: number = 1
  ) {
    this.audio = Array.isArray(audio) ? audio : [audio];
    this.repetitions = repetitions;
    this.cancelled = false;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    this.#speed = speed;
    this.audio.forEach((el) => (el.playbackRate = speed));
  }

  public get speed() {
    return this.#speed;
  }
  public set speed(speed: number) {
    this.#speed = speed;
    this.audio.forEach((el) => (el.playbackRate = speed));
  }

  public cancel() {
    this.cancelled = true;
    for (const a of this.audio) {
      a.pause();
      a.currentTime = 0;
    }
    this.reject();
  }

  public play() {
    setImmediate(async () => {
      for (let i = 0; i < this.repetitions && !this.cancelled; i++) {
        for (let j = 0; j < this.audio.length && !this.cancelled; j++) {
          this.audio[j].currentTime = 0;
          await Promise.all([
            this.audio[j].play(),
            new Promise((resolve) => {
              const fn = () => {
                this.audio[j].removeEventListener('ended', fn);
                resolve();
              };
              this.audio[j].addEventListener('ended', fn);
            }),
          ]);
        }
      }
      this.resolve();
    });
    return this.promise;
  }
}

// tslint:disable-next-line:max-classes-per-file
export default class TestSession extends PureComponent<
  TestSessionProps,
  TestSessionState
> {
  private closeModalTimeout: NodeJS.Timeout;
  private statsPath;
  private player?: Player;

  private get defaultRepetitions() {
    return this.props.type === SoundType.Pattern ? 1 : 4;
  }

  constructor(props) {
    super(props);
    const currentItem = this.pickItem(props.items);
    this.statsPath = path.join(app.getPath('userData'), 'stats.json');
    this.state = {
      answered: 0,
      audioSpeed: 1,
      currentAnswer: '',
      currentItem,
      isPlaying: false,
      lastAnswerCorrect: true,
      patternGuess: null,
      repetitions: this.defaultRepetitions,
      showModal: false,
      right: 0,
      wrong: 0,
      stats: fs.pathExistsSync(this.statsPath)
        ? fs.readJSONSync(this.statsPath)
        : {
            [SoundType.Chord]: { guesses: [] },
            [SoundType.Note]: { guesses: [] },
            [SoundType.Pattern]: { guesses: [] },
          },
    };

    this.loadCurrentItem(currentItem);
  }

  private pickItem(items): SoundItem | SoundItem[] {
    if (this.props.type === SoundType.Pattern) {
      // return sampleSize(items ?? this.props.items, 4);
      const res = [];
      for (let i = 0; i < 4; i++) {
        res.push(sample(items ?? this.props.items));
      }
      return res;
    } else {
      return sample(items ?? this.props.items);
    }
  }

  @autobind
  public async loadCurrentItem(item: SoundItem | SoundItem[]) {
    if (this.state.audioURLs) {
      for (const u of this.state.audioURLs) {
        URL.revokeObjectURL(u);
      }
      this.setState({
        audioBlobs: null,
        audioURLs: null,
        audioElements: null,
      });
    }

    if (this.player) {
      this.player.cancel();
      this.player = undefined;
    }

    if (!this.state.currentItem) {
      throw new Error('No current item available');
    }

    this.player = new Player(
      await this.loadCurrentAudioFiles(item),
      this.state.repetitions,
      this.state.audioSpeed
    );
    await this.play();
  }

  private async loadCurrentAudioFiles(
    item: SoundItem | SoundItem[]
  ): Promise<HTMLAudioElement[]> {
    const files = Array.isArray(item) ? item : [item];
    const audioBlobs: Blob[] = [];
    const audioURLs: string[] = [];
    const audioElements: HTMLAudioElement[] = [];
    for (const f of files) {
      const buf = await fs.readFile(
        path.join(
          app.getPath('userData'),
          'clips',
          this.props.type,
          f.id as string
        )
      );

      const type = {
        '.aif': 'audio/x-aiff',
        '.ogg': 'audio/ogg',
        '.webm': 'audio/webm',
      }[path.extname(f.id as string).toLowerCase()];
      if (!type) {
        throw new Error('Unsupported audio type');
      }

      const audioBlob = new Blob([buf], { type });
      const audioURL = URL.createObjectURL(audioBlob);
      audioBlobs.push(audioBlob);
      audioURLs.push(audioURL);
      audioElements.push(new Audio(audioURL));
    }
    this.setState({ audioBlobs, audioURLs, audioElements });
    return audioElements;
  }

  @autobind
  public async play() {
    if (!this.player) {
      throw new Error('No audio to play');
    }

    this.setState({ isPlaying: true });
    this.player.play().then(() => this.setState({ isPlaying: false }), noop);
  }

  public render() {
    return (
      <React.Fragment>
        {this.renderModal()}
        <Row style={{ paddingBottom: '1ex' }}>
          <Col md={12}>
            <ProgressBar>
              <ProgressBar
                striped={true}
                max={this.state.answered}
                label={<strong>{this.state.right}</strong>}
                variant="success"
                now={this.state.right}
              />
              <ProgressBar
                striped={true}
                max={this.state.answered}
                label={<strong>{this.state.wrong}</strong>}
                variant="danger"
                now={this.state.wrong}
              />
            </ProgressBar>
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            {/*JSON.stringify(this.state.currentItem)*/ ' '}
            <Button
              variant="primary"
              onClick={this.play}
              disabled={this.state.isPlaying || !this.state.audioElements}
              style={{ marginBottom: '1ex' }}
              id="test-session-play-button"
            >
              <i className="fa fa-play" />
              Play
            </Button>
            <Form>
              <Form.Group as={Form.Row}>
                <FormLabel column={true} sm={2}>
                  Repetitions
                </FormLabel>
                <Col sm={10}>
                  <FormControl
                    type="number"
                    value={this.state.repetitions}
                    step={1}
                    min={1}
                    max={9}
                    onChange={(e) =>
                      this.setState({ repetitions: Number(e.target.value) })
                    }
                    placeholder="Repetitions"
                  />
                </Col>
              </Form.Group>
              <Form.Group as={Form.Row}>
                <Form.Label column={true} sm={2}>
                  Playback speed ×{this.state.audioSpeed}
                </Form.Label>
                <Col sm={10}>
                  <Form.Control
                    type="range"
                    min={0.25}
                    max={3}
                    step={0.25}
                    value={this.state.audioSpeed}
                    onChange={(e) => {
                      this.setState({ audioSpeed: Number(e.target.value) });
                      if (this.player) {
                        this.player.speed = Number(e.target.value);
                      }
                    }}
                  />
                </Col>
              </Form.Group>
            </Form>
          </Col>
        </Row>
        <Row>{this.renderAnswerSection()}</Row>
      </React.Fragment>
    );
  }

  private setPatternGuess(idx: number, id: string | number) {
    const patternGuess = this.state.patternGuess
      ? [...this.state.patternGuess]
      : [null, null, null, null];
    patternGuess[idx] = id;
    this.setState({ patternGuess: patternGuess as any });
  }

  private guessPattern() {
    this.guess({ ids: this.state.patternGuess });
  }

  @autobind
  public renderAnswerSection() {
    if (this.props.mode === 'multiple-choice') {
      if (this.props.type === SoundType.Pattern) {
        const res = [];
        for (let i = 0; i < 4; i++) {
          res.push(
            <ListGroup key={i}>
              <ListGroupItem>
                <strong>{i}.</strong>
              </ListGroupItem>
              {this.props.items.map(({ id, name }) => (
                <Form.Label key={name}>
                  <Form.Check
                    inline={true}
                    type="radio"
                    name={`pattern-guess-${i}`}
                    key={`${this.state.answered}:${i}:${id}`}
                    checked={this.state.patternGuess?.[i] === id}
                    onClick={() => this.setPatternGuess(i, id)}
                  />
                  {name}
                </Form.Label>
              ))}
            </ListGroup>
          );
        }
        res.push(
          <Button
            key="btn"
            onClick={() => this.guessPattern()}
            disabled={
              !this.state.patternGuess ||
              some(this.state.patternGuess, (g) => g === null)
            }
          >
            OK
          </Button>
        );
        return res;
      } else {
        return (
          <ListGroup>
            {this.props.items.map(({ id, name }) => (
              <ListGroupItem
                key={`${this.state.answered}:${id}`}
                onClick={() => this.guess({ id })}
              >
                {name}
              </ListGroupItem>
            ))}
          </ListGroup>
        );
      }
    } else {
      return (
        <form
          onSubmit={(evt) => {
            evt.preventDefault();
            this.guess({ answer: this.state.currentAnswer });
          }}
        >
          <FormGroup>
            <FormControl
              type="text"
              autoFocus={true}
              value={this.state.currentAnswer}
              onChange={this.typeAnswer}
            />
          </FormGroup>
        </form>
      );
    }
  }

  public componentWillUnmount() {
    if (this.closeModalTimeout) {
      clearTimeout(this.closeModalTimeout);
    }
  }

  @autobind
  public typeAnswer(evt) {
    this.setState({
      currentAnswer:
        this.props.type === SoundType.Pattern
          ? { ids: evt.target.value.split(/,\s*/).map((s) => s.trim()) }
          : evt.target.value.trim(),
    });
  }

  @autobind
  public guess(
    answer:
      | { id: number | string }
      | { ids: Array<number | string> }
      | { answer: string }
  ) {
    const currentItem = this.state.currentItem;
    if (!currentItem) {
      throw new Error('No current item');
    }

    let correct;
    if (Array.isArray(currentItem)) {
      const a = answer as { ids: Array<number | string> };
      correct = isEqual(
        a.ids,
        currentItem.map(({ id }) => id)
      );
      const currentAnswerEls = a.ids.map(
        (aId) => find(this.props.items, ({ id }) => id === aId).name
      );
      this.setState({ currentAnswer: currentAnswerEls.join(', ') });
    } else if (answer.hasOwnProperty('id')) {
      const a = answer as { id: number | string };
      correct = a.id === currentItem.id;
      this.setState({
        currentAnswer: find(this.props.items, ({ id }) => id === a.id).name,
      });
    } else {
      const a = answer as { answer: string };
      const fmt = (str) => str.trim().replace(/\s+/g, ' ');
      correct = fmt(a.answer) === fmt(currentItem.name);
    }

    const curStats = this.state.stats;
    const stats = {
      ...curStats,
      [this.props.type]: {
        ...curStats[this.props.type],
        guesses: [
          ...curStats[this.props.type].guesses,
          { answer, correct, timestamp: new Date().toISOString() },
        ],
      },
    };

    if (this.player) {
      this.player.cancel();
      this.player = undefined;
    }
    this.state.audioURLs?.forEach((u) => URL.revokeObjectURL(u));

    this.setState({
      audioBlobs: null,
      audioElements: null,
      audioURLs: null,
      lastAnswerCorrect: correct,
      patternGuess: null,
      showModal: true,
      stats,
    });
    fs.writeJSON(this.statsPath, stats).then(null);
    this.closeModalTimeout = setTimeout(
      this.closeModal,
      3000
    ) as NodeJS.Timeout;
  }

  @autobind
  public async closeModal() {
    if (this.closeModalTimeout) {
      clearTimeout(this.closeModalTimeout);
      this.closeModalTimeout = null;
    }

    const nextItem = this.pickItem(this.props.items);
    this.setState({
      showModal: false,
      currentItem: nextItem,
      currentAnswer: '',
      answered: this.state.answered + 1,
    });
    if (this.state.lastAnswerCorrect) {
      this.setState({ right: this.state.right + 1 });
    } else {
      this.setState({ wrong: this.state.wrong + 1 });
    }
    await this.loadCurrentItem(nextItem);
  }

  public componentDidUpdate(prevProps, prevState) {
    if (this.state.answered !== prevState.answered) {
      document.getElementById('test-session-play-button').focus();
    }
  }

  @autobind
  public renderModal() {
    const content = this.state.lastAnswerCorrect ? (
      <Card.Body>
        <Card.Title>Correct!</Card.Title>
        {this.state.currentAnswer} was the right answer.
      </Card.Body>
    ) : (
      <Card.Body>
        <Card.Title>Wrong!</Card.Title>
        {this.state.currentAnswer} was the wrong answer.
        <br />
        The correct answer was{' '}
        <strong>
          {Array.isArray(this.state.currentItem)
            ? this.state.currentItem.map(({ name }) => name).join(', ')
            : this.state.currentItem.name}
        </strong>
        .
      </Card.Body>
    );

    const cardType = this.state.lastAnswerCorrect ? 'success' : 'danger';
    return (
      <Modal
        show={this.state.showModal}
        onHide={this.closeModal}
        restoreFocus={false}
        size="sm"
      >
        <Modal.Body>
          <Card bg={cardType} border={cardType} text={'white'}>
            <Card.Body>
              <Card.Text>{content}</Card.Text>
            </Card.Body>
          </Card>
          {this.state.lastAnswerCorrect}
        </Modal.Body>
      </Modal>
    );
  }
}
