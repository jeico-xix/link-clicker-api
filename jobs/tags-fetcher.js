// store
const knex = require('@config/knex')
// const redis = require('@config/redis')

// utilities
const { raw } = require('@utilities/knex-helper')

// libs
const _isEmpty = require('lodash/isEmpty')
const _isNil = require('lodash/isNil')
const _castArray = require('lodash/castArray')
const _pickBy = require('lodash/pickBy')

// libs
const axios = require('axios')
const moment = require('moment')

// config
const redis = require('@config/redis')

// vars
const midnightTime = moment().endOf('day').format('HH:mm:ss')

const methods = {
  async bootstrap () {
    try {
      await this.startListeners()

      setInterval(async () => {
        const currentTime = moment().format('HH:mm:ss')

        if (currentTime === midnightTime) {
          await this.startListeners()
        }
      }, 1000)
    } catch (error) {
      // logger.error(error)
      throw error
    }

    // console.log('tags_fetcher job is up and running')
  },

  async startListeners () {
    await redis.subscribe('app:tags:insert', async data => {
      data = JSON.parse(data)
      await this.fetchTags(data)
    })

    await this.fetchSites()
  },

  async fetchSites () {
    const sites = await knex('sites')
      .modify(knex => {
        knex.select({
          id: 'id',
          api: 'api'
        })
      })

    sites.forEach(site => {
      this.fetchTags({ api_url: site.api })
    })
  },

  async fetchTags (data) {
    await axios.get(`${data.api_url}/tags`).then(async response => {
      const arrNames = []
      const arrItems = []
      const list = response.data.list

      if (!list) {
        return
      }

      list.forEach(element => {
        arrNames.push(element.name)

        arrItems.push({
          name: element.name
        })
      })

      await this.insertIgnoreTags(null, arrNames, arrItems)
    })
  },

  async insertIgnoreTags (siteId, names, payload) {
    const fillables = new Set([
      'name'
    ])

    try {
      const arrayPayload = _castArray(payload)
      const filterer = hay => _pickBy(hay, (val, key) => !_isNil(val) && fillables.has(key))
      const data = arrayPayload.map(filterer)

      await knex('tags').insert(data)
        .onConflict('name')
        .ignore()

      const result = await knex('tags')
        .whereIn('name', names)
        .orderBy('name')
        .modify(knex => {
          knex.select({
            ids: raw('IF(MIN(tags.id) IS NULL, JSON_ARRAY(), JSON_ARRAYAGG(tags.id))')
          })
        })
        .first()

      await knex('tags')
        .whereNotIn('name', names)
        .update({
          deleted_at: new Date()
        })

      await knex('tags')
        .whereIn('name', names)
        .update({
          deleted_at: null
        })

      if (siteId) {
        const ids = JSON.parse(result.ids)
        const siteTags = []
        ids.forEach(id => {
          siteTags.push({
            site_id: siteId,
            tag_id: id
          })
        })

        await this.insertIgnoreSiteTags(siteTags, names)
      }

      await this.updateSiteTags(names)
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async insertIgnoreSiteTags (payload, names) {
    await knex('site_tags').insert(payload)
      .onConflict('site_id', 'tag_id')
      .ignore()

    await this.updateSiteTags(names)
  },

  async updateSiteTags (names) {
    await knex('site_tags')
      .leftJoin('tags', 'tags.id', 'site_tags.tag_id')
      .whereNotIn('tags.name', names)
      .update({
        'site_tags.deleted_at': new Date()
      })

    await knex('site_tags')
      .leftJoin('tags', 'tags.id', 'site_tags.tag_id')
      .whereIn('tags.name', names)
      .update({
        'site_tags.deleted_at': null
      })
  }
}

methods.bootstrap()
