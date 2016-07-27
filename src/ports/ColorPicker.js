var colorjoe = require('colorjoe');

module.exports = {
    init: function (app) {

        setTimeout(function () {
            var joe = colorjoe.rgb(document.querySelector('.color-selector'), '#FFF',
            [
                ['fields', {space: 'RGB', limit: 255, fix: 0}],
                ['fields', {space: 'HSL', limit: 255, fix: 0}],
                'hex'
            ]);
            joe.on("change", function(color) {
                app.ports.changeColor.send(color.css());
            });
        }, 0);
    }
};
