const PORT = 3000;
const HOST = '127.0.0.1';
var connectedCount = 0;

const express = require('express');
var wsapp = express();

const wsserver = wsapp.listen(PORT, HOST, () => {
    console.log(`WS App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
wsapp.enable('trust proxy');

let io = require('socket.io')(wsserver, {
    // maxHttpBufferSize: (parseInt(process.env.maxHttpBufferSize) || 5) * 1e6,
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    },
})
io.on('connection', client => {
    connectedCount++;
    client.on('disconnect', () => {
        connectedCount--;
    });
});
wsapp.use(require('express-status-monitor')({
    // socketPath: '/monitorsocket.io', // In case you use a custom path
    websocket: io,
}));

if (process.argv.length === 3) {
    process.argv.push(parseInt(process.argv[2]) + 1)
}
if (process.argv.length > 2 && process.argv[2] > 0) {
    let exit_after = 240000;
    // let exit_after = 15000;
    console.log(`\niteration ${process.argv[3] - process.argv[2]}`)
    console.log(`exiting in ${exit_after / 60000}min`)
    setTimeout(() => {
        process.exit();
    }, exit_after);
} else {
    console.log('\nwithout exit');
}
process.on("exit", function () {
    if (process.argv.length > 2 && process.argv[2] > 0) {
        process.argv[2]--;
        // setTimeout(() => {
        require("child_process")
            .spawn(
                process.argv.shift(),
                process.argv,
                {
                    cwd: process.cwd(),
                    detached: true,
                    stdio: "inherit"
                }
            );
        // }, 3000);
    }
});

module.exports = {wsserver};