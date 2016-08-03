'use strict';

require('./index.html');
require('../styles/color-sync.css');
require('colorjoe/css/colorjoe.css');

var Elm = require('./App.elm');
var mountNode = document.getElementById('app');

var app = Elm.App.embed(mountNode);

require('./ports/ColorPicker.js').init(app);
require('./ports/WebRtc.js').init(app);
