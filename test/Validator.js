var assert = require('assert'),
    Validator = require('../lib/Validator');

describe('Validator', function() {
  var validator;

  beforeEach(function() {
    validator = new Validator();
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

  });
});