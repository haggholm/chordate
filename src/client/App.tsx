/* tslint:disable:jsx-no-lambda */

import React, { Component } from 'react';
import { Container } from 'react-bootstrap';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// tslint:disable-next-line:no-import-side-effect
import 'bootstrap/dist/css/bootstrap.min.css';
// tslint:disable-next-line:no-import-side-effect
import 'font-awesome/fonts/fontawesome-webfont.woff2';
// tslint:disable-next-line:no-import-side-effect
import 'font-awesome/scss/font-awesome.scss';

// tslint:disable-next-line:no-import-side-effect
import './app.scss';

import ChoiceScreen from './ChoiceScreen';
import Record from './Record';
import Test from './Test';

export default class App extends Component {
  constructor(props) {
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
            <Route render={(/*{props}*/) => <ChoiceScreen />} />
          </Switch>
        </Container>
      </Router>
    );
  }
}
