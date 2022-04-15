var srcPath = "./resources/clustering/";
var canvasWidth = 600;
var canvasHeight = 600;
var radius = 10;
var metricsMap = new Map();
metricsMap.set("Closest Points", distanceBetweenClosestPoints);
metricsMap.set("Cluster Centers", distanceBetweenClusterCentres);
metricsMap.set("Wieghed Cluster Centers", distanceBetweenWeighedClusterCentres);
metricsMap.set("Average Paired", distanceBetweenPairs);
metricsMap.set("Average Weighed Paired", distanceBetweenWeighedPairs);



var computedStyle;
var context;
var sliderBackgroundColor = "#242424";
var sliderThumbColor = "#04AA6D";
var sliderThumbSize = 25;

class Globals {
    constructor() {
        this.colors = ["--onBackground", "--error", "--background", "--primary", "--primaryVariant", "--pheromones"];
        this.htmlIDs = [];
        this.points = [];
        this.colorsUsedCounter = 0;
        this.depth = 0;
        this.trees = new Map();
        this.chosenMetric = distanceBetweenClosestPoints;
    }
}

class Node {
    constructor(initRight, initLeft, initID) {
        this.type = "Node";
        this.right = initRight; this.left = initLeft;
        this.inwardPoints = this.right.inwardPoints.concat(this.left.inwardPoints);
        this.id = initID;
        this.traits = null;
    }
}

var globals = new Globals();

