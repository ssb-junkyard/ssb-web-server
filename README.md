# SSB Web Server

A [Scuttlebot](https://github.com/ssbc/scuttlebot) plugin for serving sites that were shared using SSB.

Publish an [html bundle](https://github.com/substack/html-inline) on SSB, then open it by its hash id.

No more 404s.

## Usage

To open a blob, go to `localhost:7778/{hash-id}`.

If you want to develop an HTML page, place it (and its assets) in `~/ssb/web`. You can then open it at `localhost:7778/path/to/file`, which will map to `~/ssb/web/path/to/file`.

If you want to publish an HTML page to the network, use [html-inline](https://www.npmjs.com/package/html-inline) to pack any linked assets into a single HTML blob, then commit with `sbot blobs.add`. Afterwards, you can reference the hash in an SSB message to distribute it across the network.

## SSB API

Pages have `window.ssb` injected by the server, so they can read and write to the network.

Userland pages are given a subset of read functions, and a modified `publish` function which opens a permission prompt.

## Setup

Use as a scuttlebot plugin:

```js
.use(require('ssb-web-server'))
```

(When this plugin's development is complete, it will be automatically included in Scuttlebot.)

In the config object passed to Scuttlebot, you'll need to set the following values:

```js
config.trustedServePath = path.join(__dirname, 'ui')
config.userlandServePath = path.join(config.path, 'www')
```

## Details

This creates two servers, at `:7777` and `:7778`. The `:7777` serves the "trusted" application (Patchwork) while `:7778` serves "userland," which is files in the blob store and at `~/.ssb/www`.
