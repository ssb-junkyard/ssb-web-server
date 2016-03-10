var muxrpc = require('muxrpc')
var pull = require('pull-stream')
var Serializer = require('pull-serializer')

// platform-specific opener
var open
if (process.versions['electron']) {
  var BrowserWindow = require('electron').BrowserWindow
  open = function (url) {
    var win = new BrowserWindow({
      width: 750,
      height: 480,
      webPreferences: {
        nodeIntegration: false,
        javascript: true,
        webSecurity: true,
        images: true,
        java: false,
        webgl: false, 
        webaudio: false,
        plugins: false,
        experimentalFeatures: false,
        experimentalCanvasFeatures: false,
        sharedWorker: false
      }
    })
    win.loadURL(url)
  }
} else {
  open = require('open')
}

module.exports.Trusted = function (sbot, config) {
  var manifest = config.getTrustedManifest(sbot)
  var perms = config.getTrustedPerms()

  return function (stream) {
    // create rpc stream
    var rpc = muxrpc({}, manifest, serialize)(sbot, perms)
    pull(stream, rpc.createStream(), stream)
  }
}

module.exports.Userland = function (sbot, config) {
  var manifest = config.getUserlandManifest(sbot)
  var perms = config.getUserlandPerms()

  // special api behaviors
  var api = Object.assign({}, sbot, {
    publish: function (msg, cb) {
      open('http://localhost:7777/prompt-pages/publish.html#'+encodeURIComponent(JSON.stringify(msg)))
      cb()
    }
  })

  return function (stream) {
    // create rpc stream
    var rpc = muxrpc({}, manifest, serialize)(api, perms)
    pull(stream, rpc.createStream(), stream)
  }
}

function serialize (stream) {
  return Serializer(stream, JSON, {split: '\n\n'})
}