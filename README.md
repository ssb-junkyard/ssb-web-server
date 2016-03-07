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

This creates a server at `localhost:8000`. It will serve any blobs, by hash-id, at `localhost:8000/{hash-id}`. (Example: `http://localhost:8000/&xwYBP2fBpyobN19U5RO+f9BwxwX/BWOAxXJ2Q8S9W+0=.sha256`). If the blob is not locally-present, the server will search the SSB network (using the `want` protocol) and respond when the blob is found.

The server also hosts static files at `./www/*`.

## TODO

- Hash-ids are going to change during dev, so we need a way to make it easy to develop some site/app, then publish, without introducing bugs.
- Sites/apps are going to be more interesting if they can access some of Sbot's APIs. We can expose an RPC connection via a Websocket, but we'll need to create a scheme for controlling permissions, safely.
- Related, we need to ensure that each page is properly sandboxed from the others, and cant leak info or creds. This should be doable per-page.

## Example page

Add this index.html to your `www`

```html
<html>
<body>
  <h1>Hello, world</h1>
  <img src="&xwYBP2fBpyobN19U5RO+f9BwxwX/BWOAxXJ2Q8S9W+0=.sha256">
</body>
</html>
```