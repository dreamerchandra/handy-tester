'use strict';
function getRandomPushKey() {
  const gFV = (val) => val.toString().length == 1 ? `${0}${val}` : `${val}`; // adds leading zeros for single values
  const date = new Date();
  //saveIndex Format: hhmmss(mes)(ms)#6digitnumber 
  let saveIndex = `${gFV(date.getHours())}${gFV(date.getMinutes())}${gFV(date.getSeconds())}${gFV(date.getMilliseconds())}#`;//hhmmssmes# mes can of 2 or 3 digit
  saveIndex += `${Math.floor(100000 + Math.random() * 900000)}`; //Will always create a number of 6 digits and it ensures the first digit will never be 0
  return saveIndex;
}

const app = require('express')();

const server = require('http').Server(app);
const io = require('socket.io')(server);

io.on('connection', socket => {
  const id = getRandomPushKey();
  console.log('client connected', id);
  socket.on('initiate', msg => {
    console.log('msg recievved', msg, id);
    io.emit('ack', {
      id: id,
    });
  });
});

if (module === require.main) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}