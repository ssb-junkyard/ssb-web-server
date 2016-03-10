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

// Content-Security Policy header function, for the trusted application (7777)
var TrustedCSP = function (sbot, config) {
  return function (req, res, next) {
    var host = getCSPHost(req, config)
    var CSP = "default-src 'self'; "+
      "connect-src 'self' ws://"+host+":7777 wss://"+host+":7777; "+
      "img-src 'self' http://"+host+":7778 https://"+host+":7778 data:; "+ // include 7778 to show blob images
      "object-src 'none'; "+
      "frame-src 'none'; "+
      "style-src 'self' 'unsafe-inline'; "+
      "sandbox allow-modals allow-same-origin allow-scripts allow-top-navigation allow-popups"
    res.setHeader('Content-Security-Policy', CSP)
    next()
  }
}

// Content-Security Policy header function, for userland (7778)
var UserlandCSP = function (sbot, config) {
  return function (req, res, next) {
    var host = getCSPHost(req, config)
    var CSP = "default-src 'self'; "+
      "connect-src 'self' ws://"+host+":7778 wss://"+host+":7778; "+
      "img-src 'self' data:; "+
      "object-src 'none'; "+
      "frame-src 'none'; "+
      "script-src 'self' 'unsafe-inline'; "+
      "style-src 'self' 'unsafe-inline'; "+
      "sandbox allow-modals allow-same-origin allow-scripts allow-top-navigation allow-popups"
    res.setHeader('Content-Security-Policy', CSP)
    next()
  }
}

function getCSPHost (req, config) {
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
  return host
}

// string response helper
function respond (res, status, message) {
  res.writeHead(status)
  res.end(message)
}

// source-stream response helper
var frontMatter = new Buffer(
  '<!-- Begin Scuttlebot injected front-matter: -->\n'+
  '<script src="/ssb.js"></script>\n'+
  '<!-- End Scuttlebot front-matter -->\n'
, 'utf-8')
function respondSource (res, source) {
  var type, hasInjectedFrontmatter = false
  pull(
    source,
    ident(function (_type) {
      type = _type

      // write content type header
      if (type) res.writeHead(200, {'Content-Type': mime.lookup(type)})
    }),
    pull.map(function (chunk) {
      // inject the front-matter if this is html
      if (type == 'html' && !hasInjectedFrontmatter) {
        hasInjectedFrontmatter = true
        return Buffer.concat([frontMatter, chunk])
      }
      return chunk
    }),
    toPull.sink(res)
  )
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
var ServeFiles = exports.ServeFiles = function (sbot, config, opts) {
  return function (req, res, next) {
    var parsed = URL.parse(req.url, true)
    var pathname = parsed.pathname
    if (pathname.slice(-1) == '/')
      pathname += 'index.html'

    // dynamic routes
    if (pathname == '/ssb.js') {
      return respondSource(res, 
        cat([
          pull.once('window.SSB_MANIFEST='+JSON.stringify(opts.manifest)+';'),
          toPull.source(fs.createReadStream(path.join(__dirname, 'ws-client.build.js')))
        ])
      )
    }

    // static files
    var filepath = path.join(opts.servePath, pathname)
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

    if (!refs.isLink(hash))
      return next()

    sbot.blobs.want(hash, function(err, has) {
      if (!has) return respond(res, 404, 'File not found')

      // optional name override
      // TODO needed?
      // if (parsed.query.name)
        // res.setHeader('Content-Disposition', 'inline; filename='+encodeURIComponent(parsed.query.name))

      // serve
      respondSource(res, sbot.blobs.get(hash), false)
    })
  }
}

// trusted app server (7777)
exports.Trusted = function (sbot, config) {
  return Stack(
    Log(sbot),
    TrustedCSP(sbot, config),
    PasswordAccessControl(config),
    DeviceAccessControl(config),
    ServeFiles(sbot, config, {
      servePath: config.getTrustedServePath(),
      manifest: config.getTrustedManifest(sbot)
    })
  )
}

// userland app server (7778)
exports.Userland = function (sbot, config) {
  return Stack(
    Log(sbot),
    UserlandCSP(sbot, config),
    PasswordAccessControl(config),
    DeviceAccessControl(config),
    ServeBlobs(sbot, config),
    ServeFiles(sbot, config, {
      servePath: config.getUserlandServePath(),
      manifest: config.getUserlandManifest(sbot)
    })
  )
}