'use strict';

var _ = require('lodash'),
    EventEmitter = require('events');

const DEFAULTS = {
  stores: {
    presets: {}
  }
};

class Validator extends EventEmitter {
  constructor(options){
    super();

    this.data = {};
    this.rules = null;
    this.dirty = false;
    this.empty = null;
    this.valid = true;
    this.stores = {};
    this.errors = null;
    this.invalid = false;
    this.replaces = null;
    this.oldData = null;
    this.currentData = null;

    this.update(options);
  }

  getPreset(name, value){
    var presets = this.stores.presets;
    if(!presets.hasOwnProperty(name)) {
      throw new Error(`Preset named "${name}" is not defined`);
    }
    return presets[name];
  }

  setPreset(name, value) {
    var presets = this.stores.presets;
    if(presets.hasOwnProperty(name)) {
      throw new Error(`Overriding preset "${name}"`);
    }

    presets[name] = value;
  }

  update(options) {
    _.extend(this, options);
    _.merge(this, _.clone(DEFAULTS));

    if(!this.replaces) {
      this.replaces = {};
    }
    if(!this.rules) {
      this.rules = {};
    }

    if(this.presets) {
      _.forEach(this.presets, name => {
        if(!_.isFunction(name) && name) {
          _.extend(this, this.getPreset(name));
        }
      });
    }
  }
}

module.exports = Validator;