class Point {
    constructor(initX, initY) {
        this.pos = { x: initX, y: initY };
        this.type = "Point";
        this.inwardPoints = [this];
        this.id = -1;
    }
    draw(color = "--primary", sectorsNumber = 1, sectorID = 0) {
        context.beginPath();
        if (color == "--primary") {
            context.fillStyle = computedStyle.getPropertyValue("--primary");
        }
        else {
            context.fillStyle = color;
        }
        let sector = (2 * Math.PI)/sectorsNumber;
        context.arc(this.pos.x, this.pos.y, radius, sector*sectorID, sector*(sectorID+1));
        context.fill();
    }
    drawAsCentrode(color = "--primary")
    {
        context.beginPath();
        if (color == "--primary") {
            context.fillStyle = computedStyle.getPropertyValue("--primary");
        }
        else {
            context.fillStyle = color;
        }
        context.moveTo(this.pos.x, this.pos.y - 7);
        context.lineTo(this.pos.x + 6, this.pos.y + 4);
        context.lineTo(this.pos.x - 6, this.pos.y + 4,);
        context.lineTo(this.pos.x, this.pos.y - 7);
        context.fill();
        context.closePath();
    }
    erase() {
        context.beginPath();
        context.fillStyle = computedStyle.getPropertyValue("--background");
        context.arc(this.pos.x, this.pos.y, radius + 1, 0, 2 * Math.PI);
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

function clusterize(comparator = distanceBetweenClosestPoints) {
    let minDistance, chosen, points = [].clone(globals.points), idCounter = 0;
    if (points.length == 0)
    {
        return false;
    }
    for (let counter = 0; counter < globals.points.length - 1; counter++) {
        chosen = [];
        minDistance = -1;
        // for (let element1 of points) {
        //     for (let element2 of points) {
        //         if (element1 != element2) {
        //             let distance = comparator(element1, element2);
        //             if (minDistance < 0 || minDistance > distance) {
        //                 chosen = [];
        //                 chosen.push(element1);
        //                 chosen.push(element2);
        //                 minDistance = distance;
        //             }
        //         }
        //     }
        // }
        for (let counter1 = 0; counter1 < points.length; counter1 ++) {
            for (let counter2 = 0; counter2 < points.length; counter2 ++) {
                if (counter1 != counter2) {
                    let distance = comparator(points[counter1], points[counter2]);
                    if (minDistance < 0 || minDistance > distance) {
                        chosen = [];
                        chosen[0] = counter1;
                        chosen[1] = counter2;
                        minDistance = distance;
                    }
                }
            }
        }
        // if (comparator == distanceBetweenClosestPoints)
        // {
        //     console.log(typeof points[chosen[0]]);
        //     console.log(points[chosen[0]], points.slice(chosen[0], chosen[0] + 1)[0]);
        // }
        let node = new Node(points.slice(chosen[0], chosen[0] + 1)[0], points.slice(chosen[1], chosen[1] + 1)[0], idCounter++);
        if (comparator == distanceBetweenClosestPoints)
        {
            node.traits = ClosestPoints(node.left, node.right);
        }
        points.splice(points.indexOf(node.left), 1);
        points.splice(points.indexOf(node.right), 1, node);
        // if (comparator == distanceBetweenClosestPoints)
        // {
        //     console.log(points.slice());
        //     console.log(minDistance);
        // }
    }
    globals.trees.set(comparator, points[0]);
    drawTree();
}

function distanceBetweenClosestPoints(elem1, elem2) {
    let minDistance = -1, distance = 0;
    for (let element1 of elem1.inwardPoints) {
        for (let element2 of elem2.inwardPoints) {
            distance = Math.sqrt((element1.pos.x - element2.pos.x) * (element1.pos.x - element2.pos.x) + (element1.pos.y - element2.pos.y) * (element1.pos.y - element2.pos.y));
            if ((minDistance < 0) || (minDistance > distance)) {
                minDistance = distance;
            }
        }
    }
    return minDistance;
}

function ClosestPoints(elem1, elem2) {
    let minDistance = -1, distance = 0, chosenPoints = [];
    for (let element1 of elem1.inwardPoints) {
        for (let element2 of elem2.inwardPoints) {
            distance = Math.sqrt((element1.pos.x - element2.pos.x) * (element1.pos.x - element2.pos.x) + (element1.pos.y - element2.pos.y) * (element1.pos.y - element2.pos.y));
            if ((minDistance < 0) || (minDistance > distance)) {
                minDistance = distance;
                chosenPoints = [element1, element2];
            }
        }
    }
    return chosenPoints;
}

function distanceBetweenPairs(elem1, elem2) {
    let medDistance = 0, counter = 0;
    for (let element1 of elem1.inwardPoints) {
        for (let element2 of elem2.inwardPoints) {
            if (element1 != element2) {
                let distance = Math.sqrt((element1.pos.x - element2.pos.x) * (element1.pos.x - element2.pos.x) + (element1.pos.y - element2.pos.y) * (element1.pos.y - element2.pos.y));
                medDistance += distance;
                counter ++;
            }
        }
    }
    return medDistance /= counter;
}

function distanceBetweenWeighedPairs(elem1, elem2) {
    let medDistance = 0, counter = 0;
    for (let element1 of elem1.inwardPoints) {
        for (let element2 of elem2.inwardPoints) {
            if (element1 != element2) {
                let distance = Math.sqrt((element1.pos.x - element2.pos.x) * (element1.pos.x - element2.pos.x) + (element1.pos.y - element2.pos.y) * (element1.pos.y - element2.pos.y));
                medDistance += distance;
                counter ++;
            }
        }
    }
    return medDistance /= (counter + Math.sqrt(elem1.inwardPoints.length + elem2.inwardPoints.length));
}

function clusterCenter(cluster)
{
    let x = 0, y = 0, center;
    for (let point of cluster.inwardPoints) {
        x += point.pos.x;
        y += point.pos.y;
    }
    center = { x: x / cluster.inwardPoints.length, y: y / cluster.inwardPoints.length };
    return center;
}

function distanceBetweenClusterCentres(elem1, elem2) {
    let center1 = clusterCenter(elem1), center2 = clusterCenter(elem2);
    let distance = Math.sqrt((center1.x - center2.x) * (center1.x - center2.x) + (center1.y - center2.y) * (center1.y - center2.y));
    return distance;
}

function distanceBetweenWeighedClusterCentres(elem1, elem2) {
    let center1 = clusterCenter(elem1), center2 = clusterCenter(elem2);
    let distance = Math.sqrt((center1.x - center2.x) * (center1.x - center2.x) + (center1.y - center2.y) * (center1.y - center2.y))/Math.sqrt(elem1.inwardPoints.length+elem2.inwardPoints.length);
    return distance;
}

function colorManager() {
    let maxVal = 0xFFFFFF;
    let randomNumber = Math.random() * maxVal;
    randomNumber = Math.floor(randomNumber);
    randomNumber = randomNumber.toString(16);
    let randColor = randomNumber.padStart(6, 0);
    return "#" + randColor;
}

function treeDepth(tree) {
    if (tree.type == "Point") {
        return 0;
    }
    else {
        return 1 + Math.max(treeDepth(tree.left), treeDepth(tree.left));
    }
}

function drawTree() {
    if (globals.trees.size != metricsMap.size)
    {
        return false;
    }
    let levelClusters = new Map();
    for (metric of metricsMap)
    {
        let tree = globals.trees.get(metric[1]);
        levelClusters.set(metric[1], [tree]);
        let counter = 0, sublevelClusters, maxDepth, chosenCluster;
        while ((counter < globals.depth) && (counter < globals.points.length)) {
            maxID = -1;
            sublevelClusters = [];
            for (cluster of levelClusters.get(metric[1])) {
                if (maxID < cluster.id) {
                    maxID = cluster.id;
                    chosenCluster = cluster;
                }
            }
            for (cluster of levelClusters.get(metric[1])) {
                if (cluster == chosenCluster) {
                    sublevelClusters.push(cluster.left);
                    sublevelClusters.push(cluster.right);
                }
                else {
                    sublevelClusters.push(cluster);
                }
            }
            levelClusters.set(metric[1], sublevelClusters);
            counter++;
        }
    }
    context.fillStyle = computedStyle.getPropertyValue("--background");
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    let pointsParents = new Map();
    let parents = new Array();
    for (level of levelClusters)
    {
        for (cluster of level[1])
        {
            for (point of cluster.inwardPoints) {
                if (pointsParents.has(point))
                {
                    if (!(pointsParents.get(point).includes(level[0])))
                    {
                        parents.push(level[0]);
                        pointsParents.set(point, parents);
                    }
                }
                else
                {
                    parents = new Array();
                    parents.push(level[0]);
                    pointsParents.set(point, parents);
                }
            }
        }
    }
    if (true)
    {
        for (level of levelClusters)
        {
            if (level[0] != globals.chosenMetric)
            {
                continue;
            }
            for (cluster of level[1]) {
                let color = colorManager();
                for (point of cluster.inwardPoints) {
                    if (globals.points.includes(point))
                    {
                        point.draw(color);
                        //point.draw(color, pointsParents.get(point).length, pointsParents.get(point).indexOf(level[0]));
                    }
                }
                if ((cluster.type == "Node")&&((level[0] == distanceBetweenClusterCentres)||(level[0] == distanceBetweenWeighedClusterCentres)))
                {
                    let center = clusterCenter(cluster);
                    let centrode = new Point(center.x, center.y);
                    centrode.drawAsCentrode(color);
                }
                if ((cluster.type == "Node")&&((level[0] == distanceBetweenClosestPoints)))
                {
                    drawLineBetweenPoints(cluster.traits[0], cluster.traits[1], color);
                }
            }
        }
    }
}

function drawLineBetweenPoints(point1, point2, color = "--primary")
{
    context.beginPath();
    if (globals.trees.size > 0) {
        context.strokeStyle = color;   
    }
    else {
        context.strokeStyle = computedStyle.getPropertyValue("--primary");
    }
    context.moveTo(point1.pos.x, point1.pos.y);
    context.lineTo(point2.pos.x, point2.pos.y);
    context.stroke();
    context.closePath();
}

function onCanvasMouseDown(event) {
    let rect = event.target.getBoundingClientRect();
    let x = Math.floor((event.clientX - rect.left)), y = Math.floor((event.clientY - rect.top));
    if (event.which == 3) {
        deletePoint(x, y);
    }
    else {
        placePoint(x, y);
    }
}

function pointAtCoordinates(x, y) {
    for (let element of globals.points) {
        if (Math.sqrt((x - element.pos.x) * (x - element.pos.x) + (y - element.pos.y) * (y - element.pos.y)) < radius) {
            return element;
        }
    }
    return null;
}

function placePoint(x, y) {
    for (let element of globals.points) {
        if (Math.sqrt((x - element.pos.x) * (x - element.pos.x) + (y - element.pos.y) * (y - element.pos.y)) < 2 * radius) {
            return false;
        }
    }
    context.fillStyle = computedStyle.getPropertyValue("--background");
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    globals.trees = new Map();
    let point = new Point(x, y);
    globals.points.push(point);
    let depthSlider = document.getElementById("depth");
    depthSlider.max++;
    depthSlider.updateValue();
    for (element of globals.points) {
        element.draw();
    }
}

function deletePoint(x, y) {
    let point = pointAtCoordinates(x, y);
    if (point === null) {
        return false;
    }
    else {
        context.fillStyle = computedStyle.getPropertyValue("--background");
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        globals.points.splice(globals.points.indexOf(point), 1);
        let depthSlider = document.getElementById("depth");
        depthSlider.max--;
        depthSlider.updateValue();
        globals.trees = new Map();
        for (element of globals.points) {
            element.draw();
        }
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
    context.disableBloom = function () { context.canvas.style.filter = "url()"; };
    context.enableBloom = function () { context.canvas.style.filter = "url(" + srcPath + "bloom.svg" + "#bloom)" };
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
    document.body.oncontextmenu = function () { return false };

    let content = document.getElementById("content");
    content.style.display = "block";
    content.style.textAlign = "center";
    registerCustomSlider();
    registerCustomCheckbox();
    registerCustomButton();
    registerCustomselectionwheel();
    window.document.addEventListener("keydown", onKeyDown);
    initializeCanvas();
    initializeParams();
}

function clusteringStart() {
    initialize();
}

function clusteringExit() {
    removeElements();
    globals = new Globals();
}

clusteringStart();

function onKeyDown(event) {
    if (/Tab/.test(event.code) || event.which == 9) {
        event.preventDefault();
        let params = document.getElementById("parameters");
        if (params.updateIntervalId != null) {
            return true;
        }
        params.fadeStep = params.style.display == "none" ? 0.1 : -0.1;
        params.updateIntervalId = setInterval(paramsFade, 40, params);
    }
}

function initializeParams() {
    let parameterDiv = document.createElement('div');
    parameterDiv.id = "parameters";
    parameterDiv.style.display = "none";
    parameterDiv.style.minWidth = "200px";
    parameterDiv.style.marginLeft = "3%";
    parameterDiv.style.position = "fixed";
    parameterDiv.style.opacity = "0";
    globals.htmlIDs.unshift("parameters");
    function addParameter(name, inputContainer) {
        let par = document.createElement("div");
        // par.style.display = "block";
        if (name) {
            let text = document.createElement('p');
            text.innerText = name + " ";
            text.style.display = "flex";
            text.style.flexDirection = "column";
            par.appendChild(text);
        }
        par.appendChild(inputContainer);
        parameterDiv.appendChild(par);
    }
    let avaliableMetrics = [];
    for (metric of metricsMap)
    {
        avaliableMetrics.push(metric[0]);
    }
    let metrics = createCustomSelectionWheel("metrics", "100%", avaliableMetrics, onChosenMetricChange);
    addParameter(null, createCustomCheckbox('bloomCb', false, "Bloom", function () { this.checkbox.checked ? context.disableBloom() : context.enableBloom(); }));
    addParameter("Metric:", metrics);
    addParameter("Clusters number", createCustomNumberSelection("depth", "100%", 0, 0, 0, onDepthSliderChange));
    addParameter(null, createCustomButton("start", "Clusterize", "100%", onStartButtonClick));
    addParameter(null, createCustomButton("clear", "Clear", "100%", onClearButtonClick));
    document.getElementById('content').appendChild(parameterDiv);
}

function onChosenMetricChange(event, value) {
    globals.chosenMetric = metricsMap.get(value);
    drawTree();
}

function onClearButtonClick() {
    globals.points = [];
    globals.trees = new Map();
    let depthSlider = document.getElementById("depth");
    depthSlider.max = 0;
    depthSlider.updateValue();
    context.fillStyle = computedStyle.getPropertyValue("--background");
    context.fillRect(0, 0, canvasWidth, canvasHeight);
}

function onDepthSliderChange(event, value) {
    globals.depth = value - 1;
    drawTree();
}

function onStartButtonClick(event) {
    for (metric of metricsMap)
    {
        clusterize(metric[1]);
    }
}

function paramsFade(params) {
    let opacity = Number(params.style.opacity);
    if (params.style.display == "none") {
        params.style.display = "inline-block";
    }
    params.style.opacity = String(opacity += params.fadeStep);
    if (opacity <= 0. || opacity >= 1.) {
        params.style.opacity = opacity = Math.round(opacity);
        params.style.display = opacity > 0 ? "inline-block" : "none";
        clearInterval(params.updateIntervalId);
        params.updateIntervalId = null;
    }
}

function registerCustomSlider() {
    let sliderStyle = `
    .slider {
            -webkit-appearance: none;
            height: 20px;
            background: ${sliderBackgroundColor};
            outline: none;
            opacity: 0.7;
            -webkit-transition: .2s;
            transition: opacity .2s;
          }
    
          .slider:hover {
            opacity: 1;
          }
    
          .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: ${sliderThumbSize}px;
            height: ${sliderThumbSize}px;
            background: ${sliderThumbColor};
            cursor: pointer;
          }
    
          .slider::-moz-range-thumb {
            width: 25px;
            height: 20px;
            background: ${sliderThumbColor};
            cursor: pointer;
          }
` ;
    var styleSheet = document.createElement('style');
    styleSheet.innerText = sliderStyle.replace(/\n/g, " ").replace(/\s\s/g, "");
    styleSheet.id = "slider-styles";
    document.head.appendChild(styleSheet);
    globals.htmlIDs.unshift("slider-styles");

    let popup = document.createElement("div");
    let popupText = document.createElement("span");
    popup.id = "sliderPopUp";
    popupText.id = "sliderPopUpText";

    popup.appendChild(popupText);
    popup.style.display = "none";
    popup.style.position = "absolute";
    popup.style.left = "100px";
    popup.style.top = "50px";
    // popup.style.width = "135px";
    popup.style.border = "solid" + computedStyle.getPropertyValue("--primaryVariant") + " 1px";
    popup.style.backgroundColor = computedStyle.getPropertyValue("--onBackground");
    popup.style.textAlign = "justify";
    popup.style.padding = "4px";
    popup.style.fontSize = "1.5vmin";
    document.body.appendChild(popup);
    globals.htmlIDs.unshift("sliderPopUp");
}

function registerCustomCheckbox() {
    let checkboxStyle = `
    .checkboxContainer {
        display: block;
        position: relative;
        margin: 2px;
        margin-top: 5px;
        cursor: pointer;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      /* Hide the browser's default checkbox */
      .checkboxContainer input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
      }
      
      /* Create a custom checkbox */
      .checkmark {
        position: absolute;
        border: 0.2vmin solid ${computedStyle.getPropertyValue("--primary")};
        top: 0;
        left: 0;
        height: 2.4vmin;
        width: 2.4vmin;        
        background-color: ${sliderBackgroundColor};
      }
      

      /* When the checkbox is checked, add a blue background */
      .checkboxContainer input:checked ~ .checkmark {
        background-color: ${sliderThumbColor};
      }
      
      /* Create the checkmark/indicator (hidden when not checked) */
      .checkmark:after {
        content: "";
        position: absolute;
        display: none;
      }
      
      /* Show the checkmark when checked */
      .checkboxContainer input:checked ~ .checkmark:after {
        display: block;
      }
      
      /* Style the checkmark/indicator */
      .checkboxContainer .checkmark:after {
        left: 9px;
        top: 5px;
        width: 5px;
        height: 10px;
        -webkit-transform: rotate(45deg);
        -ms-transform: rotate(45deg);
        transform: rotate(45deg);
      }
` ;
    var styleSheet = document.createElement('style');
    styleSheet.innerText = checkboxStyle.replace(/\n/g, " ").replace(/\s\s/g, "");
    styleSheet.id = "checkbox-styles";
    document.head.appendChild(styleSheet);
    globals.htmlIDs.unshift("checkbox-styles");
}

function registerCustomButton() {
    let style = `
    .button{
        display: inline-block;
        border: solid ${computedStyle.getPropertyValue("--primary")} 1px;
        background-color: ${computedStyle.getPropertyValue("--onBackground")};
        text-align: center;
        // padding: 4px;
        margin-bottom: 4px;
        height: 3vmin;
        transition: background-color 100ms, color 100ms;
        // border-radius: 0.4vmin;
    }
    .button:hover{
        background-color: ${computedStyle.getPropertyValue("--primary")};
        color: ${computedStyle.getPropertyValue("--onBackground")};
    }
`;
    let styleSheet = document.createElement('style');
    styleSheet.innerText = style.replace(/\n/g, " ").replace(/\s\s/g, "");
    styleSheet.id = "button-styles";
    document.head.appendChild(styleSheet);
    globals.htmlIDs.unshift("button-styles");
}

function registerCustomselectionwheel() {
    let style = `
    .sel-wheel{
        display: inline-block;
        border: solid ${computedStyle.getPropertyValue("--primary")} 1px;
        background-color: ${computedStyle.getPropertyValue("--onBackground")};
        text-align: center;
        margin-top: 4px;
        margin-bottom: 4px;
        height: 3vmin;
        transition: background-color 100ms, color 100ms;
    }
    .sel-wheel-ArrowL{
        left: 10%;
        display: inline;
        position: absolute;
    }
    .sel-wheel-ArrowR{
        right: 10%;
        display: inline;
        position: absolute;
    }
    .sel-wheel:hover{
        background-color: ${computedStyle.getPropertyValue("--primary")};
        color: ${computedStyle.getPropertyValue("--onBackground")};
    }
`;
    let styleSheet = document.createElement('style');
    styleSheet.innerText = style.replace(/\n/g, " ").replace(/\s\s/g, "");
    styleSheet.id = "selwheel-styles";
    document.head.appendChild(styleSheet);
    globals.htmlIDs.unshift("selwheel-styles");
}

function createCustomSlider(min, max, id, width = null, value = 0, onChange = function () { return true; }, popUpValue = null) {
    let slider = document.createElement("input");
    slider.className = "slider";
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.id = String(id);
    // slider.style.appearance = "none";
    if (width) {
        slider.style.width = String(width);
    }
    slider.addEventListener("mouseenter", function () { slider.style.opacity = "1"; });
    slider.addEventListener("mouseleave", function () { slider.style.opacity = "0.7"; });
    slider.addEventListener("change", onChange);
    if (popUpValue) {
        let popup = document.getElementById("sliderPopUp");
        slider.addEventListener("mouseover", onSliderMouseOver);
        slider.addEventListener("mouseleave", function () { popup.style.display = "none"; });
        slider.addEventListener("mousemove", onSliderMouseMove);
        slider.addEventListener("mouseup", onSliderMouseMove);

        function onSliderMouseOver(event) {
            let x = event.clientX + window.scrollX - 2, y = event.clientY + window.scrollY + 13;

            popup.style.display = "none";
            popup.style.left = x + "px";
            popup.style.top = y + "px";
            popup.style.display = "block";

            popup.innerHTML = String(popUpValue());
        }
        function onSliderMouseMove(event) {
            let x = event.clientX, y = event.clientY;
            let rect = event.target.getBoundingClientRect();
            let thumbX = rect.left + Math.max((Number(slider.value) - 1) / (max - min) * (rect.right - rect.left - sliderThumbSize - 2), 0);
            if (!(x >= thumbX && x < thumbX + sliderThumbSize)) {
                popup.style.display = "none";
                return true;
            }
            popup.style.left = String(x + window.scrollX - 2) + "px";
            popup.style.top = String(y + window.scrollY + 13) + "px";
            popup.innerHTML = String(popUpValue());
            popup.style.display = "block";
        }
    }
    return slider;
}

function createCustomCheckbox(id, checked = false, text = "", onChange = function () { return true; }) {
    let cbContainer = document.createElement("label");
    let checkbox = document.createElement("input");
    let checkMark = document.createElement("span");
    let innerText = document.createElement("span");

    cbContainer.className = "checkboxContainer";
    checkMark.className = "checkmark";
    checkbox.className = "checkbox";

    checkbox.type = "checkbox";
    checkbox.checked = checked;

    // cbContainer.innerText = String(text);
    cbContainer.style.fontSize = "2vmin";
    cbContainer.checkbox = checkbox;
    cbContainer.id = String(id);
    innerText.textContent = String(text);

    cbContainer.appendChild(checkbox);
    cbContainer.appendChild(checkMark);
    cbContainer.append(innerText);
    cbContainer.changeText = function (newText) { innerText.textContent = newText; };
    // cbContainer.addEventListener("mousedown", function () { console.log(this.checkbox.checked, this.checked) });
    cbContainer.addEventListener("mousedown", onChange);
    globals.htmlIDs.unshift(String(id));
    return cbContainer;
}

function createCustomButton(id, text, cssWidth = null, onClick = function () { return true; }) {
    let button = document.createElement("div");
    // let bText = document.createElement("span");
    button.id = String(id);
    button.className = "button";
    button.innerText = String(text);
    if (cssWidth) {
        button.style.width = String(cssWidth);
    }
    // bText.innerText = String(text);
    button.changeText = function (newText) {
        this.innerText = String(newText);
    }
    button.addEventListener("mousedown", onClick);
    // button.appendChild(bText);
    return button;
}

function createCustomSelectionWheel(id, width, sOptionList = ["none"], optionChangeHandler = function () { return true; }) {
    if (sOptionList.length < 1) {
        return false;
    }
    let selwheel = document.createElement("div");
    selwheel.id = String(id);
    selwheel.className = 'sel-wheel';
    selwheel.selectedOption = sOptionList[0];
    selwheel.selectedOptionIndex = 0;
    selwheel.optionList = sOptionList;
    selwheel.addEventListener("mousedown", changeState);
    selwheel.style.width = width ? String(width) : "100%";
    let left = document.createElement("div"), right = document.createElement("div");
    let ddText = document.createElement("span");
    left.innerText = "<";
    right.innerText = ">";
    left.className = "sel-wheel-ArrowL";
    right.className = "sel-wheel-ArrowR";
    ddText.style.display = "inline-block";
    ddText.innerText = selwheel.selectedOption;
    selwheel.content = ddText;

    selwheel.appendChild(left);
    selwheel.appendChild(ddText)
    selwheel.appendChild(right);

    function changeState(event) {
        let rect = this.getBoundingClientRect();
        this.selectedOptionIndex = (this.selectedOptionIndex + Math.sign(event.clientX - rect.left - (rect.right - rect.left) / 2) + this.optionList.length) % this.optionList.length;
        this.selectedOption = this.optionList[this.selectedOptionIndex];
        this.content.innerText = this.selectedOption;
        optionChangeHandler(event, this.selectedOption);
    }

    selwheel.appendOption = function (option) {
        this.optionList.push(option);
    }

    globals.htmlIDs.unshift(String(id));
    return selwheel;
}

function createCustomNumberSelection(id, width, init = 0, min = null, max = null, onChange = function () { return true; }) {
    let selector = document.createElement("div");
    selector.id = String(id);
    selector.className = 'sel-wheel';
    selector.selectedNumber = init;
    selector.min = min;
    selector.max = max;
    selector.addEventListener("mousedown", changeState);
    selector.style.width = width ? String(width) : "100%";
    let left = document.createElement("div"), right = document.createElement("div");
    let selValue = document.createElement("span");
    let selInput = document.createElement("input");
    selector.input = selInput;

    left.innerText = "<";
    right.innerText = ">";
    left.className = "sel-wheel-ArrowL";
    right.className = "sel-wheel-ArrowR";
    selValue.style.display = "inline-block";
    selValue.innerText = selector.selectedNumber;
    selector.content = selValue;

    selInput.type = "text";
    selInput.style.position = "absolute";
    selInput.style.width = "0";
    selInput.style.height = "0";
    selInput.style.background = "transparent";
    selInput.style.border = "none";
    selInput.style.outline = "none";
    selInput.wheel = selector;
    selInput.addEventListener("input", function () { this.wheel.content.innerText = this.value; });
    selInput.addEventListener("focusout", function () { this.wheel.content.style.color = ""; this.value = ""; });
    selInput.addEventListener("change", onInput);

    selector.appendChild(left);
    selector.appendChild(selValue)
    selector.appendChild(selInput);
    selector.appendChild(right);

    function changeState(event) {
        let rect = this.getBoundingClientRect();
        let cursorPosXrel = event.clientX - rect.left;
        let midPointXrel = (rect.right - rect.left) / 2;
        if (Math.abs(cursorPosXrel - midPointXrel) - midPointXrel * 0.3 > 0) {
            this.selectedNumber = this.selectedNumber + Math.sign(cursorPosXrel - midPointXrel);
            this.updateValue();
            this.content.innerText = this.selectedNumber;
            onChange(event, this.selectedNumber);
        }
        else {
            this.input.focus();
            this.content.style.color = "red";
            event.preventDefault();
        }
    }

    function onInput(event) {
        let val = Number(this.value);
        this.wheel.selectedNumber = val;
        if (this.wheel.max != null) {
            this.wheel.selectedNumber = Math.min(this.wheel.selectedNumber, this.wheel.max);
        }
        if (this.wheel.min != null) {
            this.wheel.selectedNumber = Math.max(this.wheel.selectedNumber, this.wheel.min);
        }
        this.wheel.content.innerText = this.wheel.selectedNumber;
        this.wheel.content.style.color = ""; this.value = "";
        onChange(event, this.wheel.selectedNumber);
    }

    selector.updateValue = function () {
        if (this.max != null) {
            this.selectedNumber = Math.min(this.selectedNumber, this.max);
        }
        if (this.min != null) {
            this.selectedNumber = Math.max(this.selectedNumber, this.min);
        }
        this.content.innerText = this.selectedNumber;
        onChange(null, this.selectedNumber);
    }

    globals.htmlIDs.unshift(String(id));
    return selector;
}