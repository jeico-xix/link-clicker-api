// store
const knex = require('@config/knex')
// const redis = require('@config/redis')

// utilities
const { makeQuery, jsonObject, raw } = require('@utilities/knex-helper')

// libs
const _isEmpty = require('lodash/isEmpty')
const _isNil = require('lodash/isNil')
const _castArray = require('lodash/castArray')
const _pickBy = require('lodash/pickBy')

// helpers

module.exports = {
  async list ({ filterBy, q, page, rows, sortBy, sort, isCount, dateBy, dateFrom, dateTo } = {}) {
    const filterDictionary = {
      name: 'sites.name',
      url: 'sites.url',
      api: 'sites.api'
    }

    const sortDictionary = {}

    const dateDictionary = {
      created_at: 'sites.created_at'
    }

    try {
      const tagJsonObject = jsonObject({
        id: 'tags.id',
        site_tag_id: 'site_tags.id',
        name: 'tags.name'
      })

      const query = knex('sites')
        .leftJoin('site_tags', 'site_tags.site_id', 'sites.id')
        .leftJoin('tags', 'tags.id', 'site_tags.tag_id')
        .where('sites.deleted_at', null)
        .groupBy('sites.id')
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
              .select({ total: raw('COUNT(sites.id) OVER()') })
              .first()
          } else {
            knex.select({
              id: 'sites.id',
              name: 'sites.name',
              url: 'sites.url',
              api: 'sites.api',
              tags: raw(`IF(MIN(tags.id) IS NULL, JSON_ARRAY(), JSON_ARRAYAGG(IF(tags.id IS NULL, NULL, ${tagJsonObject})))`),
              settings: 'sites.settings',
              created_at: 'sites.created_at'
            })
          }
        })

      const list = await query

      if (isCount) {
        return list
      }

      list.forEach(element => {
        element.settings = JSON.parse(element.settings)
        element.tags = JSON.parse(element.tags)
      })

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
      id: 'sites.id',
      type_id: 'sites.type_id',
      name: 'sites.name',
      table: 'sites.table'
    }

    try {
      const data = await knex('sites')
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
            knex.whereNotNull('sites.deleted_at')
          } else {
            knex.whereNull('sites.deleted_at')
          }
        })
        /**
         * Change necessarily and remove this comment
         */
        .select({
          id: 'sites.id',
          type_id: 'sites.type_id',
          name: 'sites.name',
          table: 'sites.table'
        })
        .first()

      return data
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async store (payload) {
    const fillables = new Set([
      'name',
      'url',
      'api',
      'settings'
    ])

    try {
      const arrayPayload = _castArray(payload)
      const filterer = hay => _pickBy(hay, (val, key) => !_isNil(val) && fillables.has(key))
      const data = arrayPayload.map(filterer)

      const [id] = await knex('sites')
        .insert(data)
        .onConflict('name', 'url')
        .ignore()

      return id
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
        url: 'url',
        api: 'api',
        settings: 'settings',
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

      await knex({ tbl: 'sites' })
        .where('tbl.id', id)
        .update(updateData)
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
