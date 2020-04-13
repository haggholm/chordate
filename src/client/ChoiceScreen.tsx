import React from 'react';
import { Button, ButtonToolbar, Col, Row } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export default class ChoiceScreen extends React.PureComponent {
  public render() {
    return (
      <Row style={{ paddingTop: '30%' }}>
        <Col md={3} />
        <Col md={6}>
          <ButtonToolbar>
            <LinkContainer to="/record/chord">
              <Button
                block={true}
                variant="primary"
                size="lg"
                href="/record/chord"
              >
                <i className="fa fa-microphone" /> Record
              </Button>
            </LinkContainer>
            <LinkContainer to="/test/chord">
              <Button
                block={true}
                variant="primary"
                size="lg"
                href="/test/chord"
              >
                <i className="fa fa-graduation-cap" /> Practice
              </Button>
            </LinkContainer>
          </ButtonToolbar>
        </Col>
      </Row>
    );
  }
}
