#!/usr/bin/env node

import express from 'express';
import browserify from 'browserify-middleware';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import http from 'http';

const app = express();

const clientHtml = readFileSync(resolve(__dirname, 'client.html'), 'utf-8');

app.get('/client.js', browserify(resolve(__dirname, 'client.js')));
app.get('/', (req, res) => res.redirect('/app'));
app.get('/app*', (req, res) => res.send(clientHtml));

http.createServer(app).listen(process.env.PORT || 8080);
