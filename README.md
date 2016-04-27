# examiner

Validate your data however you want

### Installation
```
npm install --save examiner
```

### Variable filters
```js
import {Validator} from 'examiner';

var user = {
  hasMessages: true,
  messages: [
    {body: 'message 1'},
    {body: 'message 2'},
    {body: 'message 3'}
  ]
};

var validator = new Validator({
  rules: {
    'messages.$.body': function(data) {
      return data.hasMessages ? 'required|min:10|string' : null;
    }
  }
});
validator.validate(user);
```

You can use `Validator.rules` which works pretty like [classNames](https://github.com/JedWatson/classnames) module, and you can use like this for toggle specific filters in a rule while using the **variable filters feature**:

```js
import {Validator, rules} from 'examiner';

// or just Validator.rules

var validator = new Validator({
  rules: {
    name: function(data, validator) {
      return rules('string', {
        required: !validator.empty
      });
    }
  }
});
```

### Using presets

Presets could be useful if you want to reuse validation *rules* or *replaces* into more than one Validator instance without need to rewrite anything.

```js
import {Validator} from 'examiner';

Validator.setPreset('user_email_validation', {
  rules: {
    email: 'email|required|string'
  }
});

var validator = new Validator({
  rules: {
    'name': 'required|string|min:10'
  },
  presets: ['user_email_validation']
});

validator.validate({
  name: 'marshall mathers',
  email: 'xxxxx@gmail.com'
});
```

### Extending presets

```js
import _ from 'lodash';
import {Validator} from 'examiner';

Validator.setPreset('my_custom_preset', {
  rules: {
    'name': function(data) {
      return data.shouldRequireName ? 'required|string' : null;
    }
  }
});
Validator.setPreset('another_cool_preset', {
  rules: {
    cool_rule: 'required|string'
  }
});

var user = {
  deep: {
    name: 'john crockful'
  }
};

var validator = new Validator({
  presets: {
    my_custom_preset: function(preset) {
      return {
        rules: _.mapKeys(preset.rules, function(value, key) {
          return `deep.${key}`;
        });
      };
    },
    another_cool_preset: function(data) {
      return false;
    }
  }
});
```

The preset `another_cool_preset` will be ignored for now since it returned as false, and `my_custom_preset` will be extended to the following. But only internally at the time of the validation, the global preset will stay the same for other Validator instances:
```js
{
  rules: {
    'deep.name': function(data) {
      return data.shouldRequiredName ? 'required|string' : null;
    }
  }
}
```

There are still some helper functions at the constructor of `Validator`, like `Validator.transformPreset` which can be used to add a prefix in front of the preset `keys` and `replaces`:

```js
Validator.setPreset({
  userDocuments: {
    rules: {
      validUntil: 'date|required',
      description: 'string|required',
      photo: 'url|required'
    }
  }
});

var validator = new Validator({
  presets: {
    userDocuments: function(preset) {
      return Validator.transformPreset(preset, {prefix: 'documents.$.'});
    }
  }
});
```

### Validating arrays
```js
import {Validator} from 'examiner';

var user = {
  documents: [{
    name: 'My id 1'
  }, {
    name: 'My id 2'
  }]
};
var validator = new Validator({
  rules: {
    'documents.$.name': 'required|min:10'
  },
  replaces: {
    // the messages will be like:
    //  - The field "document name 4" is required
    //  - The field "document name 4" need to have at least 10 characters
    'documents.$.name': function(i) {
      return `document name ${i + 1}`;
    }
  }
});
validator.validate(user);
```

### Translating messages

First you should make a copy of [lang/en/messages.js](https://github.com/VictorQueiroz/examiner/blob/master/lang/en/messages.js), change, and import the new one in your Validator instance:

```js
import {Validator} from 'examiner';

var validator = new Validator();
validator.update({
  rules: {
    'name': 'required|string'
  }
});
validator.loadFromJSON(require('./lang/en-us/messages'));

// Globally
Validator.loadFromJSON(require('./lang/pt-br/messages'));
```

### With ReactJS
```jsx
import _ from 'lodash';
import React from 'react';
import {Validator} from 'examiner';

var AppIndex = React.createClass({
  getInitialState: function() {
    return {
      user: {
        name: ''
      },
      validator: new Validator({
        rules: {
          name: 'required|min:10'
        }
      })
    };
  },
  handleChange: function() {
    var user = _.clone(this.state.user);
    _.extend(user, {
      name: this.refs.userName.value
    });
    this.state.validator.validate(user);
    this.setState({user: user});
  },
  render: function() {
    return (
      <form>
        {_.map(this.state.validator.messages, function(errors, fieldName) {
          return _.map(errors, function(message, rule) {
            return (
              <div className="alert alert-danger" key={`${fieldName}_${rule}`}>
                {message}
              </div>
            );
          });
        })}
        <input ref="userName" value={this.state.user.name} onChange={this.handleChange} />
        <button disabled={this.state.validator.invalid} type="submit">
          Send
        </button>
      </form>
    );
  }
});
```

### Private filters
```js
var Validator = require('examiner').Validator;
var validator = new Validator({
  rules: {

  }
});
validator.setFilter('special_filter', function(string) {
  return /[A-Z]+/.test(string);
});
```

### Global filters
```js
var Validator = require('examiner').Validator;
Validator.setFilter('special_filter', function(string) {
  return /[A-Z]+/.test(string);
});
```

Need more? Come and check [more examples](https://github.com/VictorQueiroz/examiner/tree/master/test)!
