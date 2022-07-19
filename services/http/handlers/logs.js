// config
const redis = require('@config/redis')

// store
const Logs = require('@model/logs')

// utilities

// libraries
const Joi = require('joi')
const _get = require('lodash/get')
const _castArray = require('lodash/castArray')
const _isEmpty = require('lodash/isEmpty')

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

  .get('/summary', async ctx => {
    try {
      const query = ctx.request.query

      const siteTagId = query.site_tag_id

      const data = await Logs.find({ site_tag_id: siteTagId })

      if (!data) {
        ctx.status = 404
        return
      }

      const responseData = {
        site_name: data.sites.name,
        tag_name: data.tags.name
      }

      const viewBy = query.view_by
      if (viewBy === 'daily' || _isEmpty(viewBy)) {
        const daily = await Logs.summaryDaily(siteTagId, query.year_month)
        responseData.daily = (!daily) ? {} : daily
      }

      if (viewBy === 'weekly' || _isEmpty(viewBy)) {
        const weekly = await Logs.summaryWeekly(siteTagId)
        responseData.weekly = weekly
      }

      if (viewBy === 'monthly' || _isEmpty(viewBy)) {
        const monthly = await Logs.summaryMonthly(siteTagId)
        responseData.monthly = monthly
      }

      ctx.body = responseData
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
      term: Joi.string()
        .required(),
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
        term: request.term,
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
