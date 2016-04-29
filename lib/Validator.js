'use strict';

var _ = require('lodash'),
    messages = require('../lang/en/messages'),
    EventEmitter = require('events');

var re_url = new RegExp("(http|ftp|https)://[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?"),
    re_email = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

var defaults = {
  stores: {
    presets: {},
    messages: _.extend(_.clone(messages), {
      _undefined_error: function(attribute) {
        return `has ocurred an unidentified error at field "${attribute}"`;
      }
    }),
    filters: {
      email: function(value) {
        return re_email.test(value);
      },
      url: function(value) {
        return re_url.test(value);
      },
      date: function(value) {
        return _.isDate(value);
      },
      string: function(value) {
        return _.isString(value);
      },
      number: function(value) {
        return _.isNumber(value);
      },
      required: function(value) {
        return !_.isUndefined(value) && (_.isNumber(value) || _.isString(value) && value.length > 0);
      },
      boolean: function(value, boolean) {
        if(_.isUndefined(boolean) || boolean == 'true') {
          return value === true;
        } else if(boolean == 'false') {
          return value === false;
        }
        return false;
      },
      size: function(value, size) {
        if(_.isString(value) || _.isArray(value)) {
          return value.length == size;
        } else if(_.isNumber(value)) {
          return value == size;
        }
        return false;
      },
      min: function(value, size) {
        if(_.isString(value) || _.isArray(value)) {
          return value.length >= size;
        } else if(_.isNumber(value)) {
          return value >= size;
        }
        return false;
      },
      max: function(value, size) {
        if(_.isString(value) || _.isArray(value)) {
          return value.length <= size;
        } else if(_.isNumber(value)) {
          return value <= size;
        }
        return false;
      }
    }
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

  loadFromJSON(data) {
    var messages = this.stores.messages;
    _.extend(messages, data);
  }

  matchFilters(filter) {
    return filter.split(':').map(function(string) {
      return string.split(',');
    });
  }

  setFilter(name, fn) {
    this.stores.filters[name] = fn;
    return this;
  }

  runFilter(name, args) {
    return this.stores.filters[name].apply(this, args);
  }

  hasFilter(name) {
    return this.stores.filters.hasOwnProperty(name);
  }

  test(filters, errors, messages, value, key) {
    var i,
        name,
        args = [],
        match;

    for(i = 0; i < filters.length; i++) {
      args.splice(0, args.length);

      // rule name
      match = this.matchFilters(filters[i]);

      name = match.shift();
      name = name.shift();

      _.forEach(match.shift(), function(arg, i) {
        args[i] = arg;
      });
      args.unshift(value);

      // do not ignore "required" filter when
      // the value of the field is not defined
      if(name !== 'required') {
        if(_.isUndefined(value) || value === '') {
          continue;
        }
      }
      if(this.hasFilter(name)) {
        if(this.runFilter(name, args)) {
          continue;
        }
      } else {
        throw new Error(`no defined rule check function for "${name}"`);
      }

      this.message(name, messages, args.slice(1), value, key);
      errors[name] = true;
    }
  }

  hasMessage(name) {
    return this.stores.messages.hasOwnProperty(name);
  }

  setMessage(name, value) {
    this.stores.messages[name] = value;
    return this;
  }

  getMessage(name) {
    return this.stores.messages[name];
  }

  message(name, messages, args, value, key) {
    if(!this.hasMessage(name)) {
      this.setMessage(name, this.getMessage('_undefined_error'));
    }

    var t = (typeof value),
        fn = this.getMessage(name);

    if(typeof fn !== 'function' && _.isObject(fn)) {
      if(fn.hasOwnProperty(t)) {
        fn = fn[t];
      } else {
        throw new Error(`There is no rule for "${t}" type of error "${name}" on field "${key}"`);
      }
    }

    // add attribute name on arguments
    args.unshift(key);

    messages[name] = fn.apply(this, args);
  }

  isFormEmpty() {
    var empty = _.every(this.data, item => {
      return item.value === '';
    });

    this.empty = empty;
    return empty;
  }

  getPreset(name, value){
    var presets = this.stores.presets;
    if(!presets.hasOwnProperty(name)) {
      throw new Error(`Preset named "${name}" is not defined`);
    }
    return presets[name];
  }

  getPresets() {
    return this.stores.presets;
  }

  hasPreset(name) {
    return this.stores.presets.hasOwnProperty(name);
  }

  setPreset(name, value) {
    if(_.isObject(name)) {
      return _.forEach(name, (preset, name) => {
        return this.setPreset(name, preset);
      });
    }

    var presets = this.stores.presets;

    if(presets.hasOwnProperty(name)) {
      throw new Error(`Overriding preset "${name}"`);
    }

    presets[name] = value;
  }

  update(options) {
    _.extend(this, options);
    _.merge(this, _.clone(defaults));

    if(!this.replaces) {
      this.replaces = {};
    }
    if(!this.rules) {
      this.rules = {};
    }
  }

  loadPresets(presets, rules, replaces, data) {
    _.forEach(this.presets, (presetFn, name) => {
      if(presets.hasOwnProperty(name)) {
        // clone the preset so we can modify
        // it's keys
        let preset = _.clone(presets[name]),
            presetValueFn = presetFn(data, preset);

        if(_.isObject(presetValueFn)) {
          preset = _.clone(presetValueFn);
          presetValueFn = true;
        }

        if(presetValueFn) {
          if(preset.rules) {
            _.extend(rules, preset.rules);
          }
          if(preset.replaces) {
            _.extend(replaces, preset.replaces);
          }
        }
      }
    });
  }

  updateData(key, value) {
    var data = this.data;

    if(_.isUndefined(value)) {
      value = '';
    }

    if(!data.hasOwnProperty(key)) {
      data[key] = {
        value: '',
        oldValue: ''
      };
    }

    var attribute = data[key],
        nextOldValue = _.clone(attribute.value);

    if(!attribute.dirty) {
      if(_.isEqual(value, attribute.value)) {
        attribute.dirty = false;
      } else {
        attribute.dirty = true;
      }
    }

    _.extend(attribute, {
      value: value,
      oldValue: nextOldValue
    });

    return attribute;
  }

  resolveComplexKeys(sources, data) {
    var i,
        j,
        split,
        results = [],
        keySplits,
        lastConcat,
        toSearchPath,
        toSearchPaths = [],
        lastSearchPath;

    for(i = 0; i < sources.length; i++) {
      keySplits = sources[i].split('.');

      for(j = 0; j < keySplits.length; j++) {
        split = keySplits[j];
        
        if(split !== '$') {
          continue;
        }

        toSearchPath = _.join(_.slice(keySplits, 0, j), '.');
        
        if(toSearchPath.indexOf('$') > -1) {
          continue;
        }

        lastConcat = keySplits.slice(j + 1);
        lastConcat = lastConcat.length ? `.${lastConcat.join('.')}` : '';

        if(_.has(data, toSearchPath)) {
          _.forEach(_.keys(_.get(data, toSearchPath)), function(key) {
            results.push(`${toSearchPath}.${key}${lastConcat}`);
          });
        } else {
          throw new Error(
            `The path "${toSearchPath}" was not found in the provided data. 
            You need to create the entire path if you want to use deep keys, 
            please read the README at: 
            https://github.com/VictorQueiroz/examiner/blob/master/README.md`
          );
        }

        toSearchPaths.push(toSearchPath);
      }
    }

    for(i = 0; i < results.length; i++) {
      if(results[i].indexOf('$') > -1) {
        return this.resolveComplexKeys(results, data);
      }
    }

    return results;
  }

  getToSearchKeys(ignoreKeys, data, toSearchKeys, rules, replaces) {
    toSearchKeys = toSearchKeys || [];

    var possiblyFn,
        storeRules = this.rules,
        storeReplaces = this.replaces;

    _.forEach(ignoreKeys, originalKey => {
      var sources = [];
      sources.push(originalKey);

      _.forEach(this.resolveComplexKeys(sources, data), (key, i) => {
        if(rules) {
          if(storeRules.hasOwnProperty(originalKey)) {
            possiblyFn = storeRules[originalKey];
            rules[key] = _.isFunction(possiblyFn) ? possiblyFn(i) : possiblyFn;
          }
        }
        if(replaces) {
          if(storeReplaces.hasOwnProperty(originalKey)) {
            possiblyFn = storeReplaces[originalKey];
            replaces[key] = _.isFunction(possiblyFn) ? possiblyFn(i) : possiblyFn;
          }
        }
        toSearchKeys.push(key);
      });
    });

    return toSearchKeys;
  }

  validate(data) {
    var errors = {},
        messages = {};

    this.currentData = data;

    var rules = _.clone(this.rules) || {},
        replaces = _.clone(this.replaces) || {},
        ignore_keys = [];

    // process function presets
    var presets = this.presets;

    // check for not defined presets
    _.forEach(_.isArray(presets) ? presets : _.keys(presets), name => {
      if(!this.hasPreset(name)) {
        throw new Error(`Requested preset named ${name} not found`);
      }
    });

    if(_.isArray(presets)) {
      _.forEach(this.getPresets(), (preset, name) => {
        if(presets.indexOf(name) > -1) {
          _.extend(rules, preset.rules);
          _.extend(replaces, preset.replaces);
        }
      });
    } else if(_.isObject(presets)) {
      this.loadPresets(this.getPresets(), rules, replaces, data);
    }

    // search for deep filters 'a.b.$.c'
    _.forEach(rules, function(value, key) {
      if(key.indexOf('$') > -1) {
        ignore_keys.push(key);
      }
    });

    var toSearchKeys = [];
    this.getToSearchKeys(ignore_keys, data, toSearchKeys, rules, replaces);

    _(rules).omit(ignore_keys).mapValues((filterData, key) => {
      var value = _.get(data, key);
      this.updateData(key, value);

      return filterData;
    })
    .mapValues(filterData => {
      this.isFormEmpty();
      return filterData;
    })
    .forEach((filterData, key) => {
      this.validateRule(filterData, key, messages, errors, data, replaces);
    });

    if(_.keys(errors).length > 0) {
      this.errors = errors;
      this.messages = messages;
    } else {
      this.errors = this.messages = null;
    }

    this.triggerUpdate();
    this.oldData = _.clone(data);
  }

  validateRule(filterData, key, messages, errors, data, replaces) {
    var value = _.get(data, key),
        found = {},
        filters,
        modelData = this.updateData(key, value),
        found_messages = {};

    if(_.isFunction(filterData)) {
      filterData = filterData.call(this, data);

      // if the function returns false
      // ignore the filter
      if(!filterData) {
        return false;
      }
    }

    if(_.isString(filterData)) {
      filters = filterData.split('|');
    } else if(_.isArray(filterData)) {
      filters = filterData;
    } else {
      throw new Error(`Invalid filters at key "${key}"`);
    }

    // transforms "user.company.name" to "Company Name"
    var transformed_key = replaces.hasOwnProperty(key) ? replaces[key] : key;
    this.test(filters, found, found_messages, value, transformed_key);

    // if found any error, store
    if(_.keys(found).length > 0) {
      errors[key] = found;
      messages[key] = found_messages;
    }
  }

  triggerUpdate() {
    if(this.errors) {
      this.valid = false;
      this.invalid = true;
    } else {
      this.valid = true;
      this.invalid = false;
    }
    this.emit('update');
  }
}

Validator.defaults = defaults;

var proto = {},
    methods = ['setFilter', 'loadFromJSON', 'setPreset', 'setMessage'],
    validatorProto = Validator.prototype;

// create fake ctor
_.forEach(methods, function(key) {
  proto[key] = validatorProto[key].bind(defaults);
});

var ctor = _.create(defaults, proto);

_.forEach(methods, function(method, i, methods) {
  _.set(Validator, method, function() {
    return validatorProto[method].apply(ctor, arguments);
  });
});

var helpers = require('../helpers');

_.extend(Validator, helpers);

module.exports = Validator;
