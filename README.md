nodepen
=======

An experimental CodePen API built with node

It's a simple api, currently with a limited support

## What can nodepen do?

For now

 - Get user info 
 - Get own recent activity
 - Get pen data by URL or slug

## Installation and usage

Installing with npm
```
$ npm install nodepen-api --save
```

### Basic usage

```javascript
var Nodepen = require('nodepen-api');

// Your username and the _codepen_session cookie.
// This is for now, until have a login function.
// If you don't pass arguments, then user is set to anon

var np = new Nodepen( String username, String cookie );
```
Example
```javascript
var np = new Nodepen('mallendeo', '_codepen_session=DA34B...');
```

#### Get user data
All functions returns a promise, so you have to use .then() to retrieve data
```javascript
// get mallendeo's user data
var user = np.getUserData('mallendeo');

user.then(function(data) {
	// returns an object with user data
	console.log(data);
});
```

#### Get recent activity

```javascript
var activity = np.getRecentActivity();

activity.then(function(data) {
	// returns an object with activity data
	console.log(data);
});
```

#### Get pen data
You can pass either a pen url, or a slug followed by the username
```javascript
// np.getPenData('gwAFk', 'mallendeo');
// or
// np.getPenData('http://codepen.io/mallendeo/pen/gwAFk');

var pen = np.getPenData('gwAFk', 'mallendeo');

pen.then(function(data) {
	// returns an object with pen data
	console.log(data);
});
```

#### Get pens list
You cant retrieve pens by category/source
e.g. 'popular', 'picked', 'showcase', etc.
First argument is the source, this can be the
following values

```javascript
[
  'picked',
  'popular',
  'recent',
  'showcase',
  'public',
  'private',
  'forked',
  'loved',
  'collection'
]
```

Second argument is the username, if it's `null` then
it'll show public pens, otherwise will show your pens.

`start` and `end` values are optional, they set the
initial page and the last page, if it's a large range
it'll take longer to retrieve the list.

```javascript
var list = np.getPensList('showcase', 'mallendeo').then(function(data) {
  console.log(data);
});

```

## TODO
- Get others public activity feed (from rss)
- Make a login function that doesn't require a session cookie
