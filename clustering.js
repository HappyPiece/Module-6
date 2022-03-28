var srcPath = "./resources/clustering/";
var canvasWidth = 600;
var canvasHeight = 600;
var radius = 10;

var computedStyle;
var context;

class Globals {
    constructor() {
        this.colors = ["--onBackground", "--error", "--background", "--primary", "--primaryVariant", "--pheromones"];
        this.htmlIDs = [];
        this.points = [];
        this.colorsUsedCounter = 0;
        this.depth = 1;
    }
}

class Node
{
    constructor(initRight, initLeft) {
        this.type = "Node";
        this.right = initRight; this.left = initLeft;
        this.inwardPoints = this.right.inwardPoints.concat(this.left.inwardPoints);
    }
}

var globals = new Globals();

class Point {
    constructor(initX, initY) {
        this.pos = {x: initX, y: initY};
        this.type = "Point";
        this.inwardPoints = [this];
    }
    draw(color = "--primary")
    {
        context.beginPath();
        if (color == "--primary")
        {
            context.fillStyle = computedStyle.getPropertyValue("--primary");
        }
        else
        {
            context.fillStyle = color;
        }
        context.arc(this.pos.x, this.pos.y, radius, 0,2*Math.PI);
        context.fill();
    }
    erase()
    {
        context.beginPath();
        context.fillStyle = computedStyle.getPropertyValue("--background");
        context.arc(this.pos.x, this.pos.y, radius + 1, 0,2*Math.PI);
        context.fill();
    }
}

Array.prototype.clone = function (array) {
    this.length = array.length;
    for (let index = 0; index < array.length; ++index) {
        this[index] = array[index];
    }
    return this;
}

function clusterize(comparator = distanceBetweenClosestPoints)
{
    let minDistance, chosen, points = [].clone(globals.points);
    for (let counter = 0; counter < globals.points.length - 1; counter ++)
    {
        chosen = [];
        minDistance = -1;
        for (let element1 of points)
        {
            for (let element2 of points)
            {
                if (element1 != element2)
                {
                    let distance = comparator(element1, element2);
                    if (minDistance < 0 || minDistance > distance)
                    {
                        chosen = [];
                        chosen.push(element1);
                        chosen.push(element2);
                        minDistance = distance;
                    }
                }
            }
        }
        let node = new Node(chosen[0], chosen[1]);
        points.splice(points.indexOf(node.left), 1);
        points.splice(points.indexOf(node.right), 1, node);
        console.log(points);
    }
    drawTree(points[0]);
}

function distanceBetweenClosestPoints(elem1, elem2)
{
    let minDistance = -1;
    for (let element1 of elem1.inwardPoints)
    {
        for (let element2 of elem2.inwardPoints)
        {
            if (element1 != element2)
            {
                let distance = Math.sqrt((element1.pos.x-element2.pos.x)*(element1.pos.x-element2.pos.x)+(element1.pos.y-element2.pos.y)*(element1.pos.y-element2.pos.y));
                if ((minDistance < 0) || (minDistance > distance))
                {
                    minDistance = distance;
                }
            }
        }
    }
    return minDistance;
}

function colorManager()
{
    let maxVal = 0xFFFFFF;
    let randomNumber = Math.random() * maxVal; 
    randomNumber = Math.floor(randomNumber);
    randomNumber = randomNumber.toString(16);
    let randColor = randomNumber.padStart(6, 0);
    return "#"+randColor;
}

function treeDepth(tree)
{
    if (tree.type == "Point")
    {
        return 0;
    }
    else
    {
        return 1 + Math.max(treeDepth(tree.left), treeDepth(tree.left));
    }
}

function drawTree(tree)
{
    let counter = 0, levelClusters = [tree], sublevelClusters, maxDepth, chosenCluster;
    while (counter < globals.depth)
    {
        maxDepth = -1;
        sublevelClusters = [];
        for (cluster of levelClusters)
        {
            if (maxDepth < treeDepth(cluster))
            {
                maxDepth = treeDepth(cluster);
                chosenCluster = cluster;
            }
        }
        for (cluster of levelClusters)
        {
            if (cluster == chosenCluster)
            {
                sublevelClusters.push(cluster.left);
                sublevelClusters.push(cluster.right);
            }
            else
            {
                sublevelClusters.push(cluster);
            }
        }
        levelClusters = sublevelClusters;
        counter ++;
    }
    for (cluster of levelClusters)
    {
        let color = colorManager();
        for (point of cluster.inwardPoints)
        {
            point.draw(color);
        }
    }
}

function onCanvasMouseDown(event) {
    let rect = event.target.getBoundingClientRect();
    let x = Math.floor((event.clientX - rect.left)), y = Math.floor((event.clientY - rect.top));
    if (event.which == 3)
    {
        deletePoint(x, y);
    }
    else
    {
        placePoint(x, y);
    }
}

function pointAtCoordinates(x, y)
    {
        for (let element of globals.points)
        {
            if (Math.sqrt((x-element.pos.x)*(x-element.pos.x)+(y-element.pos.y)*(y-element.pos.y)) < radius)
            {   
                return element;
            }
        }
        return null;
    }

function placePoint(x, y) {
    for (let element of globals.points)
    {
        if (Math.sqrt((x-element.pos.x)*(x-element.pos.x)+(y-element.pos.y)*(y-element.pos.y)) < 2*radius)
        {   
            return false;
        }
    }
    let point = new Point(x, y);
    globals.points.push(point);
    point.draw();
}

function deletePoint(x, y)
{
    let point = pointAtCoordinates(x, y);
    if (point === null)
    {
        return false;
    }
    else
    {
        point.erase();
        globals.points.splice(globals.points.indexOf(point), 1);
    }
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
        canvas.addEventListener("mousedown", onCanvasMouseDown);
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
    document.body.oncontextmenu = function() {return false};
    registerCustomSlider();
    registerCustomCheckbox();
    registerCustomButton();
    registerCustomselectionwheel();
    //initializeControls();
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