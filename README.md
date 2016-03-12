# SSB Web Server

A [Scuttlebot](https://github.com/ssbc/scuttlebot) plugin for serving sites that were shared using SSB.

Publish an [html bundle](https://github.com/substack/html-inline) on SSB, then open it by its hash id (eg `http://localhost:7778/%26MM0QBNfQqd8ttqrCLNv%2FkuMrwlALvU97r%2BFIBrcG85o%3D.sha256`).

No more 404s.

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

This creates two servers, at `:7777` and `:7778`. The `:7777` serves the "trusted" application (Patchwork) while `:7778` serves "userland," which is files in the blob store and at `~/.ssb/www`.

To open a blob, go to `localhost:7778/{hash-id}`. If you want to publish an HTML page to the blob-store, use [html-inline](https://www.npmjs.com/package/html-inline) to pack any linked assets into a single HTML blob, then publish with `sbot blobs.add`.

## SSB API

Pages have `window.ssb` injected by the server, so they can read and write to the network.

Userland pages are given a subset of read functions, and a modified `publish` function which opens a permission prompt.
