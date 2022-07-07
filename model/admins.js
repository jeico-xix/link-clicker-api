// store
const knex = require('@config/knex')
// const redis = require('@config/redis')

// utilities
const { makeQuery } = require('@utilities/knex-helper')
const bcrypt = require('@utilities/bcrypt')

// libs
const _isEmpty = require('lodash/isEmpty')
const _isNil = require('lodash/isNil')
const _castArray = require('lodash/castArray')
const _pickBy = require('lodash/pickBy')

// helpers

module.exports = {
  async login (payload) {
    try {
      const [user] = await knex('admins')
        .where('username', payload.username)

      if (!user) {
        return { isSuccess: false }
      }

      const isSuccess = await bcrypt.verify({ password: payload.password, hash: user.password })
      return { isSuccess, id: user.id }
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async list ({ filterBy, q, page, rows, sortBy, sort, isCount, dateBy, dateFrom, dateTo } = {}) {
    /**
     * Change necessarily and remove this comment
     */
    const filterDictionary = {}

    /**
     * Change necessarily and remove this comment
     */
    const sortDictionary = {
      login_id: 'admins.login_id',
      login_name: 'admins.login_name',
      amount: 'admins.amount'
    }

    /**
     * Change necessarily and remove this comment
     */
    const dateDictionary = {
      created_at: 'admins.created_at'
    }

    try {
      /**
       * Change necessarily and remove this comment
       */
      const query = knex('admins')
        .modify(knex => {
          makeQuery({
            ...{ filterBy, q, filterDictionary },
            ...{ sortBy, sort, sortDictionary },
            ...{ dateBy, dateFrom, dateTo, dateDictionary },
            ...{ page, rows },
            knex,
            isCount
          })

          if (isCount) {
            /**
             * Change necessarily and remove this comment
             */
            knex
              .count({ total: 'admins.id' })
              .first()
          } else {
            /**
             * Change necessarily and remove this comment
             */
            knex.select({
              id: 'admins.id',
              login_id: 'admins.login_id',
              login_name: 'admins.login_name',
              amount: 'admins.amount',
              created_at: 'admins.created_at'
            })
          }
        })

      const list = await query

      if (isCount) {
        return list
      }

      return list
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async find (conditions) {
    /**
     * Change necessarily and remove this comment
     */
    const dictionary = {
      id: 'admins.id',
      type_id: 'admins.type_id',
      name: 'admins.name',
      table: 'admins.table'
    }

    try {
      const data = await knex('admins')
        .modify(knex => {
          if (_isEmpty(conditions)) {
            knex.whereRaw('1 = 0')
          }

          for (const key in conditions) {
            const curr = conditions[key]

            if (dictionary[key] && !_isNil(curr)) {
              knex.where(dictionary[key], curr)
            }
          }

          /**
           * Change necessarily and remove this comment
           */
          if (conditions.is_deleted) {
            knex.whereNotNull('admins.deleted_at')
          } else {
            knex.whereNull('admins.deleted_at')
          }
        })
        /**
         * Change necessarily and remove this comment
         */
        .select({
          id: 'admins.id',
          type_id: 'admins.type_id',
          name: 'admins.name',
          table: 'admins.table'
        })
        .first()

      return data
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async store (payload) {
    /**
     * Change necessarily and remove this comment
     */
    const fillables = new Set([
      'foo',
      'bar'
    ])

    try {
      const arrayPayload = _castArray(payload)
      const filterer = hay => _pickBy(hay, (val, key) => !_isNil(val) && fillables.has(key))
      const data = arrayPayload.map(filterer)

      /**
       * Change necessarily and remove this comment
       */
      const [id] = await knex('admins').insert(data)

      return id
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async modify (id, payload) {
    try {
      /**
       * Change necessarily and remove this comment
       */
      const dictionary = {
        foo: 'admins.foo'
      }

      const updateData = {}
      for (const key in payload) {
        const updateValue = payload[key]
        const currDictionary = dictionary[key]

        if (_isNil(updateValue) || !currDictionary) {
          continue
        }

        updateData[currDictionary] = updateValue
      }

      if (_isEmpty(updateData)) {
        return
      }

      /**
       * Change necessarily and remove this comment
       */
      await knex({ tbl: 'admins' })
        .where('tbl.id', id)
        .update(updateData)
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
