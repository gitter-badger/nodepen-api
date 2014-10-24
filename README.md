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
var Nodepen = require('nodepen');

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
	// outputs an object with user data
	console.log(data);
});
```

#### Get recent activity

```javascript
var activity = np.getRecentActivity();

activity.then(function(data) {
	// outputs an object with activity data
	console.log(data);
});
```

#### Get pen data

TODO...
