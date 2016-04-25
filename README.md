# examiner

Validate your data however you want

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
    // the message will be like:
    //  - The field "document name 4" is required
    //  - The field "document name 4" need to have at least 10 characters
    'documents.$.name': function(i) {
      return `document name ${i + 1}`;
    }
  }
});
validator.validate(user);
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
