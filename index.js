var http = require('http')
var https = require('https')
var ws = require('pull-ws-server')

module.exports = function (sbot, config) {
  // validate the config
  config = require('./config')(config)
  if (config.hasError()) {
    if (config.allowUnsafe())
      console.log('\nIgnoring unsafe configuration due to --unsafe flag.')
    else {
      console.log('\nAborted due to unsafe config. Run again with --unsafe to override.')
      return
    }
  }

  console.log('Starting...')

  // setup server
  var httpStack = require('./http-server')
  var httpTrustedServerFn = httpStack.Trusted(sbot, config)
  var httpUserlandServerFn = httpStack.Userland(sbot, config)
  var wsTrustedServerFn = require('./ws-server').Trusted(sbot, config)
  var wsUserlandServerFn = require('./ws-server').Userland(sbot, config)

  var appServer, blobServer
  if (config.useTLS()) {
    // HTTPS
    var tlsOpts = config.getTLS()
    appServer = ws.createServer(tlsOpts)
    blobServer = ws.createServer(tlsOpts)
    console.log('Serving at https://localhost:7777')
    console.log('Serving at https://localhost:7778')
  } else {
    // HTTP
    appServer = ws.createServer()
    blobServer = ws.createServer()
    console.log('Serving at http://localhost:7777')
    console.log('Serving at http://localhost:7778')
  }
  appServer.on('connection', wsTrustedServerFn)
  appServer.on('request', httpTrustedServerFn)
  appServer.on('error', fatalError)
  appServer.listen(7777)
  blobServer.on('connection', wsUserlandServerFn)
  blobServer.on('request', httpUserlandServerFn)
  blobServer.on('error', fatalError)
  blobServer.listen(7778)
}

// server-setup error handler
function fatalError (e) {
  if (e.code === 'EADDRINUSE')
    console.error('\nError: port '+e.port+' isn\'t available. Is the application already running?\n')
  else
    console.error(e.stack || e.toString())
  process.exit(1)
}
