'use strict';

const DEFAULT_CHANNEL = 'some-global-channel-name';

const constraints = window.constraints = {
	audio: false,
	video: true,
};

const offerOptions = {
	offerToReceiveVideo: 1,
};

// Buttons
const startButton = document.getElementById('startButton');
const joinButton = document.getElementById('joinButton');
const hangupButton = document.getElementById('hangupButton');
const callButton = document.getElementById('callButton');

// inputs
const nameInput = document.getElementById('nameInput');

hangupButton.disabled = true;
callButton.disabled = true;

startButton.onclick = start;
joinButton.onclick = joinChannel;

let signalingSocket = null;
let localMediaStream = null;
let localConnection = null;
// let masterConnection = null;
let masterMediaElements = null;

let peers = {};

signalingSocket = io();

signalingSocket.on('sdpAnswer', function (data) {
	if (data.type !== 'master') {
		console.log('Slave SDP message...ignore: ', data);
		return;
	}
	if (localConnection != null) {
		localConnection.setRemoteDescription(data.desc);
	}
});

function handleSuccess(stream) {
	let localMedia = $("<video playsinline>");
	localMedia.attr("autoplay", "autoplay");
	localMedia.attr("muted", "true");
	$('#users').append(localMedia);
	localMedia[0].srcObject = stream;
	localMediaStream = stream;
	callButton.disabled = false;
}

function handleError(error) {
	console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name)
}

function start() {
	if (nameInput.value === "") {
		alert('No name!');
		return
	}
	signalingSocket.emit('login', {
		name: nameInput.value,
		type: 'client',
	});
	console.log('Requesting local stream');
	startButton.disabled = true;
	navigator.mediaDevices.getUserMedia(constraints)
		.then(handleSuccess)
		.catch(handleError);
}

function joinChannel() {
	signalingSocket.emit('join');
}

signalingSocket.on('addPeer', function (data) {
	console.log('addPeer: ', data);
	let name = data.name;
	let peerConnection = new RTCPeerConnection({
		"iceServers": [
			{url: "stun:stun.l.google.com:19302"}
		]
	});
	peers[name] = peerConnection;
	console.log(peers);
	peerConnection.onicecandidate = function (ev) {
		if (ev.candidate) {
			signalingSocket.emit('relayICECandidate', {
				'name': name,
				'ice_candidate': {
					'sdpMLineIndex': ev.candidate.sdpMLineIndex,
					'candidate': ev.candidate.candidate
				}
			});
		}
	};

	peerConnection.onaddstream = function (ev) {
		let remoteMedia = $("<video playsinline>");
		remoteMedia.attr("autoplay", "autoplay");
		remoteMedia.attr("muted", "true");
		$('#users').append(remoteMedia);
		remoteMedia[0].srcObject = ev.stream;
	};

	localMediaStream.getTracks().forEach(track => peerConnection.addTrack(track, localMediaStream));

	if (data.need_offer) {
		console.log("Creating RTC offer to ", name);
		peerConnection.createOffer(offerOptions)
			.then(function (desc) {
				console.log('Local offer description is: ', desc);
				peerConnection.setLocalDescription(desc).then(function () {
					signalingSocket.emit('relaySessionDescription', {
						'name': name,
						'session_description': desc,
					});
					console.log('Offer SetLocalDescription succeeded');
				}, function () {
					alert("Offer setLocalDescription failed!");
				});
			}, function (err) {
				console.log('Error sending offer: ', err);
			})
	}
});

signalingSocket.on('sessionDescription', function (data) {
	console.log('Remote description received: ', data);
	let name = data.name;
	let peer = peers[name];
	let remoteDescription = data.session_description;
	console.log(data.session_description);

	let desc = new RTCSessionDescription(remoteDescription);
	let stuff = peer.setRemoteDescription(desc)
		.then(function () {
			console.log('setRemoteDescription succeeded');
			if (remoteDescription.type === "offer") {
				peer.createAnswer(offerOptions)
					.then(function (local_desc) {
							console.log('Answer: ', local_desc);
							peer.setLocalDescription(local_desc)
								.then(function () {
									signalingSocket.emit('relaySessionDescription',
										{'name': name, 'session_description': local_desc});
									console.log("Answer setLocalDescription succeeded");
								}, function () {
									alert("Answer setLocalDescription failed!");
								});
						}, function (err) {
							console.log("Error creating answer: ", err);
							console.log(peer);
						}
					)
			}
		}, function (err) {
			console.log("setRemoteDescription error: ", err);
		})
});

signalingSocket.on('iceCandidate', function (data) {
	let peer = peers[data.name];
	let iceCandidate = data.ice_candidate;
	peer.addIceCandidate(new RTCIceCandidate(iceCandidate))
		.then(function ()  {
			console.log('addIceCandidate succeeded')
		}, function (err) {
			console.log('addIceCandidate error: ', err);
		});
});

function call() {
	callButton.disabled = true;
	hangupButton.disabled = false;
	console.log('Starting calls');
	const audioTracks = localMediaStream.getVie();
	if (audioTracks.length > 0) {
		console.log(`Using audio device: ${audioTracks[0].label}`);
	}
	localConnection = new RTCPeerConnection(
		{
			"iceServers": [
				{url: "stun:stun.l.google.com:19302"}
			]
		}
	);
	localConnection.onicecandidate = iceCallbackLocal;
	localConnection.onaddstream = addStreamCallback;
	localConnection.addTrack(localMediaStream.getAudioTracks(), localMediaStream);
	localConnection.createOffer(offerOptions)
		.then(gotDescriptionLocal, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
	console.log(`Failed to create session description: ${error.toString()}`);
}

function gotDescriptionLocal(desc) {
	localConnection.setLocalDescription(desc);
	signalingSocket.emit('sdpOffer', {
		desc: desc
	});
}

function iceCallbackLocal() {

}

function addStreamCallback(e) {
	masterMediaElements = $("<audio>");
	masterMediaElements.attr("autoplay", "autoplay");
	masterMediaElements.attr("controls", "");
	$('#users').append(masterMediaElements);
	attachMediaStream(masterMediaElements[0], e.stream);
}

function attachMediaStream(element, stream) {
	if (element.srcObject !== stream) {
		element.srcObject = stream;
		console.log('Received remote stream');
	}
}

