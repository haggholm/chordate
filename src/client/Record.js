/* @flow */

import _ from 'lodash';
import { autobind } from 'core-decorators';
import React from 'react';
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Col,
  ControlLabel,
  FormControl,
  FormGroup,
  Grid,
  HelpBlock,
  ListGroup,
  ListGroupItem,
  PageHeader,
  Panel,
  Row,
  Tab, Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-bootstrap';


type ItemType = {
  id: number,
  name: string
};


function itemCmp(it1, it2) {
  return it1.name < it2.name ? -1 : (it1.name === it2.name ? 0 : +1);
}


export default class Record extends React.PureComponent {
  static displayName = 'Record';

  state: {
    audioBlob: ?Blob,
    audioURL: ?URL,
    mediaRecorder: ?MediaStream,
    audio: HTMLAudioElement,
    isRecording: boolean,
    isPlaying: boolean,
    type: 'chord' | 'note' | 'strumming_pattern'
  };

  constructor() {
    super(...arguments);
    this.state = {
      id: null,
      name: '',
      type: 'chord',
      isPlaying: false,
      isRecording: false,
      chords: [],
      notes: [],
      strummingPatterns: []
    };
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        this.setState({
          mediaRecorder: new MediaRecorder(stream, { mimeType: 'audio/webm', audioBitsPerSecond : 128000 })
        });
      });

    fetch('/api/chord/list').then(async (response) => this.setState({ chords: (await response.json()).sort(itemCmp) }));
    fetch('/api/note/list').then(async (response) => this.setState({ notes: (await response.json()).sort(itemCmp) }));
    fetch('/api/strumming_pattern/list').then(async (response) => this.setState({ strumming_patterns: (await response.json()).sort(itemCmp) }));
  }

  @autobind
  setType(tp: 'chord' | 'note' | 'strumming_pattern') {
    if (tp === this.state.type) {
      return;
    }

    if (this.state.audioURL) {
      URL.revokeObjectURL(this.state.audioURL);
    }
    this.setState({
      id: null,
      type: tp,
      name: '',
      audio: null,
      audioURL: null,
      audioBlob: null
    });
  }

  render() {
    console.log(this.state);
    return (
      <Grid>
        <Row className="show-grid">
          <Col md={12}><PageHeader>Recording</PageHeader></Col>
        </Row>
        <Row className="show-grid">
          <Col md={12}>{this.renderItems()}</Col>
        </Row>
      </Grid>
    );
  }

  renderItems() {
    return (
      <Tabs
        activeKey={this.state.type}
        onSelect={this.setType}>
        {[['chord', 'Chords'], ['note', 'Notes'], ['strummingPattern', 'Strumming patterns']].map(([tp, desc]) => (
          <Tab key={tp} eventKey={tp} title={desc} className="form-tabs">
            <Col md={3}>
              <ListGroup>
                <ListGroupItem onClick={() => this.selectItem(tp, null)} active={!this.state.id}>
                  <i className="fa fa-plus"/>
                </ListGroupItem>
                {this.state[`${tp}s`].map((item) => (
                  <ListGroupItem key={item.id} onClick={() => this.selectItem(tp, item)} active={item.id === this.state.id}>
                    {item.name}
                  </ListGroupItem>
                ))}
              </ListGroup>
            </Col>
            <Col md={9}>
              { tp === this.state.type && this.renderForm() }
            </Col>
          </Tab>
        ))}
      </Tabs>
    );
  }

  async selectItem(tp, item) {
    if (this.state.audioURL) {
      URL.revokeObjectURL(this.state.audioURL);
    }

    if (!item) {
      this.setState({
        id: null,
        type: tp,
        name: '',
        audio: null,
        audioURL: null,
        audioBlob: null
      });
      return;
    }

    this.setState({
      id: item.id,
      type: tp,
      name: item.name,
      audio: null,
      audioURL: null,
      audioBlob: null
    });

    const response = await fetch(`/api/${tp}/${item.id}`);
    const json = await response.json();
    const buf = Buffer.from(json.data, 'hex');
    console.log({ buf });
    const audioBlob = new Blob([buf], { type: 'audio/webm' });
    console.log(audioBlob);
    const audioURL = URL.createObjectURL(audioBlob);

    this.setState({
      audioBlob,
      audioURL,
      audio: new Audio(audioURL)
    });
  }

  renderForm() {
    if (!this.state.mediaRecorder) {
      return (
        <div>
          Initializing…
        </div>
      );
    }

    const isValid = (
      this.state.name.length > 0 &&
      this.state.audioBlob &&
      this.state.type
    );
    const recordButtonStyle = {width: '15em', marginBottom: '1ex'};
    return (
      <React.Fragment>
        <Row className="show-grid">
          <Col xs={0} md={1}/>
          <Col xs={12} md={8}>
            <ButtonGroup>
            {!this.state.isRecording
              ? (
                <Button
                  bsStyle={ this.state.audio ? 'warning' : 'primary' }
                  onClick={() => this.startRecording(false)} style={recordButtonStyle}>
                  <i className="fa fa-microphone"/>
                  {' '}
                  { this.state.audio ? 'Replace recording' : 'New recording' }
                </Button>
              )
              : (
                <Button bsStyle="warning" onClick={this.stopRecording} style={recordButtonStyle}>
                  <i className="fa fa-microphone-slash"/>
                  {' '}
                  Stop recording
                </Button>
              )
            }
              <Button bsStyle="primary" onClick={this.play} disabled={this.state.isPlaying || !this.state.audio}
                      style={{ marginBottom: '1ex' }}>
                <i className="fa fa-play"/>
                Play
              </Button>
            </ButtonGroup>
          </Col>
        </Row>
        <form>
          <Row className="show-grid">
            <Col xs={0} md={1}/>
            <Col xs={12} md={8}>
              <FormGroup controlId="name">
                <ControlLabel>Name</ControlLabel>
                <FormControl type="text" value={this.state.name} placeholder="E.g. A#, A#-Bb, …" onChange={this.setName}/>
              </FormGroup>

              <Button type="submit" disabled={!isValid} onClick={this.save}>{this.state.id ? 'Update' : 'Create'}</Button>
            </Col>
          </Row>
        </form>
      </React.Fragment>
    );
  }

  @autobind
  startRecording(newRecording) {
    if (newRecording) {
      this.setState({ id: null, name: '' })
    }
    this.setState({ isRecording: true });
    this.state.mediaRecorder.start();

    const audioChunks = [];
    this.state.mediaRecorder.addEventListener('dataavailable', (event) => {
      console.log(event.data);
      audioChunks.push(event.data);
    });
    this.state.mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioURL = URL.createObjectURL(audioBlob);

      if (this.state.audioURL) {
        URL.revokeObjectURL(this.state.audioURL);
      }

      this.setState({
        audioBlob,
        audioURL,
        audio: new Audio(audioURL)
      });
    });
  }

  @autobind
  stopRecording() {
    this.state.mediaRecorder.stop();
    this.setState({ isRecording: false });
  }

  @autobind
  async play() {
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
  setName(evt) {
    this.setState({ name: evt.target.value.trim() });
  }

  @autobind
  async save(evt) {
    evt.preventDefault();
    if (!this.state.audio) {
      throw new Error('No audio to save');
    }

    const data = new FormData();
    data.append('name', this.state.name.trim());
    data.append('data', this.state.audioBlob);
    console.log('Save blob', this.state.audioBlob);
    const res = await fetch(`/api/${this.state.type}`, {
      method: 'POST',
      body: data
    });
    const json = await res.json();
    this.setState({ id: json.id });
    this.updateItem({
      type: this.state.type,
      name: this.state.name.trim(),
      id: json.id
    });
  }

  updateItem({ type, name, id }) {
    const items = this.state[`${type}s`].filter(({ id: itemId }) => itemId !== id);
    items.push({ id, name });
    items.sort((i1, i2) => i1.name < i2.name ? -1 : +1);
    this.setState({ [`${type}s`]: items });
  }
}
