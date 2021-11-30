# openpuddle.io

[openpuddle.io](https://opnepuddle.io) is a site that allows users to share links to NFT metadata from OpenSea with some modifications (specifically, users can override the latest owner of the token to be whatever they want). When a user claims an NFT, the token data is fetched from OpenSea's API, and stored (alongside the overridden owner's name) on disk.

When a user visits a token page, the client-side JS fetches the data stored above and assembles a view of it.

The site has two components:

- static content + client-side scripting for all read operations (vanilla JS) (under `html/`)
- a server-side component to download token data (a node script `app.js`)

## Deployment

OpenPuddle is designed to be deployed behind a reverse proxy. `GET` requests should be routed to the `html/` directory, while `POST` requests should be routed to the node app. A sample nginx config `openpuddle-nginx.conf` is included in the repo.

## Rate-Limiting / API Authentication

I skipped this step, but this site will probably eventually stop working if enough people use it. You'll probably want to sign up for a developer account with OpenSea and include your tokens in your API requests.