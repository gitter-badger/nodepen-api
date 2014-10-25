'use strict';

/**
 *  Module dependencies
 */

var request = require('request'),
    Q = require('q'),
    cheerio = require('cheerio'),
    validUrl = require('valid-url'),
    utils = require('./utils');

/**
 * Expose `Nodepen`.
 */

exports = module.exports = Nodepen;

/**
 *  Set cookie jar.
 */

var j = request.jar(),
    request = request.defaults({ jar: j });

/**
 * Initialize `Nodepen` with the given `username` and `cookie`.
 * The cookie must be the `_codepen_session` one.
 * e.g `_codepen_session=BAh7CEkiB2lkB...`
 *
 * TODO: a login method.
 *
 * @param {String} username
 * @param {String} cookie
 */

function Nodepen (username, cookie) {
  this.username = username || 'anon';
  this.domain = 'codepen.io';

  if (cookie) {
    var cookie = request.cookie(cookie);
    j.setCookie(cookie, 'http://' + this.domain);
  };
}

/**
 * Check if user is logged in.
 */

Nodepen.prototype.checkLogin = function () {
  var deferred = Q.defer();
  var url = 'https://codepen.io/login';

  var r = request.get(url, function (err, res, body) {
    deferred.resolve(url != res.request.uri.href);
  });

  return deferred.promise;
}

/**
 * Get user profile info.
 * followsMe and followingThisUser for logged user only.
 *
 * @param {String} username
 */

Nodepen.prototype.getUserData = function (username) {
  var deferred = Q.defer();
  var url = 'http://' + this.domain + '/' + username;

  function callback (error, response, body) {
    var user = {};

    var $ = cheerio.load(body);

    user.name = $('#profile-name-header').text().trim() || null;
    user.location = $('#profile-location').text().trim();
    user.followers = parseInt($('#followers-count').text().trim());
    user.following = parseInt($('#following-count').text().trim());
    user.followsMe = $('#profile-badge-follows').text() ? true : false;

    // following if display is not set to none
    // it'll show false if you're not logged in
    user.followingThisUser = $('#follow-this-user').attr('style') ? true : false;
    
    user.isPro = $('#profile-badge-pro').text() ? true : false;
    user.forHire = $('#hire-me-button').text() ? true : false;
    user.profileLinks = [];

    $('#profile-links a').each(function(){
      var link = 
      user.profileLinks.push(utils.fixUrl($(this).attr('href')));
    });

    if (user.name) {
      deferred.resolve(user);
    } else {
      deferred.reject('Cannot found ' + username);
    }
    
  }
  request(url, callback);

  return deferred.promise;

}

/**
 * Get logged user recent activity feed.
 *
 * TODO: get others users activity using
 * the public rss feed.
 *
 */

Nodepen.prototype.getRecentActivity = function () {
  var deferred = Q.defer();
  var url = 'http://' + this.domain + '/' + this.username + '/activity';

  function callback(error, response, body) {
    var $ = cheerio.load(body);

    var data = [];

    $('.action-type-social').each(function(){
      var a = {
        avatar: utils.fixUrl(
          $(this).find('.activity-avatar img').attr('src')),
        name: $(this).find('.activity-name').text().trim(),
        action: $(this).find('.activity-action').text().trim(),
        thing: $(this).find('.activity-thing').text().trim(),
        url: $(this).find('.activity-thing').attr('href')
      }
      
      data.push(a);
      console.log(a);
    });

    if (data.length > 0) {
      deferred.resolve(data);
    } else {
      deferred.reject('Cannot get recent activity.');
    }
    
  }

  request(url, callback);

  return deferred.promise;
}

/*============================
=           Pens            =
============================*/

/**
 * Get pen by URL or slug.
 * If it's a slug, you must pass the post owner username.
 *
 * @param {String} slugOrUrl
 * @param {String} username
 */

Nodepen.prototype.getPenData = function (slugOrUrl, username) {
  var deferred = Q.defer(),
      username = username || this.username,
      url = validUrl.isUri(slugOrUrl)
        ? slugOrUrl.replace(/(\/pen)|(\/details)/, '/drawer')
        : 'http://' + this.domain + '/' + username + '/drawer/' + slugOrUrl;

  function callback(error, response, body) {
    var $ = cheerio.load(body);

    if (response.statusCode == 404) {
      deferred.reject('Pen not found.');
      return deferred.promise;
    }

    // pen details
    var tags = [];
    $('.tag-grid li a').each(function() {
      tags.push($(this).text());
    });

    var nameElem = $('.details-meta .byline a');
    var data = {
      title: $('#details-title').text().trim(),
      author: {
        username: nameElem.attr('href').replace(/\//,''),
        name: nameElem.text().trim(),
        avatar: utils.fixUrl($('.details-avatar a img').attr('src'))
      },
      description: $('.pen-description').text().trim(),
      tags: tags,
      date: {
        created: $('.dateline time').first().attr('datetime').trim(),
        modified: $('.dateline time').last().attr('datetime').trim()
      },
      comments: []
    }

    // get pen comments
    $('#comment-list .comment').each(function(){
      var c = {
        id: $('.comment-delete').data('id'),
        avatar: utils.fixUrl(
          $(this).find('.block-comment-avatar img').attr('src')),
        name: $(this).find('.comment-username').text().trim(),
        username: $(this).find('.username').text().trim(),
        date: $(this).find('.block-comment-time').text().trim(),
        content: $(this).find('.comment-text').html(),
      }

      c.name = c.name.replace(c.username, '').trim();
      c.username = c.username.replace(/\(\@|\)/g, '');
      
      data.comments.push(c);
    });

    if (data) {
      deferred.resolve(data);
    }

  }

  request(url, callback)
  
  return deferred.promise;
}

/**
 * Get pens from different sections.
 * First parameter is the starting page, 
 * and second is the end page. It'll take longer
 * if you set a wide range of pages.
 *
 * Then you set the list of pens you want.
 * 
 * `name` is only required if you set an specific
 * source that must have an name or slug (like a user, or collection)
 *
 * e.g getPens(4, 2, 'popular') or getPens(1, 2, 'user', 'mallendeo')
 *
 * @param {Int} start
 * @param {Int} end
 * @param {String} source
 * @param {String} name
 */

Nodepen.prototype.getPensList = function (start, end, source, name) {
  var deferred = Q.defer(),
      start = start || 1,
      end = end || 2,
      source = source || 'picked';

  var makeUrl = function() {
    var url = 'http://' + this.domain + '/';
    var sources = [
      'picked',
      'popular',
      'recent',
      'showcase',
      'public',
      'private',
      'forked',
      'loved',
      'collection'
    ];

    if (!(sources.indexOf(source) >= 0)) {
        return false;
    }

    if (source != 'collection' && name) {
      // user pens
      url += name + '/next/' + source + '?page=';
    } else if (source != 'collection' && !name) {
      // main page pens
      url += 'home/next/' + source + '?page=';
    };
  }

  function callback(error, response, body) {
    var $ = cheerio.load(body);

  }

  request(url, callback)
  
  return deferred.promise;


}