'use strict';

var _ = require('lodash'),
    helpers = require('./helpers');

module.exports = _.extend(_.clone(helpers), {
  Validator: require('./lib/Validator')
});
