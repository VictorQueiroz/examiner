var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    modules = {};

fs.readdirSync(__dirname).filter(function(file) {
  return file !== __filename;
})
.forEach(function(file) {
  var name = _.camelCase(file.replace(/\.js$/, ''));
  modules[name] = require(path.resolve(__dirname, file));
});

module.exports = modules;
