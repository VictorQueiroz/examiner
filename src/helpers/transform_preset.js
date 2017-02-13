import _ from 'lodash';

export const transformPreset = function(preset, options) {
    options = !_.isFunction(options) && _.isObject(options) ? options : {
        fn: _.isFunction(options) ? options : null
    };

    var fn = options.fn,
            toTransformPreset = _.pick(preset, ['rules', 'replaces']);

    if(!fn) {
        fn = function(value, key) {
            return `${options.prefix}${key}`;
        };
    }

    return _.mapValues(toTransformPreset, function(value, key) {
        return _.mapKeys(value, fn);
    });
};
