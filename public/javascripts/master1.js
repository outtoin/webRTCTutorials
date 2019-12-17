'use strict';

const DEFAULT_CHANNEL = 'some-global-channel-name';

const constraints = window.constraints = {
	audio: true,
	video: false,
};

const offerOptions = {
	offerToReceiveAudio: 1,
};

// Buttons
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
const callButton = document.getElementById('callButton');

// inputs
const nameInput = document.getElementById('nameInput');

hangupButton.disabled = true;
callButton.disabled = true;

startButton.onclick = start;
callButton.onclick = call;

let signalingSocket = null;
let localMediaStream = null;
let localConnection = null;

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
	let localMedia = $("<audio>");
	localMedia.attr("autoplay", "autoplay");
	localMedia.attr("muted", "true");
	localMedia.attr("controls", "");
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
	}
	signalingSocket.emit('login', {
		name: nameInput.value,
		type: 'master',
	});
	console.log('Requesting local stream');
	startButton.disabled = true;
	navigator.mediaDevices.getUserMedia(constraints)
		.then(handleSuccess)
		.catch(handleError);
}

function call() {
	callButton.disabled = true;
	hangupButton.disabled = false;
	console.log('Starting calls');
	const audioTracks = localMediaStream.getAudioTracks();
	if (audioTracks.length > 0) {
		console.log(`Using audio device: ${audioTracks[0].label}`);
	}
	localConnection = new RTCPeerConnection(
		{"iceServers": [
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

