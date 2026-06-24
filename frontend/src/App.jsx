import {io} from 'socket.io-client'
import { useState, useRef,useEffect } from 'react';
function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pc = useRef(null);
  const socket = useRef(null);
  const pendingCandidates = useRef([]);
  const[receivedOffer,setReceivedOffer]=useState(null);
  const[receivingCall,setReceivingCall]=useState(false);
  useEffect(() => {
    // console.log("Setting up peer connection and socket");
    pc.current = new RTCPeerConnection({
        iceServers:[
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],}
    );
        pc.current.onconnectionstatechange = () => {
          console.log("Connection:", pc.current.connectionState);
        };

        pc.current.oniceconnectionstatechange = () => {
          console.log("ICE:", pc.current.iceConnectionState);
        };

        pc.current.ontrack = (event) => {
          console.log("Received remote track:", event.streams[0]);
        };
    socket.current = io("https://webrtc-56e6.onrender.com");
    socket.current.on("connect",()=>{
      console.log("Connected to signaling server");
    });
    socket.current.on("offer-read",async (offer)=>{
      setReceivedOffer(offer);
      setReceivingCall(true);
      for (const candidate of pendingCandidates.current) {
  await pc.current.addIceCandidate(
    new RTCIceCandidate(candidate)
  );
}
      pendingCandidates.current=[];
    });
    socket.current.on("answer-read",async (answer)=>{
        await pc.current.setRemoteDescription(new RTCSessionDescription(answer))
      });
    socket.current.on("ice-candidate-read",async (candidate)=>{
      try{
        if(!pc.current.remoteDescription){
          pendingCandidates.current.push(candidate);
        }
        else
        {
          await pc.current.addIceCandidate(
            new RTCIceCandidate(candidate));

        }
      }catch(e){
        console.error("Error adding received ice candidate",e);
      }
    });
    pc.current.ontrack=(event)=>{
        // console.log("track recieved");
        
        // console.log(event);
        // console.log("Received remote track :", event.streams[0]);
        remoteVideoRef.current.srcObject=event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    return () => {
      socket.current.off("connect");
      socket.current.off("offer-read");
      socket.current.off("answer-read");
      socket.current.off("ice-candidate-read");
      if (pc.current) {
        pc.current.close();
      }
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  },[]);
  async function handleOffer(offer){
    // console.log("Handling answering");
    const stream=await navigator.mediaDevices.getUserMedia(
      {
        video:true,
        audio:true,
      }
    )
    setLocalStream(stream);
    localVideoRef.current.srcObject=stream;
    stream.getTracks().forEach((track)=>{
      pc.current.addTrack(track,stream);
    })
    await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
    for (const candidate of pendingCandidates.current) {
      await pc.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    }
    pendingCandidates.current = [];
    const answer=await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);
    socket.current.emit("answer",answer);
    pc.current.onicecandidate=(event)=>{
      if(event.candidate)
      {
        socket.current.emit("ice-candidate",event.candidate);
      }
    }
    // pc.current.ontrack=(event)=>{
    //     console.log("track recieved");

    //   console.log(event);
      
    //   console.log("Received remote track at receiverside:", event.streams[0]);
    //   remoteVideoRef.current.srcObject=event.streams[0];
    //   setRemoteStream(event.streams[0]);
    // }
  }
  async function Call()
  {
    // console.log("Calling");
    const stream=await navigator.mediaDevices.getUserMedia(
      {
        video:true,
        audio:true,
      }
    )
    localVideoRef.current.srcObject=stream;
    stream.getTracks().forEach((track)=>{
      pc.current.addTrack(track,stream);
    })
    const offer=await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    pc.current.onicecandidate=(event)=>{
      if(event.candidate)
        {
          socket.current.emit("ice-candidate",event.candidate);
        }
      }
      // pc.current.ontrack=(event)=>{
      //   console.log("track recieved");
        
      //   console.log(event);
      //   console.log("Received remote track at callerside:", event.streams[0]);
      //   remoteVideoRef.current.srcObject=event.streams[0];
      //   setRemoteStream(event.streams[0]);
      // }
      socket.current.emit("offer",offer);
      setLocalStream(stream);
    }
  return ( 
    <div>
      <button onClick={()=>Call()}>Call</button>
      {receivingCall && (
        <div>
          <button onClick={()=>handleOffer(receivedOffer)}>Answer</button>
        </div>
      )}
      <video ref={localVideoRef} autoPlay playsInline></video>
      <video ref={remoteVideoRef} autoPlay playsInline></video>
    </div>
   );
}

export default App;