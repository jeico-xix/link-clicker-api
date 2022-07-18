/**
 * Change necessarily and remove this comment
 */
// store
const Tags = require('@model/tags')

// utilities

// libraries
const _get = require('lodash/get')
const Joi = require('joi')

// middlewares
const authentication = require('@middleware/authentication')

module.exports = ({ router }) => router
  .prefix('/tags')

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

      // /**
      //  * Change necessarily and remove this comment
      //  */
      // ctx.throw(404)

      /**
       * Change necessarily and remove this comment
       */
      const list = await Tags.list({ ...params })
      const count = await Tags.list({ ...params, isCount: true })

      ctx.body = { count: _get(count, 'total', 0), list }
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .patch('/:id(\\d+)', async ctx => {
    const schema = Joi.object({
      is_active: Joi.boolean()
        .optional()
    })

    try {
      const data = await schema.validateAsync(ctx.request.body)

      ctx.body = await Tags.modify(ctx.params.id, data)
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })
