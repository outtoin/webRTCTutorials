'use strict';

const DEFAULT_CHANNEL = 'some-global-channel-name';

const constraints = window.constraints = {
	audio: true,
	video: false,
};

let signalingSocket = null;
let localMediaStream = null;
let peers = {};
let peerMediaElements = {};

function init() {
	console.log("Connecting to signaling server");
	signalingSocket = io();

	signalingSocket.on('connect', function () {
		console.log("Connected to signaling server");
		setupLocalMedia(function () {
			joinChatChannel(DEFAULT_CHANNEL, {'whatever-you-want-here': 'stuff'})
		});
	});

	signalingSocket.on('disconnect', function () {
		console.log("Disconnected from signaling server");
		for (let peerId in peerMediaElements) {
			peerMediaElements[peerId].remove();
		}
		for (let peerId in peers) {
			peers[peerId].close();
		}
	});

	function joinChatChannel(channel, userdata) {
		signalingSocket.emit('join', {"channel": channel, "userdata": userdata});
	}

	signalingSocket.on('addPeer', function (config) {
		console.log('Signaling server said to add peer:', config);
		let peerId = config.peer_id;
		if (peerId in peers) {
			console.log("Already connected to peer ", peer_id);
			return;
		}
		let peerConnection = new RTCPeerConnection(
			{"iceServers": [
					{url: "stun:stun.l.google.com:19302"}
				]
			}
		);
		peers[peerId] = peerConnection;

		peerConnection.onicecandidate = function (event) {
			if (event.candidate) {
				signalingSocket.emit('relayICECandidate', {
					'peer_id': peerId,
					'ice_candidate': {
						'sdpMLineIndex': event.candidate.sdpMLineIndex,
						'candidate': event.candidate.candidate
					}
				});
			}
		}
	})
}

function setupLocalMedia(callback, errorback) {
	if (localMediaStream != null) {
		if (callback) callback();
		return;
	}
	console.log("Requesting access to local audio / video inputs");

	navigator.getUserMedia = (navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);

	navigator.getUserMedia(constraints,
		function (stream) {
			localMediaStream = stream;
			let localMedia = $("<audio>");
			localMedia.attr("autoplay", "autoplay");
			localMedia.attr("muted", "true");
			localMedia.attr("controls", "");
			$('#users').append(localMedia);
			localMedia[0].srcObject = stream;
			if (callback) callback();
		}, function () {
			console.log("Access denied for audio/video");
			alert("You chose not to provide access to the camera/microphone, demo will not work.");
			if (errorback) errorback();
		});
}