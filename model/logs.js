// store
const knex = require('@config/knex')
// const redis = require('@config/redis')

// utilities
const { makeQuery, jsonObject, raw } = require('@utilities/knex-helper')
const moment = require('@utilities/moment')

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
      site_name: 'sites.name',
      site_tag_id: 'site_tags.id',
      tag_name: 'tags.name',
      log_term: 'logs.term',
      status: 'logs.status'
    }

    const sortDictionary = {
      id: 'logs.id'
    }

    const dateDictionary = {
      // started_at: 'logs.started_at',
      // finished_at: 'logs.finished_at',
      created_at: 'logs.created_at'
    }

    try {
      const list = await knex('logs')
        .leftJoin('site_tags', 'site_tags.id', 'logs.site_tag_id')
        .leftJoin('sites', 'sites.id', 'site_tags.site_id')
        .leftJoin('tags', 'tags.id', 'site_tags.tag_id')
        .leftJoin('countries', 'countries.id', 'logs.country_id')
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
              site_tag: jsonObject({
                id: 'site_tags.id'
              }),
              country: jsonObject({
                id: 'countries.id',
                name: 'countries.name',
                code: 'countries.code'
              }),
              sites: jsonObject({
                id: 'sites.id',
                name: 'sites.name'
              }),
              tags: jsonObject({
                id: 'tags.id',
                name: 'tags.name'
              }),
              term: 'logs.term',
              status: 'logs.status',
              ip: 'logs.ip',
              page: 'logs.page',
              started_at: 'logs.started_at',
              finished_at: 'logs.finished_at',
              created_at: 'logs.created_at'
            })
          }
        })

      if (isCount) {
        return _get(list, 'total', 0)
      }

      list.forEach(item => {
        item.site_tag = JSON.parse(item.site_tag)
        item.sites = JSON.parse(item.sites)
        item.country = JSON.parse(item.country)
        item.tags = JSON.parse(item.tags)

        const startedAt = moment(item.started_at)
        const finishedAt = moment(item.finished_at)
        const duration = moment.duration(finishedAt.diff(startedAt))
        const formattedDuration = moment.utc(duration.as('milliseconds'))
        item.duration = (formattedDuration.isValid()) ? formattedDuration.format('mm:ss') : '---'
      })

      return list
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async summary (siteTagId, whereRawStatement, value, subQuerySelect, mainSelect, groupBys = []) {
    let subQuery = knex('logs')
      .leftJoin('site_tags', 'site_tags.id', 'logs.site_tag_id')
      .leftJoin('sites', 'sites.id', 'site_tags.site_id')
      .leftJoin('tags', 'tags.id', 'site_tags.tag_id')
      .where('logs.site_tag_id', siteTagId)
      .where(whereRawStatement, value)

    groupBys.forEach(groupBy => {
      subQuery = subQuery.groupBy(groupBy)
    })

    subQuery.as('logs')
      .modify(knex => {
        knex.select(subQuerySelect)
      })

    const item = await knex(subQuery)
      .modify(knex => {
        knex.select(mainSelect)
      })
      .first()

    return item
  },

  async summaryDaily (siteTagId, yearMonth) {
    try {
      const item = await this.summary(siteTagId, raw('EXTRACT(YEAR_MONTH FROM logs.created_at)'), yearMonth,
        {
          page: 'logs.page',
          day: raw('DATE_FORMAT(logs.created_at, "%d")')
        },
        {
          labels: raw('JSON_ARRAYAGG(day)'),
          data: raw('JSON_ARRAYAGG(page)')
        }
      )

      if (item) {
        item.labels = JSON.parse(item.labels)
        item.data = JSON.parse(item.data)
      }

      return item
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async summaryWeekly (siteTagId, year) {
    try {
      const item = await this.summary(siteTagId, raw('EXTRACT(YEAR FROM `logs`.`created_at`)'), year,
        {
          page: raw('CAST(AVG(page) AS DECIMAL)'),
          month: raw('CONCAT(DATE_FORMAT(logs.created_at, "%b"), ": Week ", FLOOR((DayOfMonth(logs.created_at)-1)/ 7)+ 1)')
        },
        {
          labels: raw('JSON_ARRAYAGG(month)'),
          data: raw('JSON_ARRAYAGG(page)')
        },
        ['logs.site_tag_id', 'month']
      )

      if (item) {
        item.labels = JSON.parse(item.labels)
        item.data = JSON.parse(item.data)
      }

      return item
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async summaryMonthly (siteTagId, year) {
    try {
      const item = await this.summary(siteTagId, raw('EXTRACT(YEAR FROM `logs`.`created_at`)'), year,
        {
          page: raw('CAST(AVG(page) AS DECIMAL)'),
          month: raw('MONTHNAME (`logs`.`created_at`)')
        },
        {
          labels: raw('JSON_ARRAYAGG(month)'),
          data: raw('JSON_ARRAYAGG(page)')
        },
        ['logs.site_tag_id', 'month']
      )

      if (item) {
        item.labels = JSON.parse(item.labels)
        item.data = JSON.parse(item.data)
      }

      return item
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async find (conditions) {
    const dictionary = {
      id: 'logs.id',
      site_tag_id: 'logs.site_tag_id',
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

      if (data) {
        data.sites = JSON.parse(data.sites)
        data.tags = JSON.parse(data.tags)

        const startedAt = moment(data.started_at)
        const finishedAt = moment(data.finished_at)
        const duration = moment.duration(finishedAt.diff(startedAt))
        data.duration = `${duration.asSeconds()} secs`
      }

      return data
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async store (payload) {
    const fillables = new Set([
      'site_tag_id',
      'country_id',
      'term',
      'status',
      'ip',
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
  },

  async modify (id, payload) {
    try {
      const dictionary = {
        status: 'status',
        page: 'page',
        finished_at: 'finished_at'
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

      await knex({ tbl: 'logs' })
        .where('tbl.id', id)
        .update(updateData)
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async boot () {
    try {
      await knex('logs')
        .where('status', 'on-going')
        .update({
          status: 'failed'
        })
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
