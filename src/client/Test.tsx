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

function itemCmp(it1: SoundItem, it2: SoundItem): -1 | 0 | 1 {
  return it1.name < it2.name ? -1 : it1.name === it2.name ? 0 : +1;
}

interface TestProps {
  type: SoundType;
}
interface TestState {
  mode: 'setup' | 'test';
  testType: TestType;
  items?: Array<SoundItem & { checked?: boolean }>;
  selectedItems: Array<SoundItem & { checked?: boolean }>;
}

class Test extends PureComponent<TestProps, TestState> {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'setup',
      testType: TestType.MultipleChoice,
      items: null,
      selectedItems: [],
    };

    fs.readdir(`/home/petter/projects/chordate/clips`).then((files) =>
      this.setState({
        items: files.map((f) => ({
          id: f,
          type: SoundType.Note,
          name: path
            .basename(f)
            .substr(0, path.basename(f).length - path.extname(f).length),
        })),
      })
    );
  }

  public render() {
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
                  <Nav.Link href={`/test/${tp}`}>{desc}</Nav.Link>
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
    return (
      <Form>
        {!this.state.items && (
          <ListGroupItem disabled={true}>No items</ListGroupItem>
        )}
        <Form.Row>
          {chunk(
            this.state.items ?? [],
            Math.ceil((this.state.items ?? []).length / 3)
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
                    (this.state.items || []).filter(({ checked }) => checked)
                      .length < 2
                  }
                  onClick={() => this.start(TestType.MultipleChoice)}
                >
                  Multiple choice
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={
                    (this.state.items || []).filter(({ checked }) => checked)
                      .length < 2
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
    const items = this.state.items.map((it) => {
      if (it === item) {
        return Object.assign({}, item, { checked: !item.checked });
      } else {
        return it;
      }
    });
    this.setState({
      items,
      selectedItems: items.filter(({ checked }) => checked),
    });
  }

  public start(testType) {
    this.setState({ mode: 'test', testType });
  }
}

export default withRouter(Test);
