const redis = require('redis')
const env = require('@config/env')

const state = {
  client: null,
  publisher: null
}

async function connect () {
  if (state.client) {
    console.log('A client is already registered. Use `duplicate` instead')
    return state.client
  }

  const isntance = redis.createClient({
    url: `redis://@${env.REDIS_HOST}:${env.REDIS_PORT}`
  })

  await isntance.connect()

  isntance.on('error', e => console.log('Redis instance: ', e.stack))

  return isntance
}

async function start () {
  state.client = await connect()
  state.publisher = await duplicate()
}

async function duplicate () {
  const instance = state.client.duplicate()

  await instance.connect()

  return instance
}

async function subscribe (url, handler) {
  const sub = await duplicate()

  sub.subscribe(url, handler)
}

function emitSocketAdmin (namespace, event, data) {
  return state.publisher.publish(
    `socket:admin_events:${namespace}:${event}`,
    JSON.stringify(data)
  )
}

function emitSocketUser (namespace, event, data) {
  return state.publisher.publish(
    `socket:user_events:${namespace}:${event}`,
    JSON.stringify(data)
  )
}

function emitApp (namespace, event, data) {
  return state.publisher.publish(
    `app:${namespace}:${event}`,
    JSON.stringify(data)
  )
}

module.exports = {
  client: state.client,
  publisher: state.publisher,
  subscriber: state.subscriber,
  start,
  subscribe,
  duplicate,
  emitSocketAdmin,
  emitSocketUser,
  emitApp
}
