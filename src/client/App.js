import React, { Component } from 'react';

import 'font-awesome/fonts/fontawesome-webfont.woff2';
import 'font-awesome/scss/font-awesome.scss';
import 'bootstrap-sass/assets/stylesheets/_bootstrap.scss';
import './app.scss';


import Record from './Record';

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
      <Record />
    );
  }
}
