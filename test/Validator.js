var _ = require('lodash'),
    assert = require('assert'),
    Validator = require('../lib/Validator');

describe('Validator', function() {
  var validator;

  beforeEach(function() {
    validator = new Validator();
    validator.loadFromJSON(require('../lang/en/messages'));
  });

  describe('getPreset()', function() {
    it('should throw when try to get a non existent preset', function() {
      assert.throws(function() {
        validator.getPreset('p1');
      }, /Preset named "p1" is not defined/);
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

    it('should not ignore array defined presets', function() {
      assert.throws(function() {
        validator.update({
          presets: ['a']
        });
      }, /named "a"/);
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

      assert.deepEqual(nextRules, {
        'users.$.name': 'required|string',
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
