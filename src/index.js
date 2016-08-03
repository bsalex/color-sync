'use strict';

// Require index.html so it gets copied to dist
require('./index.html');
require('../styles/color-sync.css');
require('colorjoe/css/colorjoe.css');

var Elm = require('./App.elm');
var mountNode = document.getElementById('app');

// The third value on embed are the initial values for incomming ports into Elm
var app = Elm.App.embed(mountNode);

require('./ports/WebRtc.js');
var colorPickerPort = require('./ports/ColorPicker.js');
colorPickerPort.init(app);
var webRtc = require('./ports/WebRtc.js');
webRtc.init(app);
