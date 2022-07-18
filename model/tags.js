// store
const knex = require('@config/knex')
// const redis = require('@config/redis')

// utilities
const { makeQuery } = require('@utilities/knex-helper')

// libs
const _isEmpty = require('lodash/isEmpty')
const _isNil = require('lodash/isNil')
const _castArray = require('lodash/castArray')
const _pickBy = require('lodash/pickBy')

// helpers

module.exports = {
  async list ({ filterBy, q, page, rows, sortBy, sort, isCount, dateBy, dateFrom, dateTo } = {}) {
    /**
     * Change necessarily and remove this comment
     */
    const filterDictionary = {}

    /**
     * Change necessarily and remove this comment
     */
    const sortDictionary = {
      login_id: 'tags.login_id',
      login_name: 'tags.login_name',
      amount: 'tags.amount'
    }

    /**
     * Change necessarily and remove this comment
     */
    const dateDictionary = {
      created_at: 'tags.created_at'
    }

    try {
      /**
       * Change necessarily and remove this comment
       */
      const query = knex('tags')
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
              .count({ total: 'tags.id' })
              .first()
          } else {
            /**
             * Change necessarily and remove this comment
             */
            knex.select({
              id: 'tags.id',
              login_id: 'tags.login_id',
              login_name: 'tags.login_name',
              amount: 'tags.amount',
              created_at: 'tags.created_at'
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
      id: 'tags.id',
      type_id: 'tags.type_id',
      name: 'tags.name',
      table: 'tags.table'
    }

    try {
      const data = await knex('tags')
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
            knex.whereNotNull('tags.deleted_at')
          } else {
            knex.whereNull('tags.deleted_at')
          }
        })
        /**
         * Change necessarily and remove this comment
         */
        .select({
          id: 'tags.id',
          type_id: 'tags.type_id',
          name: 'tags.name',
          table: 'tags.table'
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
      const [id] = await knex('tags').insert(data)

      return id
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async modify (id, payload) {
    try {
      const dictionary = {
        is_active: 'is_active'
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

      await knex({ tbl: 'tags' })
        .where('tbl.id', id)
        .update(updateData)
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
