var Elm = require('../App.elm');

console.log(Elm);

var mountNode = document.getElementById('app');
var app = Elm.App.embed(mountNode);

console.log(app.ports);

app.ports.changeColor.send("#FFF");


module.exports = {
    init: function () {
        console.log(123456);
    }
};
