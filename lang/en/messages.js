module.exports = {
  required: function(attribute) {
    return `The field ${attribute} is mandatory`;
  },
  email: function(attribute) {
    return `The field ${attribute} must be an valid email address`;
  },
  number: function(attribute) {
    return `The field ${attribute} must be a number`;
  },
  boolean: function(attribute, value) {
    value = _.isUndefined(value) || value == 'true' ? 'true' : 'false';
    return `The field ${attribute} must be checked as ${value}`;
  },
  date: function(attribute) {
    return `The field ${attribute} must be a valid date`;
  },
  url: function(attribute) {
    return `The field ${attribute} must be a valid url`;
  },
  size: {
    number: function(attribute, size) {
      return `The field ${attribute} must have size equal to ${size}`;
    },
    string: function(attribute, size) {
      return `The field ${attribute} must have ${size} characters`;
    }
  },
  min: {
    number: function(attribute, min) {
      return `The field ${attribute} must be at least ${min}`;
    },
    string: function(attribute, min) {
      return `The field ${attribute} must have at least ${min} characters`
    }
  }
};
