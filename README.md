# SSB Web Server

A [Scuttlebot](https://github.com/ssbc/scuttlebot) app (or plugin) for serving sites that were shared using SSB.
Still in development.

## Setup

Setup as an application:

```
git clone https://github.com/ssbc/ssb-web-server
cd ssb-web-server
npm install
node index.js
```

Or use as a scuttlebot plugin:

```js
.use(require('ssb-web-server'))
```

## Usage

This creates a server at `localhost:8000`. It will serve any blobs, by hash-id, at `localhost:8000/{hash-id}`. (Example: `http://localhost:8000/&MagGWkFGCb7PxQOVAD4+UULNDtW+x3BIIgSGfxAomHs=.sha256`). If the blob is not locally-present, the server will search the SSB network (using the `want` protocol) and respond when the blob is found.

The server also hosts static files at `./www/*`.

## TODO

Hash-ids are going to change during dev, so we need a way to make it easy to develop some site/app, then publish, without introducing bugs.