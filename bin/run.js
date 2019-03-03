#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');

const cp = childProcess.spawn('npm', ['run', 'dev'], {
	cwd: `${__dirname}/..`,
	stdio: 'inherit',
});
cp.on('exit', (code) => process.exit(code));
