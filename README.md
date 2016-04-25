# examiner

Validate your data however you want

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
      <div>
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
      </div>
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
