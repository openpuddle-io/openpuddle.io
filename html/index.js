import mustache from "./mustache.js";

async function getData(id) {
    // doing a shitton of postprocessing here to keep the server-side code simple
    const req = await fetch(`/item/${id}`);
    const data = await req.json();

    data.description ||= data.asset_contract.description;
    if (data.description) {
        data.descriptionLines = data.description.split("\n");
    }

    data.events.asset_events.forEach((evt) => {
        evt.created_date = evt.created_date.slice(0, evt.created_date.indexOf("."));
        if (evt.payment_token.eth_price) {
            evt.payment_token.eth_price = parseFloat(evt.payment_token.eth_price);
        }
        if (evt.payment_token.usd_price) {
            evt.payment_token.usd_price = parseFloat(evt.payment_token.usd_price);
        }

        if (evt.payment_token.usd_price && evt.payment_token.eth_price && evt.total_price) {
            // slicing string because I can't be bothered to use a bigint or whatever and we
            // lose precision if we keep it as-is
            const totalEth = parseFloat(evt.total_price.slice(0, evt.total_price.length - 9)) / 1000000000 || 0;
            const totalUsd = evt.payment_token.usd_price * totalEth;
            evt.totalEth = totalEth.toFixed(4);
            evt.totalUsd = totalUsd.toFixed(2);
        }

        if (!evt.seller) {
            return;
        }
        if (!evt.seller.user) {
            evt.seller.user = {};
        }
        if (!evt.seller.user.username) {
            evt.seller.user.username = evt.seller.address.slice(2, 10) + "…"
        }

        if (!evt.winner_account) {
            return;
        }
        if (!evt.winner_account.user) {
            evt.winner_account.user = {};
        }
        if (!evt.winner_account.user.username) {
            evt.winner_account.user.username = evt.winner_account.address.slice(2, 10) + "…";
        }
    });


    // if the item hasn't been sold yet, generate a random sale instead
    if (data.events.asset_events.length == 0) {
        const totalEth = (Math.random() * 3).toFixed(4);
        // i guess i could fetch the actual eth exchange rate here but i really don't care
        const totalUsd = (totalEth * 3589.35).toFixed(2);
        data.events.asset_events.push({
            created_date: new Date().toISOString(),
            totalEth,
            totalUsd,
            seller: {
                address: "",
                user: {
                    username: "NullAddress"
                }
            }
        });
    }

    // we overwrite winner_account so that if the item hasn't been sold we need
    // to create a winner account from scratch anyways
    data.events.asset_events[0].winner_account = {
        user: {
            username: data.customData.name,
        },
        address: data.customData.address,
    };


   return data;
}

function copyAddress(evt) {
    navigator.clipboard.writeText(evt.target.dataset.address);
    const toast = document.getElementById("address-toast");
    requestAnimationFrame(() => {
        toast.style.opacity = 1;
        setTimeout(() => {
            toast.style.opacity = 0;
        }, 1000);
    });
}

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (!id) {
        window.location.href = "/about";
    }

    // fetch asset data by looking it up from the /html/item directory
    const data = await getData(id);

    fetch("template.mustache").then((resp) => resp.text())
        .then((template) => {
            document.title = `${data.name} | OpenPuddle`;
            const rendered = mustache.render(template, data);
            document.getElementById("container").innerHTML = rendered;

            document.querySelectorAll("*[data-address]").forEach((elem) => {
                elem.addEventListener("click", copyAddress);
            });
        });
}

document.body.onload = init;