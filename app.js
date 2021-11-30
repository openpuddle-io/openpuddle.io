const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ID_CHARS = "abcdefghijklmnopqrstuvwxyz01234567890";
const URL_REGEX = /https:\/\/opensea.io\/assets\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)\/?$/i;

const randomId = () => {
    let id = "";
    for (let i = 0; i < 10; i++) {
        id += ID_CHARS[Math.floor(Math.random() * (ID_CHARS.length - 1))];
    }
    return id;
};

const readBody = (req) => {
    const chunks = [];
    return new Promise((resolve, reject) => {
        req.on("data", (chunk) => {
            chunks.push(Buffer.from(chunk));
        });
        req.on("error", reject);
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    })
}

const makeRequest = (location) => {
    const options = {
        hostname: "api.opensea.io",
        port: 443,
        path: "/api/v1" + location,
        headers: {
            "Content-Type": "application/json"
        }
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            if (res.statusCode !== 200) {
                reject({err: "non-200 from internal API", code: res.statusCode, location});
            } else {
                readBody(res).then((json) => {
                    resolve(JSON.parse(json));
                });
            }
        });

        req.on("error", (err) => {
            reject("internal API error: " + err);
        });
        req.end();
    });
}

const getAsset = (address, token) => {
    return makeRequest(`/asset/${address}/${token}`)
}

const getEvents = (address, token) => {
    return makeRequest(`/events?asset_contract_address=${address}&token_id=${token}&event_type=successful`)
}

const listener = async (req, res) => {
    if (!req.url === "/create") {
        res.writeHead(404);
        res.end();
        return;
    }
    if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
    }

    if (req.headers["content-type"] !== "application/json") {
        res.writeHead(400);
        res.end();
        return;
    }

    try {
        const json = await readBody(req);
        const payload = JSON.parse(json);
        if (!(payload["url"] && payload["name"] && payload["address"])) {
            res.writeHead(400);
            res.end("missing data in payload: " + JSON.stringify(payload))
            return;
        }

        // extract request data
        const matches = URL_REGEX.exec(payload["url"].substring(0, 10000));
        if (!matches) {
            res.writeHead(400);
            res.end("URL must match " + URL_REGEX);
        }

        const assetAddress = matches[1];
        const tokenId = matches[2];

        const customData = {
            name: payload["name"].substring(0, 10000),
            site: (payload["site"] || "").substring(0, 10000),
            address: payload["address"].substring(0, 10000),
        }

        // fetch data from opensea (token sales are behind a separate endpoint)
        const asset = await getAsset(assetAddress, tokenId);
        const events = await getEvents(assetAddress, tokenId);

        // this is what we store on disk. store complete API data so that the site
        // can be extended/fixed in the future without affecting item data
        const ourAsset = {...asset, events, customData};
        const ourAssetId = randomId();

        // save our asset to the /html/item folder and return the ID back to the client
        const out = fs.createWriteStream(path.join("html", "item", ourAssetId));
        out.on("error", (err) => {
            console.error(err);
            res.writeHead(500);
            res.end();
        });
        out.write(JSON.stringify(ourAsset), (err) => {
            if (err) {
                console.error(err);
                res.writeHead(500);
                res.end();
            } else {
                res.writeHead(200);
                res.end(`{"id": "${ourAssetId}"}`)
            }
        })
    } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end();
    }
}

// port # needs to match the one in your reverse proxy config
http.createServer(listener).listen(8999);