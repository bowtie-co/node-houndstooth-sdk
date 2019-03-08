// const winston = require('winston')
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
  level: 'info',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
    silly: 5
  },
  format: combine(
    label({ label: 'Houndstooth' }),
    timestamp(),
    myFormat
  ),
  transports: [new transports.Console()]
});

// const logger = winston.createLogger({
  // level: 'info',
  // levels: {
  //   error: 0,
  //   warn: 1,
  //   info: 2,
  //   verbose: 3,
  //   debug: 4,
  //   silly: 5
  // },
//   transports: [new winston.transports.Console({
//     format: winston.format.simple()
//   })]
// })

module.exports = logger
