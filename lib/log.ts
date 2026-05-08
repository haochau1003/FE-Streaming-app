/* eslint-disable no-console */
const noop = () => {};

export const log = {
  debug: __DEV__ ? console.debug.bind(console, '[debug]') : noop,
  info: __DEV__ ? console.info.bind(console, '[info]') : noop,
  warn: console.warn.bind(console, '[warn]'),
  error: console.error.bind(console, '[error]'),
};
