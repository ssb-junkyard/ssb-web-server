var muxrpc = require('muxrpc')
var pull = require('pull-stream')
var Serializer = require('pull-serializer')

module.exports = function (sbot, opts) {
  // fetch manifest and id
  var manifest = {}, id = null
  sbot.whoami(function (err, res) { id = res.id })
  sbot.manifest(function (err, m) { 
    manifest = m

    // HACK
    // if `sbot` is an rpc connection, then methods it views as 'sync' dont correctly relay
    // changing their manifest entries to 'async' solves this
    // -prf
    for (var k in manifest)
      if (manifest[k] === 'sync')
        manifest[k] = 'async'
  })

  return function (stream) {
    // create rpc object
    var rpc = muxrpc({}, manifest, serialize)(sbot)
    rpc.authorized = { id: id, role: 'master' }

    // start the stream
    pull(stream, rpc.createStream(), stream)
  }
}

function serialize (stream) {
  return Serializer(stream, JSON, {split: '\n\n'})
}