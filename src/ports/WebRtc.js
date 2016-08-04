var configs = require('../configs');

firebase.initializeApp(configs.firebaseConfig);
var database = firebase.database();

var connectionOptions = {
    iceServers: configs.iceServers
};

function startHost(hostDataKey) {
    var channels = [];

    database.ref().on('child_added', function(snapshot) {
        if (snapshot.key === hostDataKey.toString()) {
            database.ref(hostDataKey).on('child_added', function(snapshot) {
                var clientId = snapshot.key;
                console.log(clientId);

                connectHost(hostDataKey, clientId, database).then(function (channel) {
                    channels.push(channel);
                });
            });
        }
    });

    return function (color) {
        channels.forEach(function (channel) {
            channel.send(color);
        });
    }
}

function connectHost(hostDataKey, clientId, database) {
    var clientDataKey = hostDataKey + '/' + clientId;

    return new Promise(function (resolve) {
        var pc = new webkitRTCPeerConnection(connectionOptions);

        pc.ondatachannel = function(event) {
            console.log('on data channel');
            receiveChannel = event.channel;
            receiveChannel.onmessage = function(event) {
                console.log(event.data);
            };
        };

        pc.onicecandidate = function(event) {
            if (event.candidate) {
                console.log('onicecandidate');
                database.ref(clientDataKey).update({
                    hostIceCandidate: event.candidate
                });
                pc.onicecandidate = null;
            }
        };

        var sendChannel = pc.createDataChannel('sendDataChannel');

        sendChannel.onopen = function(event) {
            console.log('channel opened');
            resolve(sendChannel);
        }

        global.sendChannel = sendChannel;

        pc.createOffer().then(function(offer) {
            database.ref(clientDataKey).update({
                offer: offer
            });
            return offer;
        }).then(
            function(offer) {
                return pc.setLocalDescription(offer);
            }
        );

        database.ref(clientDataKey + '/answer').on('value', function(snapshot) {
            var answer = snapshot.val();

            if (answer) {
                console.log('got answer', answer);
                pc.setRemoteDescription(answer).then(function() {
                    console.log('answer received');
                }).then(function() {
                    database.ref(clientDataKey + '/clientIceCandidate').on('value', function(snapshot) {
                        var candidate = snapshot.val();
                        if (candidate) {
                            pc.addIceCandidate(candidate);
                        }
                    });
                });
            }
        });
    });
}

global.startHost = startHost;

function startClient(hostDataKey, clientId, onMessage) {
    var clientDataKey = hostDataKey + '/' + clientId;

    database.ref(clientDataKey).set({
        key: clientId
    });

    database.ref(clientDataKey + '/offer').on('value', function(snapshot) {
        var offer = snapshot.val();

        if (offer) {
            var pc = new webkitRTCPeerConnection(connectionOptions);

            pc.ondatachannel = function(event) {
                console.log('on data channel');
                receiveChannel = event.channel;
                receiveChannel.onmessage = function(event) {
                    console.log(event.data);
                    onMessage(event.data);
                };
            };

            pc.onicecandidate = function(event) {
                if (event.candidate) {
                    console.log('onicecandidate');
                    database.ref(clientDataKey).update({
                        clientIceCandidate: event.candidate
                    });
                    pc.onicecandidate = null;
                }
            };

            pc.setRemoteDescription(offer)
                .then(pc.createAnswer.bind(pc))
                .then(function(answer) {
                    database.ref(clientDataKey).update({
                        answer: answer
                    });
                    return answer;
                })
                .then(pc.setLocalDescription.bind(pc))
                .then(function() {
                    database.ref(clientDataKey + '/hostIceCandidate').on('value', function(snapshot) {
                        var candidate = snapshot.val();
                        if (candidate) {
                            pc.addIceCandidate(candidate);
                        }
                    });
                });
        }
    });
}

global.startClient = startClient;

module.exports = {
    init: function(app) {
        app.ports.sessionId.subscribe(function(session) {
            if (session[1]) {
                app.ports.changedColor.subscribe(startHost(session[0]));
            } else {
                var clientId = Math.round(Math.random() * 10000);
                console.log('Client id: ' + clientId);
                startClient(session[0], clientId, app.ports.changeColor.send);
            }
        });
    }
};
