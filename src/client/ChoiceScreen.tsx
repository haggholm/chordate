import React from 'react';
import { Button, ButtonToolbar, Col, Row } from 'react-bootstrap';

export default class ChoiceScreen extends React.PureComponent {
  public render() {
    return (
      <Row style={{ paddingTop: '30%' }}>
        <Col md={3} />
        <Col md={6}>
          <ButtonToolbar>
            <Button
              block={true}
              variant="primary"
              size="lg"
              href="/record/chord"
            >
              <i className="fa fa-microphone" /> Record
            </Button>
            <Button block={true} variant="primary" size="lg" href="/test/chord">
              <i className="fa fa-graduation-cap" /> Practice
            </Button>
          </ButtonToolbar>
        </Col>
      </Row>
    );
  }
}
