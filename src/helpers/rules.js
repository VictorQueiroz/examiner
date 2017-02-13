import _ from 'lodash';

function addToRulesListFn(rulesList, shouldAddRule, ruleName) {
    if(shouldAddRule) {
        rulesList.push(ruleName);
    }
}

export const rules = function() {
    var args = _.toArray(arguments),
        rulesList = [],
        fn = addToRulesListFn.bind(this, rulesList);

    _.forEach(args, function(arg) {
        if(_.isString(arg)) {
            rulesList.push(arg);
        } else {
            _.forEach(arg, fn);
        }
    });

    return rulesList.join('|');
};
