const cluster = require('cluster');
const {Server} = require("socket.io");
const {setupMaster, setupWorker} = require("@socket.io/sticky");
const {createAdapter, setupPrimary} = require("@socket.io/cluster-adapter");

const PORT = 3000;
const HOST = '127.0.0.1';
var connectedCount = 0;
if (cluster.isPrimary) {
    const numWorkers = 4 || require('os').cpus().length;
    const http = require("http");
    console.log('Master cluster setting up ' + numWorkers + ' workers...');
    const httpServer = http.createServer();
    // setup sticky sessions
    setupMaster(httpServer, {
        loadBalancingMethod: "round-robin",
    });
    // setup connections between the workers
    setupPrimary();
    // Node.js > 16.0.0
    cluster.setupPrimary({
        serialization: "advanced",
    });
    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', function (worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function (worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
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
        transports: ["websocket"]
    })
    io.on('connection', client => {
        connectedCount++;
        client.on('disconnect', () => {
            connectedCount--;
        });
    });
    // use the cluster adapter
    io.adapter(createAdapter());

    // setup connection with the primary process
    setupWorker(io);
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
}