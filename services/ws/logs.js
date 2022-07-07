/**
Usage:

const redis = require('@config/redis')

redis.socketEmitUser('logs', 'sample-event-name', 'sample-data')

redis.socketEmitAdmin('logs', 'sample-event-name', 'sample-data')

 */
module.exports = io => {
  io.on('connection', () => {
    console.log('logs socket connected')
  })

  return io
}
