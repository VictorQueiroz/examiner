'use strict';

var _ = require('lodash'),
    vm = require('vm'),
    EventEmitter = require('events');

var re_url = new RegExp("(http|ftp|https)://[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?"),
    re_email = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

var defaults = {
  stores: {
    presets: {},
    messages: {
      _undefined_error: function(attribute) {
        return `has ocurred an unidentified error at field "${attribute}"`;
      }
    },
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
        console.log(size)
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

    _.forEach(data, (message, rule) => {
      if(_.isFunction(message)) {
        return false;
      }

      messages[rule] = function(attribute) {
        var key,
            args = _.toArray(arguments);
        var object = {
          attribute: ''
        };
        
        _.forEach(args, function(value, i) {
          if(i === 0) {
            key = 'attribute';
          } else {
            key = `arg${i}`;
          }
          object[key] = value;
        });

        var script = "`" + message + "`",
            context = vm.createContext(object);
        return vm.runInContext(script, context);
      };
    });
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
        args,
        match;

    for(i = 0; i < filters.length; i++) {
      // rule name
      args = [];
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
    _.merge(this, _.clone(defaults));

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

  getToSearchKeys(ignoreKeys, data, toSearchKeys, rules, replaces) {
    rules = rules || {};
    replaces = replaces || {};
    toSearchKeys = toSearchKeys || [];

    var i,
        key,
        replaceFn,
        keySplits,
        originalKey,
        keySplitIndex,
        concatLastKey;

    for(i = 0; i < ignoreKeys.length; i++) {
      originalKey = ignoreKeys[i];
      keySplits = originalKey.split('.');

      if(this.rules.hasOwnProperty(originalKey)) {
        rules[originalKey] = this.rules[originalKey];
      }
      if(this.replaces.hasOwnProperty(originalKey)) {
        replaces[originalKey] = this.replaces[originalKey];
      }

      for(let j = 0; j < keySplits.length; j++) {
        let nextIndex = j + 1;

        if(keySplits[nextIndex] !== '$') {
          continue;
        }

        let name = keySplits[j],
            dataKey = keySplits.slice(0, nextIndex).join('.'),
            array = _.get(data, dataKey);

        if(!array) {
          continue;
        }

        keySplitIndex = (nextIndex + 1);
        concatLastKey = (keySplits.length > 0 ? keySplits.slice(keySplitIndex).join('.') : '');

        for(let h = 0; h < array.length; h++) {
          // remove repeated dots on the end of the key
          key = `${dataKey}.${h}.${concatLastKey}`;
          key = key.replace(/\.$/, '');

          if(rules.hasOwnProperty(originalKey)) {
            rules[key] = rules[originalKey];
          }
          if(replaces.hasOwnProperty(originalKey)) {
            replaceFn = replaces[originalKey];
            if(_.isFunction(replaceFn)) {
              replaceFn = replaceFn(h);
            }
            replaces[key] = replaceFn;
          }

          toSearchKeys.push(key);
        }
      }
    }

    var filteredKeys = ignoreKeys.filter(function(key) {
      return key.indexOf('$') === -1;
    });

    // if there are still $ dotted keys, run the function again
    // until all is resolved
    for(i = 0; i < toSearchKeys.length; i++) {
      if(toSearchKeys[i].indexOf('$') > -1) {
        this.getToSearchKeys(toSearchKeys.splice(i, 1).concat(filteredKeys), data, toSearchKeys, rules);
      }
    }

    return toSearchKeys;
  }

  validate(data) {
    var errors = {},
        messages = {};

    this.currentData = data;

    var ignore_keys = [],
        rules = _.clone(this.rules) || {},
        replaces = _.clone(this.replaces) || {};

    // process function presets
    if(this.presets && !_.isArray(this.presets)) {
      this.loadPresets(presets, rules, replaces, data);
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
      var value = _.get(data, key),
          found = {},
          filters,
          found_messages = {};

      var modelData = this.updateData(key, value);

      if(_.isFunction(filterData)) {
        filterData = filterData(data, this);

        // if the function returns false
        // ignore the filter
        if(!filterData) {
          return false;
        }
      }

      if(_.isString(filterData)) {
        filters = filterData.split('|');
      } else {
        filters = filterData;
      }

      // transforms "user.company.name" to "Nome da Empresa"
      var transformed_key = replaces.hasOwnProperty(key) ? replaces[key] : key;
      this.test(filters, found, found_messages, value, transformed_key);

      // if found any error, store
      if(_.keys(found).length > 0) {
        errors[key] = found;
        messages[key] = found_messages;
      }
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

_.forEach(['setFilter', 'setPreset', 'setMessage'], function(method) {
  Validator[method] = function() {
    return Validator.prototype[method].apply(defaults, arguments);
  };
});

module.exports = Validator;
