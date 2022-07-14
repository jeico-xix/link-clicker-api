// store
const knex = require('@config/knex')

// utilities
const { makeQuery } = require('@utilities/knex-helper')

// libs
const _get = require('lodash/get')
const _isEmpty = require('lodash/isEmpty')
const _isNil = require('lodash/isNil')
const _castArray = require('lodash/castArray')
const _pickBy = require('lodash/pickBy')

// helpers

module.exports = {
  async list ({ filterBy, q, page, rows, sortBy, sort, isCount, dateBy, dateFrom, dateTo } = {}) {
    const filterDictionary = {
      name: 'countries.name',
      code: 'countries.code',
      status: 'countries.status'
    }

    const sortDictionary = {}

    const dateDictionary = {
      created_at: 'countries.created_at',
      updated_at: 'countries.updated_at'
    }

    try {
      const list = await knex('countries')
        .where('countries.deleted_at', null)
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
            knex
              .count({ total: 'countries.id' })
              .first()
          } else {
            knex.select({
              id: 'countries.id',
              name: 'countries.name',
              code: 'countries.code',
              status: 'countries.status',
              created_at: 'countries.created_at'
            })
          }
        })

      if (isCount) {
        return _get(list, 'total', 0)
      }

      return list
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async store (payload) {
    const fillables = new Set([
      'name',
      'code'
    ])

    try {
      const arrayPayload = _castArray(payload)
      const filterer = hay => _pickBy(hay, (val, key) => !_isNil(val) && fillables.has(key))
      const data = arrayPayload.map(filterer)

      await knex('countries')
        .where('countries.name', payload.name)
        .whereNotNull('countries.deleted_at', null)
        .update({
          deleted_at: null
        })

      await knex('countries')
        .insert(data)
        .onConflict('name', 'code')
        .ignore()
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async modify (id, payload) {
    try {
      const dictionary = {
        id: 'id',
        name: 'name',
        code: 'code',
        status: 'status',
        deleted_at: 'deleted_at'
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

      await knex({ tbl: 'countries' })
        .where('tbl.id', id)
        .update(updateData)
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
