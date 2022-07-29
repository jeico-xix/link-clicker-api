// config
const redis = require('@config/redis')

// store
const Sites = require('@model/sites')
const SiteTags = require('@model/site-tags')

// utilities

// libraries
const Joi = require('joi')
const _castArray = require('lodash/castArray')

// middlewares
const authentication = require('@middleware/authentication')

module.exports = ({ router }) => router
  .prefix('/sites')

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

      const list = await Sites.list({ ...params })
      const count = await Sites.list({ ...params, isCount: true })

      ctx.body = { count, list }
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .post('/', async ctx => {
    const schema = Joi.object({
      name: Joi.string()
        .required(),
      url: Joi.string()
        .required(),
      api: Joi.string()
        .required(),
      tags: Joi.array()
        .optional(),
      settings: Joi.object({
        start: Joi.number()
          .required(),
        end: Joi.number()
          .required(),
        page_limit: Joi.number()
          .required()
      }).required()
    })

    try {
      const request = await schema.validateAsync(ctx.request.body)

      const id = await Sites.store({
        name: request.name,
        url: request.url,
        api: request.api,
        tags: request.tags,
        settings: JSON.stringify(request.settings)
      })

      redis.emitApp('tags', 'fetchTags', {
        site_id: id,
        api_url: request.api
      })

      ctx.status = 200
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .patch('/:id(\\d+)', async ctx => {
    const schema = Joi.object({
      name: Joi.string()
        .required(),
      url: Joi.string()
        .required(),
      api: Joi.optional(),
      settings: Joi.object({
        start: Joi.number()
          .required(),
        end: Joi.number()
          .required(),
        page_limit: Joi.number()
          .required()
      }).required()
    })

    try {
      const data = await schema.validateAsync(ctx.request.body)

      data.settings = JSON.stringify(data.settings)

      const id = ctx.params.id

      redis.emitApp('tags', 'fetchTags', {
        site_id: id,
        api_url: data.api
      })

      ctx.body = await Sites.modify(id, data)
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .delete('/:id(\\d+)', async ctx => {
    try {
      const id = ctx.params.id

      await Sites.modify(id, {
        deleted_at: new Date()
      })

      await SiteTags.deleteAllBySiteId(id)

      ctx.status = 200
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })
