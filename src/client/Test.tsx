/* @flow */

import React, { PureComponent } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import {
  Button,
  ButtonGroup,
  Col,
  Container,
  FormGroup,
  ListGroup,
  ListGroupItem,
  Nav,
  Row,
} from 'react-bootstrap';
import { Link, withRouter } from 'react-router-dom';

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
      testType: TestType.MULTIPLE,
      items: null,
      selectedItems: [],
    };
    fetch(`/api/${props.type}/list`).then(async (response) =>
      this.setState({ items: (await response.json()).sort(itemCmp) })
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
              [SoundType.CHORD, 'Chords'],
              [SoundType.NOTE, 'Notes'],
              [SoundType.PATTERN, 'Strumming patterns'],
            ].map(([tp, desc]) => (
              <Nav.Item>
                <LinkContainer key={tp} to={`/test/${tp}`}>
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
      <form>
        <ListGroup>
          {!this.state.items && (
            <ListGroupItem disabled={true}>No items</ListGroupItem>
          )}
          {(this.state.items || []).map((item) => (
            <ListGroupItem
              key={item.name}
              variant={item.checked ? 'success' : 'info'}
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
              onClick={() => this.start(TestType.MULTIPLE)}
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
              onClick={() => this.start(TestType.ENTRY)}
            >
              Type answers
            </Button>
          </ButtonGroup>
        </FormGroup>
      </form>
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
