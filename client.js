const io = require('socket.io-client');
const CLIENT_COUNT = 1000;
const PORT = 3000;

for (let i = 0; i < CLIENT_COUNT; i++) {
    newSocketClient(i);
}
let connected = new Set();
let reconnecting = new Set();

function newSocketClient(idx) {
    let socket = io('http://127.0.0.1:' + PORT, {forceNew: true});

    socket.on('connect', function () {
        connected.add(idx);
        reconnecting.delete(idx);
        // console.log('connected', idx);
        socket.on('disconnect', () => {
            reconnecting.add(idx);
            connected.delete(idx);
            // console.log("reconnecting");
            newSocketClient(idx);
        });
    });
    socket.on('connect_error', function () {
        reconnecting.add(idx);
        connected.delete(idx);
        // console.log("unreachable");
        socket.destroy();
        newSocketClient(idx)
    });
}

setInterval(() => console.log(`connected: ${connected.size}; reconnecting: ${reconnecting.size}`), 2000);