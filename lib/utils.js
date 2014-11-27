/**
 * Utils
 */

exports.diff = function(a, b) {
  return a.filter(function(i) { return b.indexOf(i) < 0; });
};

exports.compareKeys = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

exports.fixUrl = function(url) {
  return url.replace(/^\/\//, 'http://')
}

exports.getSmallAvatar = function(url) {
  var urlArr = url.replace(/^\/\//, '').split('/');
  if (urlArr[0] === 's3-us-west-2.amazonaws.com') {
    // codepen
    return url.replace('profile-512', 'profile-80');
  } else {
    // gravatar
    return url.replace('?s=512', '?s=80');
  }
}
