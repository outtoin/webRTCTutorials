'use strict';

var pcConfig = {
    'iceServers': [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            urls: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
    ]
};

const constraints = window.constraints = {
    audio: true,
    video: false,
};

// RTC
let localPeerConnection;

// Websocket
const socket = io();
const name = makeRandomName();

// Buttons
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
const callButton = document.getElementById('callButton');
hangupButton.disabled = true;
callButton.disabled = true;

startButton.onclick = start;
hangupButton.onclick = hangup;
callButton.onclick = call;

const localAudio = document.getElementById('audio');

function start() {
    console.log('Requesting local stream');
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia(constraints)
        .then(handleSuccess)
        .catch(handleError);
}

function makePeerConnection() {
    try {
        localPeerConnection = new RTCPeerConnection(pcConfig);
        localPeerConnection.addEventListener('icecandidate', handleConnection);
        localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    } catch (e) {

    }
}

function handleConnection(event) {
    const peerConnection = event.target
}

function handleCandidate(candidate, dest, prefix, type) {
    if (candidate.candidate) {
        sendMessage
    }
    dest.addIceCandidate(candidate)
        .then(onAddIceCandidateSuccess)
        .catch(onAddIceCandidateError);
    console.log(`${prefix}New ${type} ICE candidate: ${candidate ? candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
    console.log('AddIceCandidate success.')
}

function onAddIceCandidateError(error) {
    console.log(`Failed to add ICE candidate: ${error.toString()}`);
}

function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;
    console.log('Starting calls');
    const audioTracks = window.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        console.log(`Using audio device: ${audioTracks[0].label}`)
    }
    _login();
}

function hangup() {
    _logout();
}

function _login() {
    socket.emit("login", {
        name: name,
    })
}

function _logout() {
    socket.emit("logout", {
        name: name,
    });
}

function handleSuccess(stream) {
    console.log('Adding local stream');
    localAudio.srcObject = stream;
    window.localStream = stream;
    callButton.disabled = false;
}

function handleError(error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name)
}

socket.on("login", function(data) {
    $("#users").append("<div id='" + data.name + "'><strong>" + data.name + "</strong>")
});

socket.on("logout", function (data) {
    $("#users").remove("#" + data.name);
});

function makeRandomName() {
    let name = "";
    let possible = "abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 5; i++) {
        name += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return name;
}

function emitMessage(message) {
    console.log('emitMessage: ', message);
    socket.emit("message", message);
}