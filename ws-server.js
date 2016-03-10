var muxrpc = require('muxrpc')
var pull = require('pull-stream')
var Serializer = require('pull-serializer')

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

  return function (stream) {
    // create rpc stream
    var rpc = muxrpc({}, manifest, serialize)(sbot, perms)
    pull(stream, rpc.createStream(), stream)
  }
}

function serialize (stream) {
  return Serializer(stream, JSON, {split: '\n\n'})
}