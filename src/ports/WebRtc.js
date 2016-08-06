var configs = require('../configs');

firebase.initializeApp(configs.firebaseConfig);
var database = firebase.database();

var connectionOptions = {
    iceServers: configs.iceServers
};

function generateUUID() {
    return Math.round(Math.random() * 10000);
}

function startHost(hostDataKey) {
    var channels = [];
    console.log('startHost');

    database.ref().on('child_added', function(snapshot) {
        console.log('host 1');
        if (snapshot.key === hostDataKey.toString()) {
            console.log('host 2');
            database.ref(hostDataKey).on('child_added', function(snapshot) {
                var clientId = snapshot.key;
                var iceServers = snapshot.val().iceServers;
                console.log(clientId);
                console.log('host', iceServers);

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

        console.log('here');

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

                var newIceCandidate = {};
                newIceCandidate[generateUUID()] = event.candidate;

                database.ref(clientDataKey + '/hostIceCandidates').update(newIceCandidate);
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
                    database.ref(clientDataKey + '/clientIceCandidates').on('child_added', function(snapshot) {
                        var candidate = snapshot.val();
                        console.log('Host candidate added ', candidate);
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
                        console.log('Client candidate added ', candidate, snapshot.val(), snapshot.key);

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
            console.log(session);
            if (session[1]) {
                app.ports.changedColor.subscribe(startHost(session[0]));
            } else {

                var xhr = new XMLHttpRequest();

                xhr.addEventListener("readystatechange", function() {
                    if (this.readyState === 4) {
                        var iceServers = JSON.parse(this.responseText).d.iceServers;
                        var clientId = generateUUID();
                        console.log('Client id: ' + clientId);
                        startClient(session[0], iceServers, clientId, app.ports.changeColor.send);
                    }
                });

                xhr.open("GET", "https://service.xirsys.com/ice?ident=bsalex&secret=280b50ac-5b50-11e6-8b91-4bca927191f6&domain=display-sync.local.com&application=default&room=default&secure=1");
                xhr.send();
            }
        });
    }
};
