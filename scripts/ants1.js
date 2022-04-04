var srcPath = "./resources/ants/";
var canvasWidth = 900;
var canvasHeight = 600;
var fitScoreBase = 1;

var updateInterval = 25;
var updateFunctionIntervalId;
var computedStyle;
var context;
var sliderBackgroundColor = "#242424";
var sliderThumbColor = "#04AA6D";
var sliderThumbSize = 25;
var globals;

class Globals {
    constructor() {
        this.paused = true;
        this.colors = ["--onBackground", "#3fFF20", "--pheromones", "#FFFFFF", "--primary"];
        this.colorsExperimental = [];
        this.htmlIDs = [];
        this.toolButtonDown = false;
        this.bloom = false;
        this.showAllTimeBest = true;
        this.algStepInterval = 10;
        this.mousepos = [];
    }
}
globals = new Globals();

class Alg {
    constructor() {
        this.stepCount = 0;
        this.isRunning = false;
        this.isFinished = false;
        this.generations = 300;
        this.antLimit = 300;
        this.greedyFactor = 1;
        this.explorationFactor = 1;
        this.distanceCoeff = 1;
        this.pheromoneIncrease = 1;
        this.maxPheromoneConcentration = 100;
        this.bestPathPheromoneReward = 1.;
        this.pheromoneEvaporationFactor = 0.75;
        this.points = [];
        this.ants = [];
        this.best = [];
        this.best.pathLength = Number.MAX_SAFE_INTEGER;
        this.pheromones = [];
        this.pheromonesPureValue = [];
        this.distances = [];
        this.dist = function (point1, point2) { return (point1[0] - point2[0]) * (point1[0] - point2[0]) + (point1[1] - point2[1]) * (point1[1] - point2[1]); }
    }

    reset() {
        this.isRunning = false;
        this.isFinished = false;
        this.stepCount = 0;
        this.points = [];
        this.ants = [];
        this.pheromones = [];
        this.pheromonesPureValue = [];
        this.distances = [];
        this.best = [];
        this.best.pathLength = Number.MAX_SAFE_INTEGER;

    }

    step() {
        if (this.ants.length < this.antLimit) {
            this.spawnAnt();
        }
        for (let index = 0; index < this.ants.length; ++index) {
            this.ants[index].move();
            if (this.ants[index].visited.length >= this.points.length) {
                if (this.ants[index].pathLength <= this.best.pathLength) {
                    this.best.clone(this.ants[index].visited);
                    this.best.pathLength = this.ants[index].pathLength;
                }
                this.ants.splice(index, 1);
            }
        }
        this.updatePheromone();
        this.stepCount++;
        // this.genCount = 0;
        // this.isFinished = !(this.isRunning = false);
    }

    start() {
        if (this.isRunning || this.points.length <= 1 || this.isFinished) {
            return false;
        }
        for (let iCity = 0; iCity < this.points.length; ++iCity) {
            this.pheromones[iCity] = [];
            this.distances[iCity] = [];
            for (let jCity = 0; jCity < this.points.length; ++jCity) {
                this.distances[iCity][jCity] = this.distanceCoeff / Math.pow(this.dist(this.points[iCity], this.points[jCity]), this.greedyFactor);
                this.pheromones[iCity][jCity] = 0;
            }
        }
        return this.isRunning = true;
    }

    stop() {
        this.isRunning = !(this.isFinished = true);
    }

    spawnAnt() {
        let moveAnt = function () {
            let probability = [];//[0] - probability, [1] - corresponding city index
            let allowedMoveFactorSum = 0;
            for (let index = 0; index < this.parentAlg.points.length; ++index) {
                if (index != this.cityIndex && !this.visited.includes(index)) {
                    probability.push([Math.pow(this.parentAlg.pheromones[this.cityIndex][index], this.parentAlg.explorationFactor) * this.parentAlg.distances[this.cityIndex][index], index]);
                    allowedMoveFactorSum += probability[probability.length - 1][1];
                }
            }
            for (let index = 0; index < probability.length; ++index) {
                probability[index][0] /= allowedMoveFactorSum;
            }
            probability.sort((a, b) => b[0] - a[0]);
            let nextCity = this.parentAlg.pickCityByProbability(probability);
            this.parentAlg.pheromones[this.cityIndex][nextCity] = Math.min(this.parentAlg.pheromones[this.cityIndex][nextCity] + this.parentAlg.pheromoneIncrease, this.parentAlg.maxPheromoneConcentration);
            this.pathLength += this.parentAlg.distances[this.cityIndex][nextCity];
            this.cityIndex = nextCity;
            this.visited.push(this.cityIndex);
        }
        let ant = { cityIndex: 0, visited: [], parentAlg: this, pathLength: 0, move: moveAnt };
        this.ants.push(ant);
    }

