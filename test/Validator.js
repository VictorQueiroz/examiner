var _ = require('lodash'),
    sinon = require('sinon'),
    assert = require('assert'),
    Validator = require('../lib/Validator');

describe('Validator', function() {
  var validator;

  beforeEach(function() {
    validator = new Validator();
    validator.loadFromJSON(require('../lang/en/messages'));
  });

  describe('constructor()', function() {
    describe('rules()', function() {
      var rules = Validator.rules;

      it('should deal with strings', function() {
        assert.equal('a|b|c', rules('a', 'b', 'c'));
      });

      it('should deal with objects', function() {
        assert.equal('a|b|c', rules('a', {
          b: true,
          c: true
        }));
      });
    });

    describe('transformPreset()', function() {
      var preset = {},
          transformPreset = Validator.transformPreset;

      beforeEach(function() {
        _.extend(preset, {
          rules: {
            a: 'email|string|required'
          },
          replaces: {
            a: 'A little preset'
          }
        });
      });

      it('should add prefix to the keys', function() {
        assert.deepEqual(transformPreset(preset, { prefix: 'prefix.' }), {
          rules: {
            'prefix.a': 'email|string|required'
          },
          replaces: {
            'prefix.a': 'A little preset'
          }
        });
      });

      it('should deal if the prefix option is in fact a function', function() {
        var transformedPreset = transformPreset(preset, function(value, key) {
          return `prefix.${key}`;
        });

        assert.deepEqual(transformedPreset, {
          rules: {
            'prefix.a': 'email|string|required'
          },
          replaces: {
            'prefix.a': 'A little preset'
          }
        });
      });
    });

    describe('setPreset()', function() {
      var stores = Validator.defaults.stores,
          presets = stores.presets;

      afterEach(function() {
        _.forEach(presets, function(value, key) {
          delete presets[key];
        });
      });

      it('should define multiple presets on the global defaults variable', function() {
        Validator.setPreset({
          e: {
            rules: {}
          }
        });
        assert.deepEqual(presets, {
          e: {
            rules: {}
          }
        });
      });
    });
  });

  describe('getPreset()', function() {
    it('should throw when try to get a non existent preset', function() {
      assert.throws(function() {
        validator.getPreset('p1');
      }, /Preset named "p1" is not defined/);
    });
  });

  describe('getPresets()', function() {
    var presets;

    beforeEach(function() {
      presets = {
        a: {
          rules: {}
        },
        b: {
          rules: {}
        },
        c: {
          rules: {}
        }
      };
    });
    
    it('should retrieve all the presets in the validator instance stores', function() {
      validator.setPreset(presets);
      assert.deepEqual(validator.getPresets(), presets);
    });
  });

  describe('setPreset()', function() {
    it('should throw when overriding existing preset', function() {
      validator.setPreset('a', {
        rules: {
          some: 1
        }
      });
      assert.throws(function() {
        validator.setPreset('a');
      }, /Overriding preset "a"/);
    });

    it('should define a preset to the validator instance', function() {
      validator.setPreset('a', {
        rules: {
          b: 'number'
        }
      });
      assert.deepEqual(validator.getPresets(), {
        a: {
          rules: {
            b: 'number'
          }
        }
      });
    });

    it('should define multiple presets when pass an object at the first argument', function() {
      validator.setPreset({
        a: {
          rules: {
            a1: 'required'
          }
        },
        b: {
          rules: {
            a2: 'required'
          }
        }
      });
      assert.deepEqual(validator.getPresets(), {
        a: {
          rules: {
            a1: 'required'
          }
        },
        b: {
          rules: {
            a2: 'required'
          }
        }
      });
    });
  });

  describe('update()', function() {
    it('should update the validator instance options', function() {
      validator.update({t: 1});
      assert.equal(validator.t, 1);
    });

    it('should ignore functions presets', function() {
      assert.doesNotThrow(function() {
        validator.update({
          presets: {
            a: function() {

            }
          }
        });
      });
    });
  });

  describe('getToSearchKeys()', function() {
    var data = _.create(null),
        toSearchRules = [];

    beforeEach(function() {
      for(var key in data) {
        delete data[key];
      }
      _.extend(data, {
        users: [{
          name: 'User 1'
        }, {
          name: 'User 2'
        }, {
          name: 'User 3'
        }]
      });
      validator.update({
        rules: {
          'users.$.name': 'required|string'
        },
        replaces: {
          'users.$.name': 'User name attribute'
        }
      });
      toSearchRules.splice(0, toSearchRules.length);
      toSearchRules.push.apply(toSearchRules, _.keys(validator.rules));
    });

    it('should execute the function of the replace with the index of the current item if it is a function', function() {
      validator.update({
        replaces: {
          'users.$.name': function(i) {
            return `user name ${i}`;
          }
        }
      });

      var replaces = {};
      validator.getToSearchKeys(toSearchRules, data, null, null, replaces);

      assert.deepEqual(_.omit(replaces, ['users.$.name']), {
        'users.0.name': 'user name 0',
        'users.1.name': 'user name 1',
        'users.2.name': 'user name 2'
      });
    });

    it('should list keys when a rule contains $', function() {
      assert.deepEqual(validator.getToSearchKeys(toSearchRules, data), [
        'users.0.name',
        'users.1.name',
        'users.2.name'
      ]);
    });

    it('should create new rules based on the given data', function() {
      var nextRules = {};
      validator.getToSearchKeys(toSearchRules, data, null, nextRules);

      assert.deepEqual(_.omit(nextRules, ['users.$.name']), {
        'users.0.name': 'required|string',
        'users.1.name': 'required|string',
        'users.2.name': 'required|string'
      });
    });

    it('should create new replaces based on the given data', function() {
      var nextReplaces = {};
      validator.getToSearchKeys(toSearchRules, data, null, null, nextReplaces);

      assert.deepEqual(nextReplaces, {
        'users.$.name': 'User name attribute',
        'users.0.name': 'User name attribute',
        'users.1.name': 'User name attribute',
        'users.2.name': 'User name attribute'
      });
    });

    it('should search into defined object lists', function() {
      assert.deepEqual(validator.getToSearchKeys(['object.$.title'], data), [
        'object.0.title',
        'object.1.title',
        'object.2.title'
      ]);
    });

    it('should not ignore special keys while using $ on objects', function() {
      data.object['special-key'] = {
        title: null
      };

      assert.deepEqual(validator.getToSearchKeys(['object.$.title'], data), [
        'object.0.title',
        'object.1.title',
        'object.2.title',
        'object.special-key.title'
      ]);
    });

    it('should find deep $ expressions', function() {
      data.deep = {
        a1: [{
          b: [{
            c: [{
              a: null
            }]
          }]
        }],
        a2: [{
          b: {
            'special-1': {
              c: [{
                a: null
              }]
            },
            'special-2': {
              c: [{
                a: null
              }]
            }
          }
        }]
      };
      assert.deepEqual(validator.getToSearchKeys(['deep.$'], data), [
        'deep.a1',
        'deep.a2'
      ]);
    });
  });

  describe('updateData()', function() {
    it('should define as not dirty if the value has not been changed', function() {
      validator.updateData('users.0.name');
      assert.ok(!validator.data['users.0.name'].dirty);
    });

    it('should define as dirty if the value has been changed', function() {
      validator.updateData('users.0.name', 'user 1');
      assert.ok(validator.data['users.0.name'].dirty);
    });
  });

  describe('loadPresets()', function() {
    const PRESETS = {
      a: {
        rules: {
          'field.one': 'required'
        }
      },
      a2: {
        rules: {
          'field.two': 'required'
        }
      },
      a3: {
        replaces: {
          'field.one': 'Field one',
          'field.two': 'Field two'
        }
      }
    };
    var rules = _.create(null),
        replaces = _.create(null);

    beforeEach(function() {
      _.forEach([rules, replaces], data => {
        for(var key in data) {
          delete data[key];
        }
      });
    });

    it('should load all the function defined presets if the function returns true', function() {
      validator.update({
        presets: {
          a: function() {
            return true;
          }
        }
      });

      validator.loadPresets(PRESETS, rules);
      assert.deepEqual(rules, {
        'field.one': 'required'
      });
    });

    it('should not load the preset if the field returns false', function() {
      validator.update({
        presets: {
          a2: function() {
            return false;
          }
        }
      });
      validator.loadPresets(PRESETS, rules);
      assert.deepEqual(rules, {});
    });

    it('should fill replaces and rules argument with the presets data', function() {
      validator.update({
        presets: {
          a: function() {
            return true;
          },
          a2: function() {
            return true;
          },
          a3: function() {
            return true;
          }
        }
      });

      validator.loadPresets(PRESETS, rules, replaces);

      assert.deepEqual(rules, {
        'field.one': 'required',
        'field.two': 'required'
      });
      assert.deepEqual(replaces, {
        'field.one': 'Field one',
        'field.two': 'Field two'
      });
    });

    it('should extend the current preset and create a new one if the handler returns an object', function() {
      validator.update({
        presets: {
          a: function(data, preset) {
            return {
              rules: {
                'field.three': 'string|email'
              }
            }
          }
        }
      });

      validator.loadPresets(PRESETS, rules);
      assert.deepEqual(rules, {
        'field.three': 'string|email'
      });
    });
  });

  describe('test()', function() {
    var test,
        errors = _.create(null),
        messages = _.create(null);

    beforeEach(function() {
      for(var key in errors) {
        delete errors[key];
      }
      test = function (value) {
        validator.test(['filter_1'], errors, messages, value, 'key');
      };
    });

    it('should throw when the rule is not defined', function() {
      assert.throws(function() {
        test('value');
      }, /no defined rule check function for "filter_1"/);
    });

    it('should ignore other filters that are not "required" if the value is undefined or empty', function(){
      assert.doesNotThrow(function() {
        _.forEach(['', undefined], test);
      });
      _.forEach([0, 'a'], function(value) {
        assert.throws(function() {
          test(value);
        }, /"filter_1"/);
      });
    });

    it('should execute filters with the given arguments since the attribute value be on the first argument', function() {
      var filterFn = sinon.spy();

      validator.update({
        stores: {
          filters: {
            special_filter: filterFn
          }
        },
        rules: {
          'special_field.deep_property': 'special_filter:1,2,3'
        }
      });

      validator.validate({
        special_field: {
          deep_property: 'data'
        }
      });

      assert.ok(filterFn.calledWith('data', '1', '2', '3'));
    });
  });

  describe('validateRule()', function() {
    var data = _.create(null),
        errors = _.create(null),
        replaces = _.create(null),
        messages = _.create(null),
        validateRule;

    beforeEach(function() {
      _.forEach([data, errors, messages], function(object) {
        for(var key in object) {
          delete object[key];
        }
      });

      replaces['user.name'] = 'user name';
      data.user = {
        name: 'user name here'
      }

      validateRule = function(value) {
        return validator.validateRule(value, 'user.name', messages, errors, data, replaces);
      };
    });

    it('should throw when the filters are not an array or a string', function() {
      _.forEach([null, undefined], function(value) {
        assert.throws(function() {
          validateRule(value);
        }, /at key "user\.name"/);
      });
    });

    it('should ignore the filter if the function call returns false', function() {
      assert.throws(function() {
        validateRule(function(data) {
          return 'filter_test';
        });
      }, /"filter_test"/);
      assert.doesNotThrow(function() {
        validateRule(function() {
          return false;
        });
      });
    });

    it('should return false if the function call returns a non valid result', function() {
      assert.equal(false, validateRule(function() {
        return false;
      }));
    });

    it('should fill the "errors" and "messages" argument with the filter error message', function() {
      validateRule('required|min:16');

      assert.deepEqual(messages, {
        'user.name': {
          min: 'The field user name must have at least 16 characters'
        }
      });
      assert.deepEqual(errors, {
        'user.name': {
          min: true
        }
      });
    });
  });

  describe('validate()', function() {
    it('should fill the "messages" instance property with the given messages presents in the validator store', function() {
      validator.update({
        rules: {
          'field.one': 'required'
        },
        replaces: {
          'field.one': 'field 1'
        }
      });
      validator.validate({
        field: {
          one: null
        }
      });
      assert.deepEqual(validator.messages, {
        'field.one': {
          required: 'The field field 1 is mandatory'
        }
      });
    });

    it('should fill the "errors" instance property with the actual data errors', function() {
      validator.update({
        rules: {
          name: 'min:4'
        }
      });
      validator.validate({
        name: 'usr'
      });
      assert.deepEqual(validator.errors, {
        name: {
          min: true
        }
      });
    });

    it('should keep the validator rules free of the presets rules', function() {
      validator.setPreset('a1', {
        rules: {
          b1: 'required|string'
        }
      });
      validator.setPreset('a2', {
        rules: {
          a1: 'required|number'
        }
      });
      validator.update({
        rules: {
          a3: 'required|string'
        },
        presets: {
          a1: function() {
            return true;
          },
          a2: function() {
            return true;
          }
        }
      });

      validator.validate({
        a1: 100,
        b1: undefined,
        a3: null
      });

      assert.deepEqual(validator.rules, {
        a3: 'required|string'
      });
    });

    it('should load array defined presets in validating time and keep the validator rules and replaces clean', function() {
      validator.setPreset({
          a2: {
          rules: {
            a2: 'required|string'
          }
        },
        a3: {
          rules: {
            b1: 'required|string'
          }
        }
      });

      validator.update({
        rules: {
          a1: 'required|string'
        },
        presets: ['a2', 'a3']
      });
      validator.validate({
        a1: 'a1 data',
        a2: 'a2 data',
        b1: 10
      });

      assert.deepEqual(validator.rules, {
        a1: 'required|string'
      });
      assert.deepEqual(validator.errors, {
        b1: {
          string: true
        }
      });
    });

    it('should validate rules with complex $ dotted expressions', function() {
      validator.update({
        rules: {
          'documents.$.name': 'required|string'
        }
      });
      validator.validate({
        documents: {
          'special-key-1': {
            name: null
          },
          'special-key-2': {
            name: 'document 2'
          }
        }
      });
      assert.deepEqual(validator.errors, {
        'documents.special-key-1.name': {
          required: true,
          string: true
        }
      });
    });
  });

  describe('loadFromJSON()', function() {
    it('should load messages from a json object', function() {
      validator.loadFromJSON(require('../lang/en/messages'));
      assert.equal(
        validator.getMessage('required')('test'),
        'The field test is mandatory'
      );
    });
  });
});
