window.data = {
    algorithms: ["A*", "Clusterization algorithm", "Genetic algorithm", "Ant algorithm", "Decision tree", "Neural network"]
}

function getIdFromURL() {
    let parameters = location.search.substring(1).split("&");
    let temp = parameters[0].split("=");
    let id = unescape(temp[1]);
    return ((id >= 0) && (id < data.algorithms.length) || id == 1337) ? (id) : (null);
}

function next() {
    location.href = 'algorithm.html?algorithmId=' + (Number(getIdFromURL()) + 1);
}

function previous() {
    location.href = 'algorithm.html?algorithmId=' + (Number(getIdFromURL()) - 1);
}

function getBack() {
    history.back();
}

function validateId(id) {
    if ((id != null) && (id >= 0 && id < data.algorithms.length || id == 1337)) {
        return true;
    }
    return false;
}

// function loadScripts()
// {
//     document.getElementById("upperPanel").addEventListener("mouseover", upperPanel);
//     document.getElementById("upperPanel").addEventListener("mouseout", upperPanel);
// }

function updateData() {
    let id = getIdFromURL();
    if (!validateId(id)) {
        alert("invalid algorithm id");
    }
    else {
        document.getElementById("algName").innerHTML = data.algorithms[id];
    }
}

function toIndex() {
    location.href = "./index.html";
}

function checkElementsRelevance() {
    let id = getIdFromURL();
    document.getElementById("back").style.visibility = (history.length > 1) ? ("visible") : ("hidden");
    document.getElementById("next").style.visibility = (validateId(id) && (id < data.algorithms.length - 1)) ? ("visible") : ("hidden");
    document.getElementById("previous").style.visibility = (validateId(id) && (id > 0) && id != 1337) ? ("visible") : ("hidden");
    document.getElementById("previous").addEventListener("click", previous);
    document.getElementById("next").addEventListener("click", next);
    document.getElementById("back").addEventListener("click", getBack);
    document.getElementById("mainPage").addEventListener("click", toIndex);
}

function displayFooter() {
    let footer = document.createElement("footer");
    footer.innerHTML = "© 2022 ToxicClown, Ltd. All rights reserved.";
    document.body.appendChild(footer);
}

function getImage() {
    let id = getIdFromURL();
    if (validateId(id)) {
        let image = document.createElement("img");
        image.ondragstart = function () { return false; };
        switch (Number(id)) {
            case 0:
                // image.src = "./resources/paladins.gif";
                // document.getElementById("content").append(image);
                document.write("<script src='./scripts/astar.js'></script>");
                break;
            case 1:
                document.write("<script src='./scripts/clustering.js'></script>");
                break;
            case 2:
                // image.src = "./resources/gachimuchi/hacker.gif";
                // document.getElementById("content").append(image);
                document.write("<script src='./scripts/genetic.js'></script>");
                break;
            case 3:
                document.write("<script src='./scripts/ants1.js'></script>");
                break;
            case 4:
                image.src = "./resources/gachimuchi/rambo.gif";
                image.addEventListener("mousedown", function (event) { if (event.shiftKey) window.location.href = window.location.href.slice(0, -1).concat("1337") });
                document.getElementById("content").append(image);
                break;
            case 5:
                document.write("<script src = './scripts/nn.js'></script>");
                break;
            case 1337:
                document.write("<script src='./scripts/ants.js'></script>");
                break;
            default:
                image.src = "./resources/gachi-fist.gif";
                document.getElementById("content").append(image);
        }
    }
}

// function upperPanel()
// {
//     let upperPanel = document.getElementById("upperPanel");
//     let movingPanel = document.getElementById("movingPanel");
//     upperPanel.style.justifyContent = "end";
// }