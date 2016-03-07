var pull   = require('pull-stream')
var toPull = require('stream-to-pull-stream')
var cat    = require('pull-cat')
var ident  = require('pull-identify-filetype')
var mime   = require('mime-types')
var URL    = require('url')
var path   = require('path')
var fs     = require('fs')
var refs   = require('ssb-ref')
var Stack  = require('stack')
var ip     = require('ip')

// Content-Security Policy header function
var CSP = function (req, config) {
  // hostname for the websocket connection:
  // if it's a remote request, always use the configured hostname
  // if it's local, choose from localhost or the configured hostname, based on which the client is using (as revealed by the host header)
  var host
  if (!ip.isLoopback(req.socket.remoteAddress))
    host = config.getHostname()
  else {
    var requestHostname = req.headers.host.split(':')[0] // extract hostname (remove ':port')
    host = (requestHostname == 'localhost' || requestHostname == config.getHostname())
      ? requestHostname
      : (config.getHostname() || 'localhost')

    // final glorious hack: if they're using 127.0.0.1, we should too
    if (requestHostname == '127.0.0.1' && host == 'localhost')
      host = '127.0.0.1'
  }

  return "default-src 'self'; "+
    "connect-src 'self' ws://"+host+":7778 wss://"+host+":7778; "+
    "img-src 'self' data:; "+
    "object-src 'none'; "+
    "frame-src 'none'; "+
    "style-src 'self' 'unsafe-inline'; "+
    "sandbox allow-modals allow-scripts allow-top-navigation allow-popups"
}

// string response helper
function respond (res, status, message) {
  res.writeHead(status)
  res.end(message)
}

// source-stream response helper
function respondSource (res, source, wrap) {
  if(wrap) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    pull(
      cat([
        pull.once('<html><body><script>'),
        source,
        pull.once('</script></body></html>')
      ]),
      toPull.sink(res)
    )
  }
  else {
    pull(
      source,
      ident(function (type) {
        if (type) res.writeHead(200, {'Content-Type': mime.lookup(type)})
      }),
      toPull.sink(res)
    )
  }
}

// logging tool
var Log = exports.Log = function (sbot) {
  return function (req, res, next) {
    // :TODO: emit() wont be available if not a plugin
    sbot.emit('log:info', ['HTTP', null, req.method + ' ' + req.url])
    next()
  }
}

// non-localhost client guard function
var DeviceAccessControl = exports.DeviceAccessControl = function (config) {
  return function (req, res, next) {
    if (config.allowRemoteAccess())
      return next() // remote & local access allowed
    if (ip.isLoopback(req.socket.remoteAddress))
      return next() // local access allowed
    respond(res, 403, 'Remote access forbidden') // remote access disallowed
  }
}

// basic-auth guard function
var PasswordAccessControl = exports.PasswordAccessControl = function (config) {
  return function (req, res, next) {
    if (!config.requiresPassword(config))
      return next() // no password required

    // check the password
    var authMatch = /^Basic (.*)$/i.exec(req.headers.authorization)
    if (authMatch) {
      var password = (new Buffer(authMatch[1], 'base64').toString()).split(':')[1]
      if (password && config.checkPassword(password))
        return next() // password checks out
    }

    // deny
    res.setHeader('WWW-Authenticate', 'Basic realm=Authorization Required')
    respond(res, 401, 'Unauthorized')
  }
}

// serve static files
var ServeApp = exports.ServeApp = function (sbot, config) {
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    var pathname = parsed.pathname
    if (pathname == '/')
      pathname = '/index.html'

    // security settings
    res.setHeader('Content-Security-Policy', CSP(req, config))

    // dynamic route: manifest.js
    if (pathname == '/manifest.js') {
      return respondSource(res, pull.once('window.MANIFEST='+JSON.stringify(sbot.manifest())+';'))
    } 

    // static files
    var filepath = path.join(config.getServePath(), pathname)
    fs.stat(filepath, function (err, stat) {
      if(err) return next()
      if(!stat.isFile()) return respond(res, 403, 'May only load files')
      respondSource(res, toPull.source(fs.createReadStream(filepath)))
    })
  }
}

// serve from the blob-store
var ServeBlobs = exports.ServeBlobs = function (sbot, config) {
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    var hash = decodeURIComponent(parsed.pathname.slice(1))
    sbot.blobs.want(hash, function(err, has) {
      if (!has) return respond(res, 404, 'File not found')

      // optional name override
      // TODO needed?
      // if (parsed.query.name)
        // res.setHeader('Content-Disposition', 'inline; filename='+encodeURIComponent(parsed.query.name))

      // serve
      res.setHeader('Content-Security-Policy', CSP(req, config))
      respondSource(res, sbot.blobs.get(hash), false)
    })
  }
}

// full stack
exports.AppStack = function (sbot, config) {
  return Stack(
    Log(sbot),
    PasswordAccessControl(config),
    DeviceAccessControl(config),
    ServeApp(sbot, config),
    ServeBlobs(sbot, config)
  )
}
