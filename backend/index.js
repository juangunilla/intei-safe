require('dotenv').config();

const express = require('express');
const connectDB = require('./src/config/db');
const application = require('./src/app');

const app = express();
let connectionPromise;

app.use(async (_req, _res, next) => {
  try {
    connectionPromise ||= connectDB();
    await connectionPromise;
    next();
  } catch (error) {
    connectionPromise = undefined;
    next(error);
  }
});

app.use(application);

module.exports = app;
