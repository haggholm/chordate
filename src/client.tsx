import React from 'react';
import ReactDOM from 'react-dom';
import App from './client/App';

const main = () => ReactDOM.render(<App />, document.getElementById('root'));
if (
  document.readyState === 'complete' ||
  document.readyState === 'interactive'
) {
  setImmediate(main);
} else {
  document.addEventListener('DOMContentLoaded', main);
}
