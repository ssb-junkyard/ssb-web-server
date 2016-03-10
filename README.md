# SSB Web Server

A [Scuttlebot](https://github.com/ssbc/scuttlebot) plugin for serving sites that were shared using SSB.

## Setup

Use as a scuttlebot plugin:

```js
.use(require('ssb-web-server'))
```

In the config object passed to Scuttlebot, you'll need to set the following values:

```js
config.trustedServePath = path.join(__dirname, 'ui')
config.userlandServePath = path.join(config.path, 'www')
```

## Usage

This creates two servers, at `:7777` and `:7778`. The `:7777` serves the "trusted" application (for instance, Patchwork) while `:7778` serves "userland," which is files in the blob store, as well as files in the `userlandServePath`. (In Patchwork, the userland servepath is `~/.ssb/www`.)

`:7777` is given full RPC access to Scuttlebot. `:7778` is given a subset of read functions, and a modified `publish` function which opens a permission prompt.

To open a blob, go to `localhost:7778/{hash-id}`. If you want to publish an HTML page to the blob-store, use [html-inline](https://www.npmjs.com/package/html-inline) to pack any linked assets into a single HTML blob, then publish with `sbot blobs.add`.