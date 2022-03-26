var srcPath = "./resources/ants/";
var canvasWidth = 900;
var canvasHeight = 600;
var fitScoreBase = 1;

var updateInterval = 125;
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
        this.colors = ["--onBackground", "#3fFF20", "--pheromones", "#FFFFFF"];
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
        this.populationSampleSize = 50;
        this.randomMutationChance = 0.005;
        this.points = [];
        this.population = [];
        this.best = [];
        this.best.fitScore = -1;
        this.generationBest = [];
        this.generationBest.fitScore = -1;

        this.dist = function (point1, point2) { return (point1[0] - point2[0]) * (point1[0] - point2[0]) + (point1[1] - point2[1]) * (point1[1] - point2[1]); }
    }

    reset() {
        this.stepCount = 0;
        this.isRunning = false;
        this.isFinished = false;
        this.population = [];
        this.points = [];
        this.best = [];
        this.best.fitScore = -1;
    }

    step() {
        do {
            this.generateNextPopulation();
            this.stepCount++;
        } while (this.stepCount % globals.algStepInterval);
        this.stepCount = 0;

    }

    start() {
        if (this.isRunning || this.points.length <= 1 || this.isFinished) {
            return false;
        }

        let fs, fsTotal = 0;
        for (let index = 0; index < this.populationSampleSize; ++index) {
            this.population[index] = [];
            this.population[index].clone(this.points);
            this.population[index].shuffle();
            fs = this.getFitnessScore(this.population[index]);
            if (fs > this.best.fitScore) {
                this.best.clone(this.population[index]);
                this.best.fitScore = fs;
            }
            this.population[index].fitScore = fs;
            fsTotal += fs;
        }
        this.normalizePopulationFitnessScores(fsTotal);
        return this.isRunning = true;
    }


    generateNextPopulation() {
        let population = [], fs1, fs2, fsTotal;
        this.generationBest.fitScore = -1;
        let index = 0, half = Math.floor(this.populationSampleSize / 2);
        for (; index <= half; ++index) {
            population[index] = this.pickPathByFitness();
        }
        for (; index < this.populationSampleSize - 1; ++index) {
            if (((index - half) % 2)) {
                [population[index], population[index + 1]] = this.crossover(population[Math.floor(Math.random() * 3 * half) % half], population[Math.floor(Math.random() * 3 * half) % half]);
            }
            this.mutate(population[index]);
            this.mutate(population[index - half]);
            fs1 = this.getFitnessScore(population[index]);
            if (fs1 > this.best.fitScore) {//Отдельные функции не выделялись, потому что дорогие вычисления fitness score, копипаста по той же причине
                this.best.clone(population[index]);
                this.best.fitScore = fs1;
                this.generationBest.clone(population[index]);
                this.generationBest.fitScore = fs1;
            }
            else if (fs1 > this.generationBest.fitScore) {
                this.generationBest.clone(population[index]);
                this.generationBest.fitScore = fs1;
            }
            if (fs2 > this.best.fitScore) {
                this.best.clone(population[index - half]);
                this.best.fitScore = fs2;
                this.generationBest.clone(population[index - half]);
                this.generationBest.fitScore = fs2;
            }
            else if (fs2 > this.generationBest.fitScore) {
                this.generationBest.clone(population[index - half]);
                this.generationBest.fitScore = fs2;
            }
            population[index].fitScore = fs1;
            population[index - half].fitScore = fs2;
            if (isNaN(population[index].fitScore)) {
                this.isRunning = false;
            }
            fsTotal += fs1 + fs2;
        }
        if (this.populationSampleSize % 2) {
            fs1 = this.getFitnessScore(population[half - 1]);
            if (fs1 > this.best.fitScore) {
                this.best.clone(population[index]);
                this.best.fitScore = fs1;
                this.generationBest.clone(population[index]);
                this.generationBest.fitScore = fs1;
            }
            else if (fs1 > this.generationBest.fitScore) {
                this.generationBest.clone(population[index]);
                this.generationBest.fitScore = fs1;
            }
            population[half - 1].fitScore = fs1;
            fsTotal += fs1;
        }
        this.population = population;
        this.normalizePopulationFitnessScores(fsTotal);
    }

    getFitnessScore(path) {
        let length = 0;
        for (let index = 0; index < path.length; ++index) {
            length += this.dist(path[index], path[(index + 1) % path.length]);
        }
        return fitScoreBase / length;
    }

    normalizePopulationFitnessScores(total) {
        for (let index = 0; index < this.population.length; ++index) {
            this.population[index].fitScore /= total;
        }
    }

    pickPathByFitness() {
        let rand = Math.random(), index = 0;
        while (index < this.population.length && rand > 0) {
            rand -= this.population[index++].fitScore;
        }

        return this.population[index - 1];
    }

    mutate(path) {
        if (Math.random() < this.randomMutationChance) {
            path.swap(Math.floor(Math.random() * 3 * path.length) % path.length, Math.floor(Math.random() * 3 * path.length) % path.length);
        }
    }

    crossover(parent1, parent2, left, right) {
        //partially mapped crossover:
        // let left, right;
        // left = Math.floor(Math.random() * this.parent1.length * 3) % this.parent1.length;
        // right = Math.floor(Math.random() * this.parent1.length * 3) % this.parent1.length;
        if (right < left) {
            left += right;
            right = left - right;
            left -= right;
        }
        let offspring = [[], []];
        let section = [new Map(), new Map()];
        offspring[0].clone(parent1);
        offspring[1].clone(parent2);

        for (let index = left; index < right + 1; ++index) {
            section[0].set(parent1[index], parent2[index]);
            section[1].set(parent2[index], parent1[index]);
            offspring[0][index] = parent2[index];
            offspring[1][index] = parent1[index];
        }

        for (let index = 0, element; index < parent1.length; ++index) {
            if (index == left) {
                index = right;
                continue;
            }
            if (!section[1].has(parent1[index])) {
                offspring[0][index] = parent1[index];
            } else {
                element = section[1].get(parent1[index]);
                while (section[1].has(element)) {
                    element = section[1].get(element);
                }
                offspring[0][index] = element;
            }
            if (!section[0].has(parent2[index])) {
                offspring[1][index] = parent2[index];
            } else {
                element = section[0].get(parent2[index]);
                while (section[0].has(element)) {
                    element = section[0].get(element);
                }
                offspring[1][index] = element;
            }

        }
        return offspring;
        //order crossover
        //cycle crossover
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
    var styleSheet = document.createElement('style');
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
        height: 17px;
        width: 17px;        
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
    styleSheet.innerText = checkboxStyle;
    styleSheet.id = "checkbox-styles";
    document.head.appendChild(styleSheet);
    globals.htmlIDs.unshift("checkbox-styles");
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

    drawImage = context.createImageData(canvasWidth, canvasHeight);
    drawBuffer = drawImage.data;
    for (const col of globals.colors) {
        if (col[0] != '-') {
            globals.colorsExperimental.push(col);
        } else {
            globals.colorsExperimental.push(computedStyle.getPropertyValue(col).replace(/\s/g, ''));
            if (globals.colorsExperimental[globals.colorsExperimental.length - 1] == null) {
                console.error("UNABLE TO PARSE COLOR \"", col, "\" RENDERER ERRORS WILL APPEAR");
            }
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
    let updateIntervalS = createCustomSlider(1, 200, 'fpsSlider', "100%", Math.round(1000 / updateInterval), function () { changeUpdateInterval(Math.round(1000 / updateIntervalS.value)); }, (x) => Math.round(1000 / updateInterval));
    let algStepS = createCustomSlider(1, 6, 'algsteps', "100%", Math.round(Math.log10(globals.algStepInterval)), function () { globals.algStepInterval = Math.pow(10, algStepS.value - 1); }, (x) => Math.pow(10, algStepS.value - 1));
    // updateIntervalS.style.minWidth = "175px";
    addParameter("Desired TPS", updateIntervalS);
    addParameter(null, createCustomCheckbox('bloomCb', false, "Bloom", function () { this.checkbox.checked ? context.disableBloom() : context.enableBloom(); }));
    addParameter(null, createCustomCheckbox('atb', globals.showAllTimeBest, "Show All Time Best", function () { globals.showAllTimeBest = !this.checkbox.checked; }));
    addParameter(null, createCustomCheckbox('start', false, "Start", onStartButton));
    addParameter("Alg Steps Per Tick", algStepS);

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
    initializeCanvas();
    window.addEventListener("keydown", onKeyDown);
}

function draw() {
    context.fillStyle = globals.colorsExperimental[0];
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    if (alg.isRunning || alg.isFinished) {
        requestAnimationFrame(drawLines);
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
    if (globals.showAllTimeBest) {
        context.strokeStyle = globals.colorsExperimental[2];
        context.lineWidth = 2;
        context.moveTo(alg.best[0][0][0], alg.best[0][0][1]);
        context.beginPath();
        for (let index = 0; index <= alg.best.length; ++index) {
            context.lineTo(alg.best[(index + 1) % alg.best.length][0], alg.best[(index + 1) % alg.best.length][1])
            context.stroke();
        }
    }

    context.strokeStyle = globals.colorsExperimental[3];
    context.lineWidth = 0.2;
    context.moveTo(alg.generationBest[0][0][0], alg.generationBest[0][0][1]);
    context.beginPath();
    for (let index = 0; index <= alg.best.length; ++index) {
        context.lineTo(alg.generationBest[(index + 1) % alg.generationBest.length][0], alg.generationBest[(index + 1) % alg.generationBest.length][1])
        context.stroke();
    }
}

function update() {
    if (alg.isRunning) {
        alg.step();
    } else if (alg.isFinished) {
        document.getElementById("start").changeText("Reset");
        pause();
    }
    draw();
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
    this.checkbox.checked = true;

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




