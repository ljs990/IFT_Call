const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./db");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* LOGIN */
app.post("/login",(req,res)=>{
  const username = (req.body.username || "").toLowerCase();
  const email = username + "@ift.com";

  db.get("SELECT * FROM users WHERE email=?",[email],(err,row)=>{
    if(row) return res.json({email});

    db.run(
      "INSERT INTO users(username,email) VALUES(?,?)",
      [username,email],
      ()=>res.json({email})
    );
  });
});

/* FAVORITES */
app.post("/favorite",(req,res)=>{
  const {owner,target} = req.body;

  db.run(
    "INSERT INTO favorites(owner,target) VALUES(?,?)",
    [owner,target],
    ()=>res.json({ok:true})
  );
});

app.get("/favorites/:user",(req,res)=>{
  db.all(
    "SELECT target FROM favorites WHERE owner=?",
    [req.params.user],
    (err,rows)=>res.json(rows)
  );
});

/* SOCKET */
io.on("connection",(socket)=>{

  socket.on("join",(id)=>{
    socket.join(id);
    socket.data.id=id;

    db.run("UPDATE users SET online=1 WHERE email=?",[id]);
  });

  socket.on("call-user",(data)=>{
    io.to(data.to).emit("incoming-call",data);
  });

  socket.on("answer-call",(data)=>{
    io.to(data.to).emit("call-accepted",data);
  });

  socket.on("ice-candidate",(data)=>{
    io.to(data.to).emit("ice-candidate",data);
  });

  socket.on("disconnect",()=>{
    if(socket.data && socket.data.id){
      db.run(
        "UPDATE users SET online=0 WHERE email=?",
        [socket.data.id]
      );
    }
  });

});

server.listen(3000,()=>{
  console.log("IFT running → http://localhost:3000");
});
