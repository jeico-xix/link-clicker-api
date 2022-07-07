/**
 * Change necessarily and remove this comment
 */
// store
const Admins = require('@model/admins')

// utilities
const bcrypt = require('@utilities/bcrypt')
const jwt = require('@utilities/jwt')

// libraries
const Joi = require('joi')
const _get = require('lodash/get')

// middlewares
const authentication = require('@middleware/authentication')

module.exports = ({ router }) => router
  .prefix('/admins')

  .use(authentication())

  .post('unauth', '/login', async ctx => {
    const schema = Joi.object({
      username: Joi.string()
        .required(),
      password: Joi.string()
        .required()
    })

    try {
      const request = await schema.validateAsync(ctx.request.body)
      const result = await Admins.login({
        username: request.username,
        password: request.password
      })

      if (!result.isSuccess) {
        ctx.status = 401
        ctx.body = 'Invalid Credentials'
        return
      }

      ctx.body = {
        id: result.id,
        token: await jwt.sign({ id: result.id })
      }
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })

  .post('unauth', '/register', async ctx => {
    const schema = Joi.object({
      username: Joi.string()
        .required(),
      password: Joi.string()
        .required()
    })

    try {
      const request = await schema.validateAsync(ctx.request.body)
      const userId = await Admins.register({
        username: request.username,
        password: await bcrypt.hash(request.password)
      })

      ctx.body = {
        id: userId,
        token: await jwt.sign({ id: userId })
      }
    } catch (error) {
      console.log(error)
      ctx.throw(error)
    }
  })
