function error(err) {
    document.getElementById("error").innerText = `Error: ${err}`;
    document.getElementById("error").style.display = "block";
}

function init() {
    const form = document.querySelector("form");
    form.onsubmit = (evt) => {
        evt.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());

        fetch("/create", {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        }).then((resp) => {
            if (!resp.ok) {
                resp.text().then(text => error(text))
            } else {
                return resp.json()
            }
        }).then((json) => {
            window.location.href = `/?id=${json["id"]}`;
        }).catch((err) => {
            console.log(err);
        });
    };
}

document.body.onload = init;