/* @flow */

import _ from 'lodash';
import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';
import {
  Button,
  ButtonGroup,
  Checkbox,
  ButtonToolbar,
  Col,
  ControlLabel,
  FormControl,
  FormGroup,
  Grid,ProgressBar,
  HelpBlock,
  ListGroup, Modal,
  ListGroupItem, InputGroup,
  PageHeader,
  Panel,
  Row,
  Tab, Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-bootstrap';
import { autobind } from 'core-decorators';


function itemCmp(it1, it2) {
  return it1.name < it2.name ? -1 : (it1.name === it2.name ? 0 : +1);
}


@withRouter
class Test extends PureComponent {
  constructor(props) {
    super(...arguments);
    this.state = {
      mode: 'setup',
      testType: 'multiple-choice',
      items: null,
      selectedItems: [],
    };
    fetch(`/api/${props.type}/list`).then(async (response) => this.setState({ items: (await response.json()).sort(itemCmp) }));
  }

  render() {
    return (
      <Grid>
        <Row className="show-grid">
          <Col md={12}><PageHeader>Testing</PageHeader></Col>
        </Row>
        <Row className="show-grid">
          <Col md={12}>
            <Tabs
              justified
              activeKey={this.props.type}
              onSelect={this.setType}>
              {[['chord', 'Chords'], ['note', 'Notes'], ['strummingPattern', 'Strumming patterns']].map(([tp, desc]) => (
                <Tab key={tp} eventKey={tp} title={desc} className="form-tabs">
                  { !this.state.items ? null : (
                    this.state.mode === 'setup' ?
                    this.renderChecklist() :
                    <TestSession
                      type={this.props.type}
                      mode={this.state.testType}
                      items={this.state.selectedItems}/>
                  )}
                </Tab>
              ))}
            </Tabs>
          </Col>
        </Row>
      </Grid>
    );
  }

  renderChecklist() {
    return (
      <form>
        <ListGroup>
          {this.state.items.map((item) => (
            <ListGroupItem bsStyle={ item.checked && 'success' } onClick={() => this.toggleChecked(item)}>
              { item.checked ? <i className="fa fa-check-square-o pull-left"/> : <i className="fa fa-square-o pull-left"/> }
              { item.name }
            </ListGroupItem>
          ))}
        </ListGroup>
        <FormGroup>
          <ButtonGroup>
            <Button disabled>Start test</Button>
            <Button
              bsStyle="primary"
              type="submit"
              disabled={this.state.items.filter(({ checked}) => checked).length < 2}
              onClick={() => this.start('multiple-choice')}>Multiple choice</Button>
            <Button
              bsStyle="primary"
              type="submit"
              disabled={this.state.items.filter(({ checked}) => checked).length < 2}
              onClick={() => this.start('text-entry')}>Type answers</Button>
          </ButtonGroup>
        </FormGroup>
      </form>
    )
  }

  toggleChecked(item) {
    const items = this.state.items.map((it) => {
      if (it === item) {
        return Object.assign({}, item, { checked: !item.checked });
      } else {
        return it;
      }
    });
    this.setState({
      items: items,
      selectedItems: items.filter(({ checked }) => checked),
    });
  }

  start(testType) {
    this.setState({ mode: 'test', testType });
  }
}

export default Test;


class TestSession extends PureComponent {
  props: {
    type: 'chord' | 'note' | 'strumming_pattern',
    mode: 'multiple-choice' | 'text-entry',
    items: Object[]
  };

  playButton: ?HTMLElement;

  constructor(props) {
    super(...arguments);
    this.state = {
      answered: 0,
      right: 0,
      wrong: 0,
      currentItem: _.sample(props.items),
      currentAnswer: '',
      isPlaying: false,
      audioBlob: null,
      audioURL: null,
      audio: null,
    };

    this.loadCurrentItem(props);
  }


  @autobind
  async loadCurrentItem(props = null) {
    if (!props) {
      props = this.props;
    }
    if (this.state.audioURL) {
      URL.revokeObjectURL(this.state.audioURL);
      this.setState({
        audioBlob: null,
        audioURL: null,
        audio: null
      });
    }

    const response = await fetch(`/api/${props.type}/${this.state.currentItem.id}`);
    const json = await response.json();
    const buf = Buffer.from(json.data, 'hex');
    const audioBlob = new Blob([buf], { type: 'audio/webm' });
    const audioURL = URL.createObjectURL(audioBlob);

    this.setState({
      audioBlob,
      audioURL,
      audio: new Audio(audioURL)
    });
    this.play();
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

  render() {
    return (
      <React.Fragment>
        { this.renderModal() }
        <Row md={12}>
          <ProgressBar>
            <ProgressBar
              striped
              max={this.state.answered}
              label={<strong>{this.state.right}</strong>}
              bsStyle="success"
              now={this.state.right} />
            <ProgressBar striped max={this.state.answered} label={this.state.wrong} bsStyle="danger" now={this.state.wrong} />
            <ProgressBar
              striped
              max={this.state.answered}
              label={<strong>{this.state.wrong}</strong>}
              bsStyle="danger"
              now={this.state.wrong} />
          </ProgressBar>
        </Row>
        <Row md={12}>
          <Button
            bsStyle="primary"
            onClick={this.play}
            disabled={this.state.isPlaying || !this.state.audio}
            style={{ marginBottom: '1ex' }}
            id="test-session-play-button">
            <i className="fa fa-play"/>
            Play
          </Button>
        </Row>
        <Row>
          { this.renderAnswerSection() }
        </Row>
      </React.Fragment>
    );
  }


  @autobind
  renderAnswerSection() {
    if (this.props.mode === 'multiple-choice') {
      return (
        <ListGroup>
          {this.props.items.map(({ id, name }) => (
            <ListGroupItem key={`${this.state.answered}:${id}`} onClick={() => this.guess({ id })}>
              { name }
            </ListGroupItem>
          ))}
        </ListGroup>
      );
    } else {
      return (
        <form onSubmit={(evt) => {
          evt.preventDefault();
          this.guess({ answer: this.state.currentAnswer })
        }}>
          <FormGroup>
            <FormControl
              type="text"
              autoFocus={true}
              value={this.state.currentAnswer}
              onChange={this.typeAnswer}/>
          </FormGroup>
        </form>
      )
    }
  }


  componentWillUnmount() {
    if (this.closeModalTimeout) {
      clearTimeout(this.closeModalTimeout);
    }
  }


  @autobind
  typeAnswer(evt) {
    this.setState({ currentAnswer: evt.target.value });
  }


  @autobind
  guess(answer: { id: number } | { answer: string }) {
    let correct;
    if (answer.id) {
      correct = answer.id === this.state.currentItem.id;
      this.setState({ currentAnswer: _.find(this.props.items, ({ id }) => id === answer.id).name })
    } else {
      const fmt = (str) => str.trim().replace(/\s+/g, ' ');
      correct = (
        fmt(answer.answer) === fmt(this.state.currentItem.name)
      );
    }

    this.setState({
      showModal: true,
      lastAnswerCorrect: correct
    });
    this.closeModalTimeout = setTimeout(this.closeModal, 3000);
  }


  @autobind
  closeModal() {
    if (this.closeModalTimeout) {
      clearTimeout(this.closeModalTimeout);
      this.closeModalTimeout = null;
    }

    this.setState(Object.assign(
      {
        showModal: false,
        currentItem: _.sample(this.props.items),
        currentAnswer: '',
        answered: this.state.answered + 1,
      },
      this.state.lastAnswerCorrect ? { right: this.state.right + 1 } : { wrong: this.state.wrong + 1 }
    ));
    this.loadCurrentItem();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.answered !== prevState.answered) {
      document.getElementById('test-session-play-button').focus();
    }
  }

  @autobind
  renderModal() {
    const content = this.state.lastAnswerCorrect ?
      (
        <React.Fragment>
          <Panel.Heading>
            <Panel.Title componentClass="h3">Correct!</Panel.Title>
          </Panel.Heading>
          <Panel.Body>{ this.state.currentAnswer } was the right answer.</Panel.Body>
        </React.Fragment>
      ) :
      (
        <React.Fragment>
          <Panel.Heading>
            <Panel.Title componentClass="h3">Wrong!</Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            { this.state.currentAnswer } was the wrong answer.<br/>
            The correct answer was <strong>{ this.state.currentItem.name }</strong>.
          </Panel.Body>
        </React.Fragment>
      );

    return (
      <Modal
        show={this.state.showModal}
        onHide={() => this.closeModal()}
        restoreFocus={false}
        bsSize="small">
        <Modal.Body>
          <Panel bsStyle={ this.state.lastAnswerCorrect ? 'success' : 'danger' }>
            { content }
          </Panel>
          { this.state.lastAnswerCorrect }
        </Modal.Body>
      </Modal>
    );
  }
}