    pickCityByProbability(probabilities) {
        let rand = Math.random(), index = 0;
        while (index < probabilities.length && rand > 0) {
            rand -= probabilities[index++][0];
        }

        return probabilities[index - 1][1];
    }
    updatePheromone() {
        for (let iCity = 0; iCity < this.points.length; ++iCity) {
            for (let jCity = 0; jCity < this.points.length; ++jCity) {
                this.pheromones[iCity][jCity] *= this.pheromoneEvaporationFactor;
            }
        }
        for (let index = 0; index < this.best.length - 1; ++index) {
            this.pheromones[this.best[index]][this.best[index + 1]] += this.bestPathPheromoneReward;
        }
    }
}
alg = new Alg();


Math.dist = function (x, y, x1, y1) {
    return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
};

Array.prototype.swapDelete = function (index) {
    this[index] = this[this.length - 1];
    this.pop();
}

Array.prototype.shuffle = function () {
    let currentIndex = this.length, randomIndex, temp;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        temp = this[currentIndex];
        this[currentIndex] = this[randomIndex];
        this[randomIndex] = temp;
    }

    return this;
}

Array.prototype.clone = function (array) {
    this.length = array.length;
    for (let index = 0; index < array.length; ++index) {
        this[index] = array[index];
    }
}

Array.prototype.swap = function (index1, index2) {
    let t = this[index1];
    this[index1] = this[index2];
    this[index2] = t;
}

Array.prototype.reverse = function (from, to) {
    while (from < to) {
        this.swap(from++, to--);
    }
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: parseInt("FF", 16)
    } : null;
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
    let styleSheet = document.createElement('style');
    styleSheet.innerText = sliderStyle;
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

    .checkboxContainer input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
      }
      
      .checkmark {
        position: absolute;
        border: 0.2vmin solid ${computedStyle.getPropertyValue("--primary")};
        top: 0;
        left: 0;
        height: 17px;
        width: 17px;        
        background-color: ${sliderBackgroundColor};
      }

      .checkboxContainer input:checked ~ .checkmark {
        background-color: ${sliderThumbColor};
      }
      
      .checkmark:after {
        content: "";
        position: absolute;
        display: none;
      }
      
      .checkboxContainer input:checked ~ .checkmark:after {
        display: block;
      }
      
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
    styleSheet.innerText = checkboxStyle;
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
        padding: 4px;
        transition: background-color 100ms, color 100ms;
        // border-radius: 0.4vmin;
    }
    .button:hover{
        background-color: ${computedStyle.getPropertyValue("--primary")};
        color: ${computedStyle.getPropertyValue("--onBackground")};
    }
