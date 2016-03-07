
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
  var http = require('http')
  var https = require('https')
  // var ws = require('pull-ws-server')
  var httpStack = require('./http-server')
  var httpServerFn = httpStack.AppStack(sbot, config)
  // var wsServerFn = require('./ws-server')(sbot)

  if (config.useTLS()) {
    var tlsOpts = config.getTLS()
    https.createServer(tlsOpts, httpServerFn).listen(8000).on('error', fatalError)
    // ws.createServer(tlsOpts, wsServerFn).listen(7778).on('error', fatalError)
    console.log('Serving at https://localhost:8000')
  } else {
    http.createServer(httpServerFn).listen(8000).on('error', fatalError)
    // ws.createServer(wsServerFn).listen(7778).on('error', fatalError)
    console.log('Serving at http://localhost:8000')
  }
}

function fatalError (e) {
  if (e.code === 'EADDRINUSE')
    console.error('\nError: port '+e.port+' isn\'t available. Is ssb-web-server already running?\n')
  else
    console.error(e.stack || e.toString())
  process.exit(1)
}

// independent process?
if (!module.parent) {
  // TODO load config

  // connect to scuttlebot via rpc
  require('ssb-client')(function (err, sbot) {
    if (err) throw err
    // run
    module.exports(sbot, {})

    // HACK - keep the connection alive
    setInterval(sbot.whoami, 10e3)
  })
}
