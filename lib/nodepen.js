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
  this.cookie;

  if (cookie) {
    this.cookie = request.cookie(cookie);
    j.setCookie(this.cookie, 'http://' + this.domain);
  };
}

/**
 * Get token for current session
 *
 */

Nodepen.prototype.getToken = function() {
  var deferred = Q.defer();
  var url = 'https://codepen.io/login';
  var np = this;

  request(url, function (err, res, body) {
    var $ = cheerio.load(body);
    np.token = $('meta[name=csrf-token]').attr('content');
    deferred.resolve(np.token);
  });

  return deferred.promise;
}

/**
 * TODO: Login
 *
 * @param {String} username
 * @param {String} password
 */

Nodepen.prototype.doLogin = function(username, password) {
  return;
}

/**
 * Check if user is logged in.
 */

Nodepen.prototype.checkLogin = function () {
  var deferred = Q.defer();
  var url = 'https://codepen.io/login';

  var r = request(url, function (err, res, body) {
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
  var t = this;

  function callback (error, response, body) {
    var user = {};

    var $ = cheerio.load(body);

    user.id = JSON.parse($('#init-data').val()).__profiled.id;
    user.name = $('#profile-name-header').text().trim() || null;

    user.avatar = {
      large: utils.fixUrl($('#profile-image').attr('src').trim()) || null,
      small: utils.fixUrl(utils.getSmallAvatar($('#profile-image').attr('src').trim()))
    };

    user.location = $('#profile-location').text().trim();
    user.followers = parseInt($('#followers-count').text().trim());
    user.following = parseInt($('#following-count').text().trim());

    if (t.cookie && username !== t.username) {
      user.followsMe = $('#profile-badge-follows').text() ? true : false;
      // show `following` if `display` property isn't set to none
      // it'll show false if you're not logged in
      user.followingThisUser = $('#follow-this-user').attr('style') ? true : false;
    }
    
    user.isPro = $('#profile-badge-pro').text() ? true : false;
    user.forHire = $('#hire-me-button').text() ? true : false;
    user.profileLinks = [];

    $('#profile-links a').each(function(){
      var link = user.profileLinks.push(utils.fixUrl($(this).attr('href')));
    });

    if (user.name && response.statusCode == 200) {
      deferred.resolve(user);
    } else {
      deferred.reject({
        error: {
          msg: 'Cannot found ' + username
        }
      });
    }
    
  }
  request({
    url: url
  }, callback);

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
        avatar: utils.fixUrl($(this).find('.activity-avatar img').attr('src')),
        name: $(this).find('.activity-name').text().trim(),
        action: $(this).find('.activity-action').text().trim(),
        thing: $(this).find('.activity-thing').text().trim(),
        url: $(this).find('.activity-thing').attr('href')
      }
      
      data.push(a);
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
        id: $(this).find('.comment-delete').data('id'),
        avatar: utils.fixUrl(
          $(this).find('.block-comment-avatar img').attr('src')),
        name: $(this).find('.comment-username').text().trim(),
        username: $(this).find('.username').text().trim(),
        date: $(this).find('.block-comment-time').text().trim(),
        content: $(this).find('.comment-text').html().trim(),
        loves: parseInt($(this).find('.comment-number').text().trim()),
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
 * e.g getPens('popular', null, 4, 2) or getPens('showcase', 'mallendeo')
 *
 * @param {String} source
 * @param {String} name
 * @param {Int} start
 * @param {Int} end
 */

Nodepen.prototype.getPensList = function (source, name, start, end) {
  var domain = this.domain,
      url = '',
      deferred = Q.defer(),
      start = start || 1,
      end = end || 1,
      source = source || 'picked';

  var currPage = start;
  var penList = [];


  var makeUrl = function() {
    var url = 'http://' + domain + '/';
    var sources = [
      'picked',
      'popular',
      'recent',
      'showcase',
      'public',
      'private',
      'forked',
      'loved',
      'following',
      'collection'
    ];

    if (!(sources.indexOf(source) >= 0)) {
        return false;
    }

    if (source != 'collection' && name) {
      // user pens
      url += name + '/next/' + source ;
    } else if (source != 'collection' && !name) {
      // main page pens
      url += 'home/next/' + source;
    }
    return url;
  }

  var url = makeUrl();

  var getPens = function () {

    var pageUrl = url;
    pageUrl += '?page=' + currPage;

    if (currPage > end) {
      deferred.resolve(penList);
      return;
    }

    request(pageUrl, function (error, response, body) {
      var body = JSON.parse(body).html;
      var $ = cheerio.load(body);

      $('.single-pen').each(function() {
        var pen = {};
        pen.slug = $(this).data('slug-hash');

        pen.user = $(this).find('.user a').attr('href');
        pen.user = pen.user ? pen.user.replace('/','') : name;

        pen.url = 'http://codepen.io/' + pen.user + '/pen/' + pen.slug;

        var overlay = $(this).find('.meta-overlay');
        pen.title = overlay.children('h2').text().trim();
        pen.description = overlay.children('p').text().trim();

        pen.comments = parseInt($(this).find('.single-stat.comments').text().trim());
        pen.views = parseInt($(this).find('.single-stat.views').text().trim());

        var loves = $(this).find('.single-stat.loves'),
            lovesCount = parseInt(loves.children('.count').text().trim())
        pen.loves = lovesCount ? lovesCount : 0;
        pen.loveId = loves.data('id');
        penList.push(pen);
      });

      currPage++;
      getPens();

    });


  }

  getPens();

  
  return deferred.promise;

}


Nodepen.prototype.getPopularPens = function() {
  return this.getPensList('popular');
}
Nodepen.prototype.getPickedPens = function() {
  return this.getPensList('picked');
}
Nodepen.prototype.getRecentPens = function() {
  return this.getPensList('recent');
}

/**
 * Make a comment on a pen/post
 *
 * @param {String} postUrl
 * @param {String} comment
 */

Nodepen.prototype.postComment = function(thingUrl, comment) {
  var deferred = Q.defer();
  var np = this;
  var url = '';

  // split url and get post data
  var originalUrl = thingUrl;
  var thingUrl = thingUrl.split('/').slice(3, 6);

  var thing = {
    user: thingUrl[0],
    type: thingUrl[1],
    target: thingUrl[2]
  };

  var formData = {
    text: comment
  };

  if (thing.type == 'pen') {

    formData.kind = 'comment';
    url = 'http://codepen.io/comment/'+thing.user+'/'+thing.target;
    doPost();

  } else {

    formData.permalink = thing.target;
    url = 'http://codepen.io/post/comment';

    request(originalUrl, function callback (error, response, body) {
      var $ = cheerio.load(body);
      var initData = JSON.parse($('#init-data').val());
      formData.hashid = initData['__post']['hashid'];
      doPost();
    });

  }

  function callback (error, response, body) {
    if (error) deferred.reject(error);
    deferred.resolve(JSON.parse(body));
  }

  function doPost() {
    request.post({
      url: url,
      formData: formData,
      headers: {
        'X-CSRF-Token': np.token,
      }

    }, callback);
  }

  return deferred.promise;

}

/**
 * Love a comment
 * slug (pen or blog post)
 * love is the amount of hearts that you give
 *
 * @param {String} slug
 * @param {Number} commentId
 * @param {Number} love
 */

Nodepen.prototype.loveComment = function(slug, commentId, love) {
  var deferred = Q.defer();
  var np = this;
  var url = 'http://codepen.io/comment/love';

  if (!commentId || !slug) return false;

  var formData = {
    slug_hash: slug,
    comment_id: commentId,
    action: 'love',
    love_value: ''
  };

  var love = love || true;
  if (love) formData.love_value = 'love';

  function callback (error, response, body) {
    if (error) deferred.reject(error);
    deferred.resolve(JSON.parse(body));
  }

  request.post({
    url: url,
    formData: formData,
    headers: {
      'X-CSRF-Token': np.token,
    }

  }, callback);

  return deferred.promise;
};

/**
 * Love a pen
 * you must pass a pen ID, NOT a slug
 * love is the amount of hearts that you give
 *
 * @param {Number} penId
 * @param {Number} love
 */

Nodepen.prototype.lovePen = function(penId, love) {
  var deferred = Q.defer();
  var np = this;
  var url = 'http://codepen.io/pen/love';

  var formData = {
    pen_id: penId,
    loved_type: ''
  };

  love = (love > -1 && love < 4) ? love : 1;

  formData.loved_type = 'loved-' + parseInt(love);

  function callback (error, response, body) {
    if (error) deferred.reject(error);
    deferred.resolve(JSON.parse(body));
  }

  request.post({
    url: url,
    formData: formData,
    headers: {
      'X-CSRF-Token': np.token,
    }

  }, callback);

  return deferred.promise;
};
