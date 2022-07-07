// store
const knex = require('@config/knex')
// const redis = require('@config/redis')

// utilities
const { makeQuery, jsonObject } = require('@utilities/knex-helper')
const moment = require('@utilities/moment')

// libs
const _isEmpty = require('lodash/isEmpty')
const _isNil = require('lodash/isNil')
const _castArray = require('lodash/castArray')
const _pickBy = require('lodash/pickBy')

// helpers

module.exports = {
  async list ({ filterBy, q, page, rows, sortBy, sort, isCount, dateBy, dateFrom, dateTo } = {}) {
    const filterDictionary = {
      site_name: 'sites.name',
      tag_name: 'tags.name',
      status: 'logs.status',
      page: 'logs.page'
    }

    const sortDictionary = {}

    const dateDictionary = {
      created_at: 'logs.created_at'
    }

    try {
      const query = knex('logs')
        .leftJoin('site_tags', 'logs.site_tag_id', 'site_tags.id')
        .leftJoin('sites', 'site_tags.site_id', 'sites.id')
        .leftJoin('tags', 'site_tags.tag_id', 'tags.id')
        .orderBy('logs.id', 'desc')
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
              .count({ total: 'logs.id' })
              .first()
          } else {
            knex.select({
              id: 'logs.id',
              sites: jsonObject({
                id: 'sites.id',
                name: 'sites.name'
              }),
              tags: jsonObject({
                id: 'tags.id',
                name: 'tags.name'
              }),
              status: 'logs.status',
              page: 'logs.page',
              started_at: 'logs.started_at',
              finished_at: 'logs.finished_at',
              created_at: 'logs.created_at'
            })
          }
        })

      const list = await query

      if (isCount) {
        return list
      }

      list.forEach(item => {
        item.sites = JSON.parse(item.sites)
        item.tags = JSON.parse(item.tags)

        const startedAt = moment(item.started_at)
        const finishedAt = moment(item.finished_at)
        const duration = moment.duration(finishedAt.diff(startedAt))
        item.duration = `${duration.asSeconds()} secs`
      })

      return list
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async find (conditions) {
    const dictionary = {
      id: 'logs.id',
      sites: jsonObject({
        id: 'sites.id',
        name: 'sites.name'
      }),
      tags: jsonObject({
        id: 'tags.id',
        name: 'tags.name'
      }),
      status: 'logs.status',
      page: 'logs.page',
      started_at: 'logs.started_at',
      finished_at: 'logs.finished_at',
      created_at: 'logs.created_at',
      table: 'logs.table'
    }

    try {
      const data = await knex('logs')
        .leftJoin('site_tags', 'logs.site_tag_id', 'site_tags.id')
        .leftJoin('sites', 'site_tags.site_id', 'sites.id')
        .leftJoin('tags', 'site_tags.tag_id', 'tags.id')
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
        })
        .select({
          id: 'logs.id',
          sites: jsonObject({
            id: 'sites.id',
            name: 'sites.name'
          }),
          tags: jsonObject({
            id: 'tags.id',
            name: 'tags.name'
          }),
          status: 'logs.status',
          page: 'logs.page',
          started_at: 'logs.started_at',
          finished_at: 'logs.finished_at',
          created_at: 'logs.created_at'
        })
        .first()

      data.sites = JSON.parse(data.sites)
      data.tags = JSON.parse(data.tags)

      const startedAt = moment(data.started_at)
      const finishedAt = moment(data.finished_at)
      const duration = moment.duration(finishedAt.diff(startedAt))
      data.duration = `${duration.asSeconds()} secs`

      return data
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async store (payload) {
    const fillables = new Set([
      'site_tag_id',
      'status',
      'page',
      'started_at',
      'finished_at'
    ])

    try {
      const arrayPayload = _castArray(payload)
      const filterer = hay => _pickBy(hay, (val, key) => !_isNil(val) && fillables.has(key))
      const data = arrayPayload.map(filterer)

      const [id] = await knex('logs').insert(data)

      const item = await this.find({
        id: id
      })

      return item
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
