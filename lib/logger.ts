// const winston = require('winston')
import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, printf } = format

const ignoreProdTest = format((info, opts) => {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return false
  }

  return info
})

export const logFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
})

export const logger = createLogger({
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
    logFormat
  ),
  transports: [
    new transports.Console()
  ]
})
