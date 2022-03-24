var srcPath = "./resources/clustering/";
var canvasWidth = 600;
var canvasHeight = 600;

var computedStyle;
var context;

class Globals {
    constructor() {
        this.colors = ["--onBackground", "--error", "--background", "--primary", "--primaryVariant", "--pheromones"];
        this.htmlIDs = [];
    }
}

var globals = new Globals();

class Point {

}

function initializeCanvas() {
    let canvas = document.getElementById("canvas");
    let content = document.getElementById('content');
    if (canvas == null) {
        canvas = document.createElement('canvas');
        canvas.id = "canvas";
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.display = "inline";
        canvas.style.border = "0.2vmin solid" + computedStyle.getPropertyValue("--primary");        
        content.appendChild(canvas);
        globals.htmlIDs.unshift("canvas");
    }
    context = canvas.getContext("2d");
}

function removeElements() {
    for (const element of globals.htmlIDs) {
        let el = document.getElementById(element);
        if (!el) {
            alert("element id=" + el + " not found, unable to delete");
            continue;
        }
        el.remove();
    }
    globals.htmlIDs = [];
}

function initialize() {
    computedStyle = getComputedStyle(document.body);
    initializeCanvas();
}

function clusteringStart() {
    initialize();
}

function clusteringExit() {
    removeElements();
    globals = new Globals();
}

clusteringStart();
context.beginPath();
context.arc(15, 15, 15, 0,2*Math.PI);
context.fill();