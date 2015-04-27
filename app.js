
var sockio = require("socket.io")
var express = require("express");
var r = require("rethinkdb");

var app = express();
var io = sockio.listen(app.listen(8090), {log: false});
console.log("App listening on port 8090");

app.use(express.static(__dirname + "/public"));

r.connect().then(function(c) {
  return r.table("todo").changes().run(c);
})
.then(function(cursor) {
  cursor.each(function(err, item) {
    io.sockets.emit("update", item);
  });
});

function performQuery(query, cb) {
  r.connect().then(function(conn) {
    return query.run(conn)
      .finally(function() { conn.close(); });
  })
  .then(function(output) { cb({success: true}); })
  .error(function(err) { cb({success: false, err: err}); });
}

io.on("connection", function(socket) {
  r.connect().then(function(conn) {
    return r.table("todo").run(conn)
      .finally(function() { conn.close(); });
  })
  .then(function(cursor) { return cursor.toArray(); })
  .then(function(output) { socket.emit("history", output); });

  socket.on("add", function(text, cb) {
    performQuery(r.table("todo").insert({ text: text, done: false }), cb);
  })
  .on("done", function(id, done, cb) {
    performQuery(r.table("todo").get(id).update({done: done}), cb);
  });
});
