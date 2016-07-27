'use strict';

// Require index.html so it gets copied to dist
require('./index.html');

var Elm = require('./App.elm');
var mountNode = document.getElementById('app');

// The third value on embed are the initial values for incomming ports into Elm
var app = Elm.App.embed(mountNode);

require('./ports/ColorPicker.js');
