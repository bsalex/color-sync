var config = {
    apiKey: "AIzaSyCstSg_t2c5WsdkmcWWvBmjO3TiaqNVWcI",
    authDomain: "display-sync.firebaseapp.com",
    databaseURL: "https://display-sync.firebaseio.com",
    storageBucket: "",
  };
firebase.initializeApp(config);
var database = firebase.database();

var connectionOptions = {
    iceServers: [{
        url: 'stun:stun01.sipphone.com'
    }, {
        url: 'stun:stun.ekiga.net'
    }, {
        url: 'stun:stun.fwdnet.net'
    }, {
        url: 'stun:stun.ideasip.com'
    }, {
        url: 'stun:stun.iptel.org'
    }, {
        url: 'stun:stun.rixtelecom.se'
    }, {
        url: 'stun:stun.schlund.de'
    }, {
        url: 'stun:stun.l.google.com:19302'
    }, {
        url: 'stun:stun1.l.google.com:19302'
    }, {
        url: 'stun:stun2.l.google.com:19302'
    }, {
        url: 'stun:stun3.l.google.com:19302'
    }, {
        url: 'stun:stun4.l.google.com:19302'
    }, {
        url: 'stun:stunserver.org'
    }, {
        url: 'stun:stun.softjoys.com'
    }, {
        url: 'stun:stun.voiparound.com'
    }, {
        url: 'stun:stun.voipbuster.com'
    }, {
        url: 'stun:stun.voipstunt.com'
    }, {
        url: 'stun:stun.voxgratia.org'
    }, {
        url: 'stun:stun.xten.com'
    }]
};

function startHost() {
    var pc = new webkitRTCPeerConnection(connectionOptions);

    pc.ondatachannel = function(event) {
        console.log('on data channel');
        receiveChannel = event.channel;
        receiveChannel.onmessage = function(event) {
            console.log(event.data);
        };
    };

    // send any ice candidates to the other peer
    pc.onicecandidate = function(event) {
        if (event.candidate) {
            console.log('onicecandidate');
            localStorage.setItem('hostIceCandidate', JSON.stringify(event.candidate));
            pc.onicecandidate = null;
        }
    };

    var sendChannel = pc.createDataChannel("sendDataChannel", {
        reliable: false
    });

    sendChannel.onopen = function(event) {
        console.log('channel opened');
    }

    sendChannel.onmessage = function(event) {
        console.log('channel got a message');
    }

    sendChannel.onclose = function(event) {
        console.log(event);
        console.log('channel has been closed');
    }

    global.sendChannel = sendChannel;

    pc.createOffer().then(function(offer) {
        localStorage.setItem('offer', JSON.stringify(offer));
        return offer;
    }).then(
        function(offer) {
            return pc.setLocalDescription(offer);
        }
    );

    window.addEventListener('storage', function(event) {
        if (event.key === 'answer') {
            pc.setRemoteDescription(
                JSON.parse(localStorage.getItem('answer'))).then(function() {
                console.log('answer received');
            });
        }

        /*if (event.key === 'clientIceCandidate') {
            pc.addIceCandidate(
                JSON.parse(localStorage.getItem('clientIceCandidate'))).then(function() {
                console.log('Ice candidate on host has been added');
            });
        }*/
    }, false);
}

global.startHost = startHost;

function startClient() {
    var pc = new webkitRTCPeerConnection(connectionOptions);

    pc.ondatachannel = function(event) {
        console.log('on data channel');
        receiveChannel = event.channel;
        receiveChannel.onmessage = function(event) {
            console.log(event.data);
        };
    };

    // send any ice candidates to the other peer
    pc.onicecandidate = function(event) {
        if (event.candidate) {
            console.log('onicecandidate');
            localStorage.setItem('clientIceCandidate', JSON.stringify(event.candidate));
            pc.onicecandidate = null;
        }
    };

    pc.setRemoteDescription(JSON.parse(localStorage.getItem('offer'))).then(function() {
        console.log('client remove desc set');
        return pc.createAnswer();
    }).then(function(answer) {
        console.log('client local desc stored');
        localStorage.setItem('answer', JSON.stringify(answer));
        return answer;
    }).then(function(answer) {
        console.log('client local desc set');
        return pc.setLocalDescription(answer);
    }).then(function() {
        console.log('client ICE candidat added');
        pc.addIceCandidate(JSON.parse(localStorage.getItem('hostIceCandidate')));
    });
}

global.startClient = startClient;
