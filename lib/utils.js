/**
 * Utils
 */

var fs = require('fs');

exports.diff = function(a, b) {
  return a.filter(function(i) { return b.indexOf(i) < 0; });
};

exports.compareKeys = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

exports.fixUrl = function(url) {
	return url.replace(/^\/\//, 'http://')
}