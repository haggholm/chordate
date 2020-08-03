import { remote } from 'electron';
import * as path from 'path';
import { autobind } from 'core-decorators';
import { find, sample } from 'lodash';
import React, { PureComponent } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  FormLabel,
  FormControl,
  FormGroup,
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
  answered: number;
  right: number;
  wrong: number;
  currentItem?: SoundItem;
  currentAnswer: '';
  lastAnswerCorrect: boolean;
  isPlaying: boolean;
  audioBlob?: Blob;
  audioURL?: string;
  audio?: HTMLAudioElement;
  showModal: boolean;
  stats: {
    [SoundType.Chord]: Stats;
    [SoundType.Note]: Stats;
    [SoundType.Pattern]: Stats;
  };
  repetitions: number;
}

interface Stats {
  guesses: Array<{
    answer: { id: number | string } | { answer: string };
    correct: boolean;
    timestamp: string;
  }>;
}

class Player {
  private audio: HTMLAudioElement;
  private repetitions: number;
  private cancelled: boolean;
  public readonly promise: Promise<void>;
  private resolve: (value?: PromiseLike<void> | void) => void;
  private reject: (reason?: any) => void;
  private eventListener: () => void;

  constructor(audio: HTMLAudioElement, repetitions: number = 1) {
    this.audio = audio;
    this.repetitions = repetitions;
    this.cancelled = false;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  public cancel() {
    this.cancelled = true;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.reject();
  }

  public play() {
    setImmediate(async () => {
      for (let i = 0; i < this.repetitions && !this.cancelled; i++) {
        this.audio.currentTime = 0;
        await Promise.all([
          this.audio.play(),
          new Promise((resolve) => {
            const fn = () => {
              this.audio.removeEventListener('ended', fn);
              resolve();
            };
            this.audio.addEventListener('ended', fn);
          }),
        ]);
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
    const currentItem = sample(props.items);
    this.statsPath = path.join(app.getPath('userData'), 'stats.json');
    this.state = {
      answered: 0,
      right: 0,
      wrong: 0,
      currentItem,
      lastAnswerCorrect: true,
      currentAnswer: '',
      isPlaying: false,
      audioBlob: null,
      audioURL: null,
      audio: null,
      showModal: false,
      stats: fs.pathExistsSync(this.statsPath)
        ? fs.readJSONSync(this.statsPath)
        : {
            [SoundType.Chord]: { guesses: [] },
            [SoundType.Note]: { guesses: [] },
            [SoundType.Pattern]: { guesses: [] },
          },
      repetitions: this.defaultRepetitions,
    };

    this.loadCurrentItem(currentItem);
  }

  @autobind
  public async loadCurrentItem(item: SoundItem) {
    if (this.state.audioURL) {
      URL.revokeObjectURL(this.state.audioURL);
      this.setState({
        audioBlob: null,
        audioURL: null,
        audio: null,
      });
    }

    if (!this.state.currentItem) {
      throw new Error('No current item available');
    }

    if (this.player) {
      this.player.cancel();
      this.player = undefined;
    }

    const buf = await fs.readFile(
      path.join(
        app.getPath('userData'),
        'clips',
        this.props.type,
        item.id as string
      )
    );

    const type = {
      '.aif': 'audio/x-aiff',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
    }[path.extname(this.state.currentItem.id as string).toLowerCase()];
    if (!type) {
      throw new Error('Unsupported audio type');
    }
    const audioBlob = new Blob([buf], { type });
    const audioURL = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioURL);
    this.setState({ audioBlob, audioURL, audio });

    this.player = new Player(audio, this.state.repetitions);
    await this.play();
  }

  @autobind
  public async play() {
    if (!this.player) {
      throw new Error('No audio to play');
    }

    this.setState({ isPlaying: true });
    this.player.play().then(
      () => this.setState({ isPlaying: false }),
      () => {
        // nop
      }
    );
  }

  public render() {
    return (
      <React.Fragment>
        {this.renderModal()}
        <Row>
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
              disabled={this.state.isPlaying || !this.state.audio}
              style={{ marginBottom: '1ex' }}
              id="test-session-play-button"
            >
              <i className="fa fa-play" />
              Play
            </Button>
            <Form>
              <FormGroup controlId="repetitions">
                <FormLabel>Repetitions</FormLabel>
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
              </FormGroup>
            </Form>
          </Col>
        </Row>
        <Row>{this.renderAnswerSection()}</Row>
      </React.Fragment>
    );
  }

  @autobind
  public renderAnswerSection() {
    if (this.props.mode === 'multiple-choice') {
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
    this.setState({ currentAnswer: evt.target.value });
  }

  @autobind
  public guess(answer: { id: number | string } | { answer: string }) {
    const currentItem = this.state.currentItem;
    if (!currentItem) {
      throw new Error('No current item');
    }

    let correct;
    if (answer.hasOwnProperty('id')) {
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
    if (this.state.audioURL) {
      URL.revokeObjectURL(this.state.audioURL);
    }
    this.setState({
      audioBlob: null,
      audioURL: null,
      audio: null,
      showModal: true,
      lastAnswerCorrect: correct,
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

    const nextItem = sample(this.props.items);
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
        The correct answer was <strong>{this.state.currentItem.name}</strong>.
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
