var configs = require('../configs');

firebase.initializeApp(configs.firebaseConfig);
var database = firebase.database();

function generateUUID() {
    return Math.round(Math.random() * 10000);
}

function startHost(hostDataKey) {
    var channels = [];

    database.ref().on('child_added', function(snapshot) {
        if (snapshot.key === hostDataKey.toString()) {
            database.ref(hostDataKey).on('child_added', function(snapshot) {
                var clientId = snapshot.key;
                var iceServers = snapshot.val().iceServers;

                connectHost(hostDataKey, iceServers, clientId, database).then(function(channel) {
                    channels.push(channel);
                });
            });
        }
    });

    return function(color) {
        channels.forEach(function(channel) {
            channel.send(color);
        });
    }
}

function connectHost(hostDataKey, iceServers, clientId, database) {
    var clientDataKey = hostDataKey + '/' + clientId;

    return new Promise(function(resolve) {
        var pc = new webkitRTCPeerConnection({
            iceServers: iceServers
        });

        pc.ondatachannel = function(event) {
            receiveChannel = event.channel;
            receiveChannel.onmessage = function(event) {};
        };

        pc.onicecandidate = function(event) {
            if (event.candidate) {
                var newIceCandidate = {};
                newIceCandidate[generateUUID()] = event.candidate;

                database.ref(clientDataKey + '/hostIceCandidates').update(newIceCandidate);
            }
        };

        var sendChannel = pc.createDataChannel('sendDataChannel');

        sendChannel.onopen = function(event) {
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
                pc.setRemoteDescription(answer).then(function() {
                    database.ref(clientDataKey + '/clientIceCandidates').on('child_added', function(snapshot) {
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

function startClient(hostDataKey, iceServers, clientId, onMessage) {
    var clientDataKey = hostDataKey + '/' + clientId;

    database.ref(clientDataKey).set({
        key: clientId,
        iceServers: iceServers
    });

    database.ref(clientDataKey + '/offer').on('value', function(snapshot) {
        var offer = snapshot.val();

        if (offer) {
            var pc = new webkitRTCPeerConnection({
                iceServers: iceServers
            });

            pc.ondatachannel = function(event) {
                receiveChannel = event.channel;
                receiveChannel.onmessage = function(event) {
                    onMessage(event.data);
                };
            };

            pc.onicecandidate = function(event) {
                if (event.candidate) {
                    var newIceCandidate = {};
                    newIceCandidate[generateUUID()] = event.candidate;

                    database.ref(clientDataKey + '/clientIceCandidates').update(newIceCandidate);
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
                    database.ref(clientDataKey + '/hostIceCandidates').on('child_added', function(snapshot) {
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
        var iceServersPromise = new Promise(function(resolve) {
            app.ports.iceServersPort.subscribe(function(iceServers) {
                resolve(iceServers);
            });
        });

        var sessionIdPromise = new Promise(function(resolve) {
            app.ports.sessionId.subscribe(function(session) {
                resolve(session);
            });
        });

        Promise.all([iceServersPromise, sessionIdPromise]).then(function(values) {
            var iceServers = values[0];
            var session = values[1];

            if (session[1]) {
                app.ports.changedColor.subscribe(startHost(session[0]));
            } else {
                var clientId = generateUUID();
                startClient(session[0], iceServers, clientId, app.ports.changeColor.send);
            }
        });
    }
};
