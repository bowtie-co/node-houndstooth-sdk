// const winston = require('winston')
const { createLogger, format, transports } = require('winston')
const { combine, timestamp, label, printf } = format

const ignoreProdTest = format((info, opts) => {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return false
  }

  return info
})

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
})

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
    ignoreProdTest(),
    label({ label: 'Houndstooth' }),
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.Console()
  ]
})

module.exports = logger
