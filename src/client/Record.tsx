import { autobind } from 'core-decorators';
import React, { FormEvent } from 'react';
import {
  Button,
  ButtonGroup,
  Col,
  Form,
  ListGroup,
  ListGroupItem,
  Nav,
  Row,
} from 'react-bootstrap';
import { RouteComponentProps, withRouter } from 'react-router';
import { SoundType } from '../lib/interfaces';

interface ItemType {
  id?: number;
  name: string;
}

function itemCmp(it1, it2) {
  return it1.name < it2.name ? -1 : it1.name === it2.name ? 0 : +1;
}

interface Props {
  type: SoundType;
}

interface State {
  id?: number;
  audioBlob?: Blob;
  name: string;
  audioURL?: string;
  mediaRecorder?: MediaRecorder;
  audio?: HTMLAudioElement;
  isRecording: boolean;
  isPlaying: boolean;
  items: ItemType[];
}

class Record extends React.PureComponent<
  Props & RouteComponentProps<any>,
  State
> {
  public static displayName = 'Record';

  constructor(props) {
    super(props);
    this.state = {
      id: null,
      name: '',
      audio: null,
      isPlaying: false,
      isRecording: false,
      items: [],
    };
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        this.setState({
          mediaRecorder: new MediaRecorder(stream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000,
          }),
        });
      });

    fetch(
      `http://localhost:8080/api/${props.type}/list`
    ).then(async (response) =>
      this.setState({ items: (await response.json()).sort(itemCmp) })
    );
  }

  public render() {
    return (
      <React.Fragment>
        <Row className="show-grid">
          <Col md={12}>
            <h1>Recording</h1>
          </Col>
        </Row>
        <Row className="show-grid">
          <Col md={12}>{this.renderItems()}</Col>
        </Row>
      </React.Fragment>
    );
  }

  public renderItems() {
    return (
      <React.Fragment>
        <Row>
          <Nav variant="tabs" activeKey={`/record/${this.props.type}`}>
            {[
              [SoundType.Chord, 'Chords'],
              [SoundType.Note, 'Notes'],
              [SoundType.Pattern, 'Strumming patterns'],
            ].map(([tp, desc]) => (
              <Nav.Item key={tp}>
                <Nav.Link href={`/record/${tp}`}>{desc}</Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Row>
        <Row style={{ paddingTop: '2ex' }}>
          <Col md={3} xs={12}>
            <ListGroup>
              <ListGroupItem
                onClick={() => this.selectItem(null)}
                active={!this.state.id}
              >
                <i className="fa fa-plus" />
              </ListGroupItem>
              {this.state.items.map((item) => (
                <ListGroupItem
                  key={item.id}
                  onClick={() => this.selectItem(item)}
                  active={item.id === this.state.id}
                >
                  {item.name}
                </ListGroupItem>
              ))}
            </ListGroup>
          </Col>
          <Col md={9} xs={12}>
            {this.renderForm()}
          </Col>
        </Row>
      </React.Fragment>
    );
  }

  public async selectItem(item) {
    if (this.state.audioURL) {
      URL.revokeObjectURL(this.state.audioURL);
    }

    if (!item) {
      this.setState({
        id: null,
        name: '',
        audio: null,
        audioURL: null,
        audioBlob: null,
      });
      return;
    }

    this.setState({
      id: item.id,
      name: item.name,
      audio: null,
      audioURL: null,
      audioBlob: null,
    });

    const response = await fetch(`/api/${this.props.type}/${item.id}`);
    const json = await response.json();
    const buf = Buffer.from(json.data, 'hex');
    const audioBlob = new Blob([buf], { type: 'audio/webm' });
    const audioURL = URL.createObjectURL(audioBlob);

    this.setState({
      audioBlob,
      audioURL,
      audio: new Audio(audioURL),
    });
  }

  public renderForm() {
    if (!this.state.mediaRecorder) {
      return null;
    }

    const isValid =
      this.state.name.length > 0 && this.state.audioBlob && this.props.type;
    const recordButtonStyle = { width: '15em', marginBottom: '1ex' };
    return (
      <React.Fragment>
        <Row>
          <Col xs={0} md={1} />
          <Col xs={12} md={8}>
            <ButtonGroup>
              {!this.state.isRecording ? (
                <Button
                  variant={this.state.audio ? 'warning' : 'primary'}
                  onClick={() => this.startRecording(false)}
                  style={recordButtonStyle}
                >
                  <i className="fa fa-microphone" />{' '}
                  {this.state.audio ? 'Replace recording' : 'New recording'}
                </Button>
              ) : (
                <Button
                  variant="warning"
                  onClick={this.stopRecording}
                  style={recordButtonStyle}
                >
                  <i className="fa fa-microphone-slash" /> Stop recording
                </Button>
              )}
              <Button
                variant="primary"
                onClick={this.play}
                disabled={this.state.isPlaying || !this.state.audio}
                style={{ marginBottom: '1ex' }}
              >
                <i className="fa fa-play" />
                Play
              </Button>
            </ButtonGroup>
          </Col>
        </Row>
        <form>
          <Row className="show-grid">
            <Col xs={0} md={1} />
            <Col xs={12} md={8}>
              <Form.Group controlId="name">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  value={this.state.name}
                  placeholder="E.g. A#, A#-Bb, …"
                  onChange={this.setName}
                />
              </Form.Group>

              <Button type="submit" disabled={!isValid} onClick={this.save}>
                {this.state.id ? 'Update' : 'Create'}
              </Button>
            </Col>
          </Row>
        </form>
      </React.Fragment>
    );
  }

  @autobind
  public startRecording(newRecording?: boolean) {
    if (newRecording) {
      this.setState({ id: null, name: '' });
    }
    this.setState({ isRecording: true });
    this.state.mediaRecorder.start();

    const audioChunks = [];
    this.state.mediaRecorder.addEventListener(
      'dataavailable',
      (event: BlobEvent) => audioChunks.push(event.data)
    );
    this.state.mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioURL = URL.createObjectURL(audioBlob);

      if (this.state.audioURL) {
        URL.revokeObjectURL(this.state.audioURL);
      }

      this.setState({
        audioBlob,
        audioURL,
        audio: new Audio(audioURL),
      });
    });
  }

  @autobind
  public stopRecording() {
    this.state.mediaRecorder.stop();
    this.setState({ isRecording: false });
  }

  @autobind
  public async play() {
    if (!this.state.audio) {
      throw new Error('No audio to play');
    }

    this.setState({ isPlaying: true });
    const fn = () => this.setState({ isPlaying: false });
    await this.state.audio.play();
    this.state.audio.addEventListener('ended', () => {
      this.state.audio.removeEventListener('ended', fn);
      this.setState({ isPlaying: false });
    });
  }

  @autobind
  public setName(evt: FormEvent) {
    // @ts-ignore
    this.setState({ name: evt.target.value });
  }

  @autobind
  public async save(evt) {
    evt.preventDefault();
    if (!this.state.audio) {
      throw new Error('No audio to save');
    }

    const name = this.state.name.trim().replace(/\s+/g, ' ');
    const data = new FormData();
    data.append('name', name);
    data.append('data', this.state.audioBlob);
    if (this.state.id) {
      data.append('id', `${this.state.id}`);
    }

    const res = await fetch(
      `/api/${this.props.type}${this.state.id ? `/${this.state.id}` : ''}`,
      {
        method: 'POST',
        body: data,
      }
    );

    const json = await res.json();
    this.setState({ id: json.id });
    this.updateItem({ name, id: json.id });
  }

  public updateItem({ name, id }) {
    const items = this.state.items.filter((it) => `${it.id}` !== `${id}`);
    items.push({ id, name });
    items.sort((i1, i2) => (i1.name < i2.name ? -1 : +1));
    this.setState({ items });
  }
}

export default withRouter(Record);
