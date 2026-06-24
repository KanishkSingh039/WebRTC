const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "https://webrtc-1-79xt.onrender.com",
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");
    socket.on("offer", (offer) => {
    // console.log("Received offer:", offer);
    socket.broadcast.emit("offer-read", offer); // Broadcast the offer to all other connected clients
    // Here you can handle the received offer, e.g., create an answer and send it back to the client
  });
  socket.on("answer", (answer) => {
    // console.log("Received answer:", answer);
    socket.broadcast.emit("answer-read", answer); // Broadcast the answer to all other connected clients
  });
  socket.on("ice-candidate", (candidate) => {
    // console.log("Received ICE candidate:", candidate);
    socket.broadcast.emit("ice-candidate-read", candidate); // Broadcast the ICE candidate to all other connected clients
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
server.listen(3000, () => {
  console.log("listening on *:3000");
});