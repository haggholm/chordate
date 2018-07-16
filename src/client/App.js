import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';

import { ButtonToolbar, Button, Grid, Row, Col } from 'react-bootstrap';

import 'font-awesome/fonts/fontawesome-webfont.woff2';
import 'font-awesome/scss/font-awesome.scss';
import 'bootstrap-sass/assets/stylesheets/_bootstrap.scss';
import './app.scss';


import Record from './Record';
import Test from './Test';


class ChoiceScreen extends React.PureComponent {
  render() {
    return (
      <Row style={{ paddingTop: '30%' }}>
        <Col md={3}/>
        <Col md={6}>
          <ButtonToolbar>
            <Button block bsStyle="primary" bsSize="large" href="/record/chord">
              <i className="fa fa-microphone"/>{' '}
              Record
            </Button>
            <Button block bsStyle="primary" bsSize="large" href="/test/chord">
              <i className="fa fa-graduation-cap"/>{' '}
              Practice
            </Button>
          </ButtonToolbar>
        </Col>
      </Row>
    );
  }
}


export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = { };
    // fetch('/api/getUsername')
    //   .then(res => res.json())
    //   .then(user => this.setState({ username: user.username }));
  }

  render() {
    return (
      <Router>
        <Grid>
          <Switch>
            <Route path="/record/:type" render={(props) => (<Record type={props.match.params.type} {...props}/>)} />
            <Route path="/test/:type" render={(props) => (<Test type={props.match.params.type} {...props}/>)} />
            <Route render={(props) => <ChoiceScreen {...props}/>} />
          </Switch>
        </Grid>
      </Router>
    );
  }
}
