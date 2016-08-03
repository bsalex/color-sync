var configs = require('../configs');

firebase.initializeApp(configs.firebaseConfig);
var database = firebase.database();

var connectionOptions = {
    iceServers: configs.iceServers
};

function startHost(hostDataKey) {
    return new Promise(function (resolve) {
        database.ref().on('child_added', function(snapshot) {
            if (snapshot.key === hostDataKey.toString()) {
                connectHost(hostDataKey, database).then(resolve);
            }
        });
    });
}

function connectHost(hostDataKey, database) {
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
                database.ref(hostDataKey).update({
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
            database.ref(hostDataKey).update({
                offer: offer
            });
            return offer;
        }).then(
            function(offer) {
                return pc.setLocalDescription(offer);
            }
        );

        database.ref(hostDataKey + '/answer').on('value', function(snapshot) {
            var answer = snapshot.val();

            if (answer) {
                console.log('got answer', answer);
                pc.setRemoteDescription(answer).then(function() {
                    console.log('answer received');
                }).then(function() {
                    database.ref(hostDataKey + '/clientIceCandidate').on('value', function(snapshot) {
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

function startClient(hostDataKey, onMessage) {

    database.ref(hostDataKey).set({
        key: hostDataKey
    });

    database.ref(hostDataKey + '/offer').on('value', function(snapshot) {
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
                    database.ref(hostDataKey).update({
                        clientIceCandidate: event.candidate
                    });
                    pc.onicecandidate = null;
                }
            };

            pc.setRemoteDescription(offer)
                .then(pc.createAnswer.bind(pc))
                .then(function(answer) {
                    database.ref(hostDataKey).update({
                        answer: answer
                    });
                    return answer;
                })
                .then(pc.setLocalDescription.bind(pc))
                .then(function() {
                    database.ref(hostDataKey + '/hostIceCandidate').on('value', function(snapshot) {
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
                startHost(session[0]).then(function (channel) {
                    app.ports.changedColor.subscribe(channel.send.bind(channel));
                });
            } else {
                startClient(session[0], app.ports.changeColor.send);
            }
        });
    }
};
