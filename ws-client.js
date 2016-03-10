(function () {
  var muxrpc     = require('muxrpc')
  var pull       = require('pull-stream')
  var ws         = require('pull-ws-server')
  var Serializer = require('pull-serializer')

  // create rpc object
  window.ssb = muxrpc(SSB_MANIFEST, false, serialize)()
  window.pull = pull

  // setup rpc stream over websockets
  var protocol = (window.location.protocol == 'https:') ? 'wss:' : 'ws:'
  var stream = ws.connect(protocol+'//'+(window.location.hostname)+':'+window.location.port)
  pull(stream, ssb.createStream(), stream)

  function serialize (stream) {
    return Serializer(stream, JSON, {split: '\n\n'})
  }
})()