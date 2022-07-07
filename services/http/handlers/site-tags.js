/**
 * Change necessarily and remove this comment
 */
// store
// const SiteTags = require('@model/site-tags')

// utilities

// libraries
const _get = require('lodash/get')

// middlewares
const authentication = require('@middleware/authentication')

module.exports = ({ router }) => router
  .prefix('/site-tags')

  .use(authentication())
