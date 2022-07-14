/**
 * Change necessarily and remove this comment
 */
// store
const Countries = require('@model/countries')

// utilities

// libraries
const Joi = require('joi')
const _get = require('lodash/get')

// middlewares
const authentication = require('@middleware/authentication')

module.exports = ({ router }) => router
  .prefix('/countries')

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

      const list = await Countries.list({ ...params })
      const count = await Countries.list({ ...params, isCount: true })

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
      code: Joi.string()
        .required(),
      status: Joi.string()
        .required()
    })

    try {
      const request = await schema.validateAsync(ctx.request.body)

      await Countries.store({
        name: request.name,
        code: request.code,
        status: request.status
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
      code: Joi.string()
        .required(),
      status: Joi.optional()
    })

    try {
      const data = await schema.validateAsync(ctx.request.body)

      ctx.body = await Countries.modify(ctx.params.id, data)
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .delete('/:id(\\d+)', async ctx => {
    try {
      const id = ctx.params.id

      await Countries.modify(id, {
        deleted_at: new Date()
      })

      ctx.status = 200
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })
