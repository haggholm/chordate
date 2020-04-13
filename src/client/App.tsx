import React, { Component } from 'react';
import { Container } from 'react-bootstrap';
import {
  MemoryRouter as Router,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/fonts/fontawesome-webfont.woff2';
import 'font-awesome/scss/font-awesome.scss';

import './app.scss';

import ChoiceScreen from './ChoiceScreen';
import Record from './Record';
import Test from './Test';

export default class App extends Component {
  constructor(props: any) {
    super(props);
    this.state = {};
  }

  public render() {
    return (
      <Router>
        <Container>
          <Switch>
            <Route
              path="/record/:type"
              render={(props) => (
                <Record type={props.match.params.type} {...props} />
              )}
            />
            <Route
              path="/test/:type"
              render={(props) => (
                <Test type={props.match.params.type} {...props} />
              )}
            />
            <Route render={(/* props */) => <Redirect to="/test/chord" />} />
          </Switch>
        </Container>
      </Router>
    );

    // <Route render={(/*{props}*/) => <ChoiceScreen />} />
  }
}
