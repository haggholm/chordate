import { remote } from 'electron';
const app = remote.app;

import { chunk } from 'lodash';
import React, { PureComponent } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import {
  Button,
  ButtonGroup,
  Col,
  Container,
  Form,
  FormGroup,
  ListGroup,
  ListGroupItem,
  Nav,
  Row,
} from 'react-bootstrap';
import { withRouter } from 'react-router-dom';
import * as fs from 'fs-extra';
import * as path from 'path';

import { SoundItem, SoundType, TestType } from '../lib/interfaces';
import TestSession from './TestSession';

interface TestProps {
  type: SoundType;
}
interface TestState {
  mode: 'setup' | 'test';
  testType: TestType;
  itemsByType: {
    [SoundType.Chord]?: Array<SoundItem & { checked?: boolean }>;
    [SoundType.Note]?: Array<SoundItem & { checked?: boolean }>;
    [SoundType.Pattern]?: Array<SoundItem & { checked?: boolean }>;
  };
  selectedItems: Array<SoundItem & { checked?: boolean }>;
}

class Test extends PureComponent<TestProps, TestState> {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'setup',
      testType: TestType.MultipleChoice,
      itemsByType: {
        [SoundType.Chord]: undefined,
        [SoundType.Note]: null,
        [SoundType.Pattern]: null,
      },
      selectedItems: [],
    };

    const fileOb = {
      [SoundType.Chord]: undefined,
      [SoundType.Note]: null,
      [SoundType.Pattern]: null,
    };
    Promise.all(
      Object.values(SoundType).map((tp) => {
        const clipPath = path.join(app.getPath('userData'), 'clips', tp);
        if (!fs.pathExistsSync(clipPath)) {
          alert('Expected to find clips in ' + clipPath);
        } else {
          fs.readdir(clipPath).then((files) => {
            fileOb[tp] = files.map((f) => ({
              id: f,
              type: SoundType.Note,
              name: path
                .basename(f)
                .substr(0, path.basename(f).length - path.extname(f).length),
            }));
            this.setState({ itemsByType: fileOb });
          });
        }
      })
    );
  }

  public render() {
    console.log([
      [SoundType.Chord, 'Chords'],
      [SoundType.Note, 'Notes'],
      [SoundType.Pattern, 'Strumming patterns'],
    ]);
    console.log(this.props.type);
    console.log('activeKey', `/test/${this.props.type}`);
    return (
      <Container>
        <Row>
          <Col md={12}>
            <h1>Testing</h1>
          </Col>
        </Row>
        <Row>
          <Nav variant="tabs" activeKey={`/test/${this.props.type}`}>
            {[
              [SoundType.Chord, 'Chords'],
              [SoundType.Note, 'Notes'],
              [SoundType.Pattern, 'Strumming patterns'],
            ].map(([tp, desc]) => (
              <Nav.Item key={tp}>
                <LinkContainer to={`/test/${tp}`}>
                  <Nav.Link
                    eventKey={`/test/${tp}`}
                    href={`/test/${tp}`}
                    disabled={this.state.mode === 'test'}
                  >
                    {desc}
                  </Nav.Link>
                </LinkContainer>
              </Nav.Item>
            ))}
          </Nav>
        </Row>
        <Row style={{ paddingTop: '2ex' }}>
          <Col md={12}>
            {this.state.mode === 'setup' ? (
              this.renderChecklist()
            ) : (
              <TestSession
                type={this.props.type}
                mode={this.state.testType}
                items={this.state.selectedItems}
              />
            )}
          </Col>
        </Row>
      </Container>
    );
  }

  public renderChecklist() {
    const tp = this.props.type;
    return (
      <Form>
        {!this.state.itemsByType[tp] && (
          <ListGroupItem disabled={true}>No items</ListGroupItem>
        )}
        <Form.Row>
          {chunk(
            this.state.itemsByType[tp] ?? [],
            Math.ceil((this.state.itemsByType[tp] ?? []).length / 3)
          ).map((items, idx) => (
            <Col key={idx}>
              <ListGroup>
                {items.map((item) => (
                  <ListGroupItem
                    key={item.name}
                    active={item.checked}
                    onClick={() => this.toggleChecked(item)}
                  >
                    {item.checked ? (
                      <i className="fa fa-check-square-o pull-left" />
                    ) : (
                      <i className="fa fa-square-o pull-left" />
                    )}
                    {item.name}
                  </ListGroupItem>
                ))}
              </ListGroup>
            </Col>
          ))}
        </Form.Row>
        <br />
        <Form.Row>
          <Col md={3} />
          <Col md="auto">
            <FormGroup>
              <ButtonGroup>
                <Button disabled={true}>Start test</Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={
                    (this.state.itemsByType[tp] || []).filter(
                      ({ checked }) => checked
                    ).length < 2
                  }
                  onClick={() => this.start(TestType.MultipleChoice)}
                >
                  Multiple choice
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={
                    (this.state.itemsByType[tp] || []).filter(
                      ({ checked }) => checked
                    ).length < 2
                  }
                  onClick={() => this.start(TestType.Entry)}
                >
                  Type answers
                </Button>
              </ButtonGroup>
            </FormGroup>
          </Col>
          <Col md={3} />
        </Form.Row>
      </Form>
    );
  }

  public toggleChecked(item) {
    const tp = this.props.type;
    const items = this.state.itemsByType[tp].map((it) => {
      if (it === item) {
        return Object.assign({}, item, { checked: !item.checked });
      } else {
        return it;
      }
    });
    this.setState({
      itemsByType: {
        ...this.state.itemsByType,
        [tp]: items,
      },
      selectedItems: items.filter(({ checked }) => checked),
    });
  }

  public start(testType) {
    this.setState({ mode: 'test', testType });
  }
}

export default withRouter(Test);
