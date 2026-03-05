const socket = io();

let myID;
let pc;
let localStream;
let callerID;
let incomingOffer;
let incomingVideo=false;

async function login(){

const username=document.getElementById("username").value;

const res=await fetch("/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username})
});

const data=await res.json();

myID=data.email;

document.getElementById("login").style.display="none";
document.getElementById("home").style.display="block";
document.getElementById("user").innerText=myID;

socket.emit("join",myID);

}

/* FAVORITE */
function favorite(){

const target=document.getElementById("target").value;

fetch("/favorite",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
owner:myID,
target
})
});

alert("⭐ saved");

}

/* MEDIA */
async function setupMedia(video){

localStream=await navigator.mediaDevices.getUserMedia({
audio:true,
video:video
});

document.getElementById("localVideo").srcObject=localStream;

pc=new RTCPeerConnection({
iceServers:[{urls:"stun:stun.l.google.com:19302"}]
});

localStream.getTracks().forEach(track=>{
pc.addTrack(track,localStream);
});

pc.ontrack=e=>{
document.getElementById("remoteVideo").srcObject=e.streams[0];
};

pc.onicecandidate=e=>{
if(e.candidate){
socket.emit("ice-candidate",{
to:callerID,
candidate:e.candidate
});
}
};

}

/* CALL */
async function voiceCall(){
incomingVideo=false;
await setupMedia(false);
startCall();
}

async function videoCall(){
incomingVideo=true;
await setupMedia(true);
startCall();
}

async function startCall(){

const target=document.getElementById("target").value;
callerID=target;

const offer=await pc.createOffer();
await pc.setLocalDescription(offer);

socket.emit("call-user",{
to:target,
from:myID,
offer,
video:incomingVideo
});

}

/* INCOMING */
socket.on("incoming-call",data=>{

incomingOffer=data.offer;
callerID=data.from;
incomingVideo=data.video;

document.getElementById("incoming").style.display="block";
document.getElementById("caller").innerText="Call from "+data.from;

document.getElementById("ring").play();

});

/* ACCEPT */
async function accept(){

document.getElementById("incoming").style.display="none";
document.getElementById("ring").pause();

await setupMedia(incomingVideo);

await pc.setRemoteDescription(incomingOffer);

const answer=await pc.createAnswer();
await pc.setLocalDescription(answer);

socket.emit("answer-call",{
to:callerID,
answer
});

}

socket.on("call-accepted",async data=>{
await pc.setRemoteDescription(data.answer);
});

socket.on("ice-candidate",async data=>{
try{
await pc.addIceCandidate(data.candidate);
}catch(e){}
});
