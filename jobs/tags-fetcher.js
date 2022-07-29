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
    await redis.subscribe('app:tags:fetchTags', async data => {
      data = JSON.parse(data)

      if (!data.site_id) {
        await this.fetchSites()
      }

      await this.fetchTags(data)
    })

    await this.fetchSites()
  },

  async fetchSites () {
    const sites = await knex('sites')
      .whereNull('deleted_at')
      .select({
        id: 'id',
        api: 'api'
      })

    sites.forEach(site => {
      this.fetchTags({ site_id: site.id, api_url: site.api })
    })
  },

  async fetchTags (data) {
    try {
      const response = await axios.get(`${data.api_url}/tags`)
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

      const tagIds = await this.insertIgnoreTags(data.site_id, arrNames, arrItems)
      await this.restoreOrSoftDeleteTags(data.site_id, tagIds)

      await this.insertIgnoreSiteTags(data.site_id, tagIds)
      await this.restoreOrSoftDeleteSiteTags(data.site_id, tagIds)
    } catch (error) {
      console.log(error)
    }
  },

  async insertIgnoreTags (siteId, names, payload) {
    const fillables = new Set([
      'name'
    ])

    try {
      const arrayPayload = _castArray(payload)
      const filterer = hay => _pickBy(hay, (val, key) => !_isNil(val) && fillables.has(key))
      const data = arrayPayload.map(filterer)

      await knex('tags')
        .insert(data)
        .onConflict('name')
        .ignore()

      const tagIds = await knex('tags')
        .whereIn('name', names)
        .pluck('id')

      return tagIds
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  async restoreOrSoftDeleteTags (siteId, tagIds) {
    await knex('tags')
      .leftJoin('site_tags', 'site_tags.tag_id', 'tags.id')
      .where('site_tags.site_id', siteId)
      .update({
        'tags.deleted_at': raw(`(CASE WHEN tags.id IN (${tagIds}) THEN NULL ELSE '${moment().format('YYYY-MM-DD HH:mm:ss')}' END)`)
      })
  },

  async insertIgnoreSiteTags (sitieId, tagIds) {
    const siteTags = []
    tagIds.forEach(id => {
      siteTags.push({
        site_id: sitieId,
        tag_id: id
      })
    })

    await knex('site_tags')
      .insert(siteTags)
      .onConflict('site_id', 'tag_id')
      .ignore()
  },

  async restoreOrSoftDeleteSiteTags (siteId, tagIds) {
    await knex('site_tags')
      .leftJoin('tags', 'tags.id', 'site_tags.tag_id')
      .where('site_tags.site_id', siteId)
      .update({
        'site_tags.deleted_at': raw(`(CASE WHEN site_tags.tag_id IN (${tagIds}) THEN NULL ELSE '${moment().format('YYYY-MM-DD HH:mm:ss')}' END)`)
      })
  }
}

methods.bootstrap()