`;
    let styleSheet = document.createElement('style');
    styleSheet.innerText = style;
    styleSheet.id = "button-styles";
    document.head.appendChild(styleSheet);
    globals.htmlIDs.unshift("button-styles");
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
    let innerText = document.createElement("div");
    let textContainer = document.createElement("div");

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

    textContainer.style.paddingLeft = "25px";
    textContainer.style.whiteSpace = "nowrap";
    textContainer.appendChild(innerText);

    cbContainer.appendChild(checkbox);
    cbContainer.appendChild(checkMark);
    cbContainer.appendChild(textContainer);
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

function initializeCanvas() {
    let canvas = document.getElementById("grid");
    initializeContent();
    let content = document.getElementById('content');
    if (canvas == null) {
        canvas = document.createElement('canvas');
        canvas.id = "grid";
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.display = "inline";
        canvas.style.border = "0.2vmin solid" + computedStyle.getPropertyValue("--primary");
        // canvas.style.alignSelf = "center";        
        content.appendChild(canvas);
        // canvas.addEventListener("click", onCanvasClicked);
        canvas.addEventListener("mousedown", onCanvasMouseDown);
        document.addEventListener("mouseup", function () { globals.toolButtonDown = false; globals.mousepos = [] });
        canvas.addEventListener("mousemove", onCanvasMouseMove);
        globals.htmlIDs.unshift("grid");
    }
    context = canvas.getContext("2d");
    context.enableBloom = function () { context.canvas.style.filter = "url(" + srcPath + "bloom.svg" + "#bloom)" };
    context.disableBloom = function () { context.canvas.style.filter = "url()"; };
    context.font = "2vmin Nunito";

    drawImage = context.createImageData(canvasWidth, canvasHeight);
    drawBuffer = drawImage.data;
    for (const col of globals.colors) {
        if (col[0] != '-') {
            globals.colorsExperimental.push(col);
        } else {
            globals.colorsExperimental.push(computedStyle.getPropertyValue(col).replace(/\s/g, ''));
        }
        if (globals.colorsExperimental[globals.colorsExperimental.length - 1] == null) {
            console.error("UNABLE TO PARSE COLOR \"", col, "\" RENDERER ERRORS WILL APPEAR");
        }
    }
    initializeParams();
}

function initializeParams() {
    let parameterDiv = document.createElement('div');
    parameterDiv.id = "parameters";
    parameterDiv.style.display = "none";
    parameterDiv.style.marginLeft = "3%";
    parameterDiv.style.position = "fixed";
    parameterDiv.style.opacity = "0";
    globals.htmlIDs.unshift("parameters");
    function addParameter(name, inputContainer) {
        let par = document.createElement("div");
        par.display = "block";
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
    let updateIntervalS = createCustomSlider(1, 100, 'fpsSlider', "100%", Math.round(1000 / updateInterval), function () { changeUpdateInterval(Math.round(1000 / updateIntervalS.value)); }, (x) => Math.round(1000 / updateInterval));
    let algStepS = createCustomSlider(1, 6, 'algsteps', "100%", Math.round(Math.log10(globals.algStepInterval) + 1), function () { globals.algStepInterval = Math.pow(10, algStepS.value - 1); }, (x) => Math.pow(10, algStepS.value - 1));
    let startButton = createCustomButton('start', "Start", "100%", onStartButton);
    startButton.style.marginTop = "5px";
    // updateIntervalS.style.minWidth = "175px";
    addParameter("Desired TPS", updateIntervalS);
    addParameter("Generations Per Tick", algStepS);
    addParameter(null, createCustomCheckbox('bloomCb', false, "Bloom", function () { this.checkbox.checked ? context.disableBloom() : context.enableBloom(); }));
    addParameter(null, createCustomCheckbox('best', globals.showAllTimeBest, "Show Best Path", function () { globals.showAllTimeBest = !this.checkbox.checked }));
    addParameter(null, startButton);

    document.getElementById('content').appendChild(parameterDiv);
}

function initializeContent() {
    let content = document.getElementById('content');
    if (!content) {
        alert("unable to find div id=content, creating");
        content = document.createElement("div");
        document.body.appendChild(content);
    }
    content.style.alignContent = "center";
    content.style.textAlign = "center";
    content.style.display = "block";
    content.style.userSelect = "none";
    content.id = "content";
    content.ondragstart = function () { return false; };
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
    registerCustomSlider();
    registerCustomCheckbox();
    registerCustomButton();
    initializeCanvas();
    window.addEventListener("keydown", onKeyDown);
}

function draw() {
    context.fillStyle = globals.colorsExperimental[0];
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    if (alg.isRunning || alg.isFinished) {
        requestAnimationFrame(drawLines);
        context.fillStyle = globals.colorsExperimental[4];
    }
    requestAnimationFrame(drawPoints);

}

function drawPoints() {
    context.fillStyle = globals.colorsExperimental[1]
    for (let index = 0; index < alg.points.length; ++index) {
        context.fillRect(alg.points[index][0] - 1, alg.points[index][1] - 1, 3, 3);
    }
}

function drawLines() {
    if (globals.showAllTimeBest && alg.best.length > 0) {
        context.strokeStyle = globals.colorsExperimental[2];
        context.lineWidth = 2;
        context.moveTo(alg.points[alg.best[0]][0], alg.points[alg.best[0]][1]);
        context.beginPath();
        for (let index = 0; index < alg.best.length; ++index) {
            context.lineTo(alg.points[alg.best[index]][0], alg.points[alg.best[index]][1]);
            context.stroke();
        }
        context.closePath();
    }

    context.beginPath();
    context.strokeStyle = globals.colorsExperimental[3];
    context.lineWidth = 0.2;
    for (let iCity = 0; iCity < alg.points.length; ++iCity) {
        for (let jCity = 0; jCity < alg.points.length; ++jCity) {
            if (alg.pheromones[iCity][jCity] >= 20) {
                context.moveTo(alg.points[iCity][0], alg.points[iCity][1]);
                context.lineTo(alg.points[jCity][0], alg.points[jCity][1]);
                context.stroke();
            }
        }
    }
    context.closePath();

    // for (let index = 0; index <= alg.best.length; ++index) {

    // }
}

function update() {
    if (alg.isRunning) {
        for (let count = 0; count < globals.algStepInterval; ++count) {
            alg.step();
        }
    }
    if (alg.stepCount >= alg.generations || alg.isFinished) {
        alg.stop();
        document.getElementById("start").changeText("Reset");
        pause();
        return;
    }
    draw();
}

function updatePheromone() {
    return 0;
}

function placePoint(x, y) {
    if (alg.points.find((element) => element[0] == x && element[1] == y)) {
        console.log("Attempted to place already existing city");
        return;
    }
    alg.points.push([x, y]);
}

function onCanvasMouseMove(event) {
    if (!globals.toolButtonDown || alg.isFinished) {
        return false;
    }
    let rect = event.target.getBoundingClientRect();
    let x = Math.floor(event.clientX - rect.left), y = Math.floor(event.clientY - rect.top);
    // placePoint(x, y);
    globals.mousepos = [x, y];
}

function onCanvasMouseDown(event) {
    globals.toolButtonDown = true;
    if (alg.isFinished || alg.isRunning) {
        return;
    }
    let rect = event.target.getBoundingClientRect();
    let x = Math.floor(event.clientX - rect.left), y = Math.floor(event.clientY - rect.top);
    placePoint(x, y);
    // fitScoreBase = Math.floor(canvasWidth / 2 * alg.points.length);
    // requestAnimationFrame(drawPoints);
}

function onStartButton() {
    if (!alg.isRunning && !alg.isFinished) {
        if (!alg.start()) {
            return;
        }
        resume();
        this.changeText("Stop");
    }
    else if (alg.isFinished) {
        alg.reset();
        this.changeText("Start");
    } else if (alg.isRunning) {
        alg.isFinished = !(alg.isRunning = false);
    }

}

function onKeyDown(event) {
    if (/Space/.test(event.code) || event.which == 32) {
        // onPauseButtonClick();
        if (alg.isFinished) {
            event.preventDefault();
            return;
        } else if (globals.paused) {
            alg.step();
        }
        else {
            pause();
        }
        event.preventDefault();
    } else if (/Tab/.test(event.code) || event.which == 9) {
        event.preventDefault();
        let params = document.getElementById("parameters");
        if (params.updateIntervalId != null) {
            return true;
        }
        params.fadeStep = params.style.display == "none" ? 0.1 : -0.1;

        params.updateIntervalId = setInterval(paramsFade, 40, params);
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

function changeUpdateInterval(newUpdInt) {
    clearInterval(updateFunctionIntervalId);
    updateInterval = newUpdInt;
    updateFunctionIntervalId = setInterval(globals.paused ? draw : update, updateInterval);
}

function resume() {
    globals.paused = false;
    changeUpdateInterval(updateInterval);
}

function pause() {
    globals.paused = true;
    changeUpdateInterval(updateInterval);
}

function start() {
    globals = new Globals();
    initialize();
    alg = new Alg();
    updateFunctionIntervalId = setInterval(draw, updateInterval);
}

function exit() {
    removeElements();
    clearInterval(updateFunctionIntervalId);
}

start();




