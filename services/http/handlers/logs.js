// config
const redis = require('@config/redis')

// store
const Logs = require('@model/logs')

// utilities

// libraries
const Joi = require('joi')
const _get = require('lodash/get')

// middlewares
const authentication = require('@middleware/authentication')

module.exports = ({ router }) => router
  .prefix('/logs')

  .use(authentication())

  .get('/', async ctx => {
    try {
      const query = ctx.request.query
      const params = {
        filterBy: query.filter_by,
        q: query.q,
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

      ctx.body = { count: _get(count, 'total', 0), list }
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .post('/', async ctx => {
    const schema = Joi.object({
      site_tag_id: Joi.number()
        .required(),
      status: Joi.string()
        .required(),
      page: Joi.number()
        .allow(null)
        .optional(),
      started_at: Joi.string()
        .required(),
      finished_at: Joi.string()
        .required()
    })

    try {
      const request = await schema.validateAsync(ctx.request.body)
      const inserted = await Logs.store({
        site_tag_id: request.site_tag_id,
        status: request.status,
        page: request.page,
        started_at: request.started_at,
        finished_at: request.finished_at
      })

      redis.emitSocketUser('logs', 'insert', inserted)

      ctx.status = 200
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })
