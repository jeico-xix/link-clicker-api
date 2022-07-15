// config
const redis = require('@config/redis')

// store
const Logs = require('@model/logs')

// utilities

// libraries
const Joi = require('joi')
const _get = require('lodash/get')
const _castArray = require('lodash/castArray')

// middlewares
const authentication = require('@middleware/authentication')

module.exports = ({ router }) => router
  .prefix('/logs')

  .use(authentication())

  .get('/', async ctx => {
    try {
      const query = ctx.request.query
      const params = {
        filterBy: _castArray(query['filter_by[]'] || query.filter_by || []),
        q: _castArray(query['q[]'] || query.q || []),
        page: query.page,
        rows: query.rows,
        sortBy: query.sort_by,
        sort: query.sort,
        dateBy: query.date_by,
        dateFrom: query.date_from,
        dateTo: query.date_to,
        status: query.status
      }

      const list = await Logs.list({ ...params })
      const count = await Logs.list({ ...params, isCount: true })

      ctx.body = { count, list }
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .post('/', async ctx => {
    const schema = Joi.object({
      site_tag_id: Joi.number()
        .required(),
      country_id: Joi.number()
        .optional()
        .allow(null),
      ip: Joi.string()
        .required(),
      started_at: Joi.string()
        .required()
    })

    try {
      const request = await schema.validateAsync(ctx.request.body)
      const inserted = await Logs.store({
        site_tag_id: request.site_tag_id,
        country_id: request.country_id,
        ip: request.ip,
        started_at: request.started_at
      })

      redis.emitSocketUser('logs', 'insert', inserted)

      ctx.status = 200
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .post('unauth', '/boot', async ctx => {
    try {
      await Logs.boot()

      ctx.status = 200
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .patch('/', async ctx => {
    const schema = Joi.object({
      site_tag_id: Joi.number()
        .required(),
      status: Joi.string()
        .optional(),
      page: Joi.number()
        .allow(null)
        .optional(),
      finished_at: Joi.string()
        .required()
    })

    try {
      const data = await schema.validateAsync(ctx.request.body)

      await Logs.modify(ctx.request.body.site_tag_id, data)

      redis.emitSocketUser('logs', 'insert', {})

      ctx.status = 204
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })
