var srcPath = "./resources/ants/";
var canvasWidth = 600;
var canvasHeight = 600;
var controlSize = "100px";
var controlSizeShrunk = "80px";
var toolMaxSize = 7;
var toolMinSize = 1;
var antStep = 1;
var pheromoneRadius = 3;
var pheromoneInitStrength = 100;
var pheromoneDecreasePerTick = 2;
var pheromoneExistThreshold = 20;
var showPheromones = true;
var antLimit = 150;
var maxSpawnAttemptDistance = 8;
var maxAntTravelDistance = 300;
var antSpawnChance = .5;
var antRandomMovementThreshold = 0.05;
var antVisionRadius = 2;
var antDespawnRate = 0.7;

var gridSize = 150;
var grid = [];
// var gridBuffer = [];
var antSpawners = [];
var ants = [];
var cells = []; //Хранит указатели на все объекты-содержимое (пока это только муравьи и спавнеры, причем муравьям идентификация не нужна, а значит и хендлеры не пригодятся)
var pheromones = [];
var cellWidth = canvasWidth / gridSize;
var cellHeight = canvasHeight / gridSize;
var updateInterval = 25;
var updateFunctionIntervalId;
var computedStyle;
var context;//2d context
var drawImage;//буфер рендера
var drawBuffer;//сама data буффера - height*with*4 
var sliderBackgroundColor = "#242424";
var sliderThumbColor = "#04AA6D";
var sliderThumbSize = 25;

class Globals {
    constructor() {
        this.paused = false;
        this.id = { empty: 0, spawner: 1, food: 2, wall: 3, ant: 4, pheromone: 5 };
        this.walkable = [this.id.empty, this.id.pheromone, this.id.ant];
        this.staticDrawable = [this.id.food, this.id.wall, this.id.spawner];
        this.behavior = { wander: 0, track: 1, return: 2 };
        // this.tools = { empty: 0, spawner: 1, food: 2, wall: 3 };
        this.colors = ["--onBackground", "--error", "#3fFF20", "#000000", "--primaryVariant", "#2c4c2c"];
        this.colorsExperimental = [];
        this.htmlControlsIDs = ["spawner", "food", "wall", "eraser"];
        this.htmlIDs = [];
        this.antCount = 0;
        this.spawnerDeletionFlags = 0;
        this.selectedTool = 0;
        this.selectedToolElement = null;
        this.eraseClickTimestamp = null;
        this.toolButtonDown = false;
        this.toolSize = 2;
        this.shiftKeyDown = false;
        this.shiftInitPos = { x: 0, y: 0 };
        this.bloom = false;
        this.mousepos = [];
        this.mouseLagComp = false;
    }
}
var globals = new Globals();

class Ant {
    constructor(initX, initY) {
        this.state = globals.behavior.wander;
        this.pos = { x: initX, y: initY };
        this.isCarryingFood = false;
        this.foundTarget = [];
        this.orientation = Math.floor(Math.random() * 8) % 8;// верх-низ-право-лево-диагонали        
        this.spawnerCoords = { x: initX, y: initY };
        this.travelDistance = 0;
        this.travelSteps = [];
    }
    placePheromones() {
        let x, y, dist;
        for (let dx = -pheromoneRadius; dx <= pheromoneRadius; ++dx) {
            for (let dy = -pheromoneRadius; dy <= pheromoneRadius; ++dy) {
                x = this.pos.x + dx, y = this.pos.y + dy, dist = Math.dist(x, y, this.pos.x, this.pos.y);
                if (!(x < gridSize && x > -1 && y < gridSize && y > -1) || dist > pheromoneRadius) {
                    continue;
                }
                else {
                    switch (grid[x][y]) {
                        case globals.id.empty:
                            pheromones.push(new Pheromone(x, y, Math.round(pheromoneInitStrength * Math.cos(Math.round(dist / pheromoneRadius * 100.0) / 100.0))));
                            cells[x][y] = pheromones[pheromones.length - 1];
                            grid[x][y] = globals.id.pheromone;
                            break;
                        case globals.id.pheromone:
                            cells[x][y].strength = Math.max(Math.round(pheromoneInitStrength * Math.cos(Math.round(dist / pheromoneRadius * 100.0) / 100.0)), cells[x][y].strength);
                            break;
                        default: break;
                    }
                }
            }
        }
    }
    checkAdjacentCells() {
        let x, y, dist;
        for (let dx = -antVisionRadius; dx <= antVisionRadius; ++dx) {
            for (let dy = -antVisionRadius; dy <= antVisionRadius; ++dy) {
                x = this.pos.x + dx, y = this.pos.y + dy, dist = Math.dist(x, y, this.pos.x, this.pos.y);
                if (!(x > -1 && x < gridSize && y > -1 && y < gridSize) || dist > antVisionRadius) {
                    continue;
                }
                switch (grid[x][y]) {
                    case globals.id.food:
                        if (dist < 2) {
                            this.isCarryingFood = true;
                            this.state = globals.behavior.return;
                            return true;
                        }

                        if (this.foundTarget.length > 0 && this.foundTarget[2] == globals.id.food && Math.dist(this.foundTarget[0], this.foundTarget[1], this.pos.x, this.pos.y) >= dist || this.foundTarget.length <= 0) {
                            this.foundTarget = [x, y, globals.id.food];
                            this.state = globals.behavior.track;
                        }
                        break;

                    case globals.id.pheromone:
                        if (this.foundTarget != food || this.state != globals.behavior.track) {
                            this.state = globals.behavior.track;
                            this.foundTarget = [x, y, globals.id.pheromone];
                        }
                        break;
                    default: break;
                }
            }
        }
    }
    turn() {
        switch (this.state) {
            case globals.behavior.wander:
                let dx, dy, turnAngleRad, x, y;
                let potentialMove = [];
                for (let angle = this.orientation - 1; angle < this.orientation + 2; ++angle) {//муравей имеет угол обзора в 3 из 8 направлений (ориентация +-1)
                    turnAngleRad = ((angle + 8) % 8) * (Math.PI / 4);
                    dx = Math.cos(turnAngleRad), dy = Math.sin(turnAngleRad);
                    dx = Math.sign(dx) * Math.round(Math.abs(dx) + 0.1), dy = Math.sign(dy) * Math.round(Math.abs(dy) + 0.1);
                    x = this.pos.x + dx, y = this.pos.y + dy;
                    // console.log(dx + " " + dy + " " + angle);
                    if (x < gridSize && x > -1 && y < gridSize && y > -1 && globals.walkable.includes(grid[x][y])) {
                        potentialMove.push([x, y]);
                    }
                }
                if (potentialMove.length <= 0 || Math.random() <= antRandomMovementThreshold) {
                    this.orientation = (this.orientation + Math.floor(Math.random() * 3)) % 8;
                    break;
                }
                let t = potentialMove[Math.floor(Math.random() * 5) % potentialMove.length];
                this.travelSteps.push(t);
                [this.pos.x, this.pos.y] = t;
                this.travelDistance += 1;
                if (this.travelDistance >= maxAntTravelDistance) {
                    this.state = globals.behavior.return;
                }
                this.checkAdjacentCells();
                break;
            case globals.behavior.track:
                this.state = globals.behavior.wander;
                // this.checkAdjacentCells();//
                // this.chooseNextMove; // - на основе antVisionRadius, проверяя все клетки, приоритезируя феромоны по какой-то формуле
                // а также еду на более близком расстоянии.
                break;
            case globals.behavior.return:
                if (this.isCarryingFood) {
                    this.placePheromones();
                }
                if (this.travelSteps.length > 0) {//Муравьи будут ходить через появившиеся за это время стены на пути домой, потом можно придумать решение, но алгоритм его не предусматривает
                    let index = this.travelSteps.length - 1;
                    [this.pos.x, this.pos.y] = this.travelSteps[index];
                    this.travelSteps.splice(index, 1);
                }
                else {
                    this.isCarryingFood = false;
                    this.state = globals.behavior.wander;
                    this.orientation = Math.floor(Math.random() * 8) % 8;
                    this.travelDistance = 0;
                }
                break;
            default: break;
        }

    }

}

class Spawner {
    constructor(initX, initY) {
        this.pos = { x: initX, y: initY };
        this.foodLevel = 100;
        this.updated = false;
        this.surrounded = false;
        this.deletionFlag = false;
    }
    spawnAnt() {
        let x = this.pos.x, y = this.pos.y;
        let xi, yi;
        for (let delta = 0; delta < Math.min(this.pos.x, this.pos.y, gridSize - this.pos.x, gridSize - this.pos.y, maxSpawnAttemptDistance); ++delta) {
            for (let dx = -1; dx < 2; ++dx) {
                for (let dy = -1; dy < 2; ++dy) {
                    xi = x + delta * dx, yi = y + delta * dy;
                    if (globals.walkable.includes(grid[xi][yi])) {
                        ants.push(new Ant(xi, yi));
                        // cells[xi][yi] = ants[ants.length - 1];
                        globals.antCount++;
                        // console.log("Successfuly spawned at " + String(ants[ants.length - 1].pos.x) + " " + String(ants[ants.length - 1].pos.y));
                        return true;
                    }
                }
            }
        }
        console.log("Failed to spawn from " + String(x) + " " + String(y));
        return false;
    }
    update() {
        if (this.updated) {
            return false;
        }

        let isSurrounded = true;
        let x, y;
        for (let dx = -1; dx < 2; ++dx) {
            for (let dy = -1; dy < 2; ++dy) {
                x = this.pos.x + dx, y = this.pos.y + dy;
                if (x < 0 || y < 0 || x > gridSize - 1 || y > gridSize - 1 || Math.abs(dx) == Math.abs(dy)) {
                    continue;
                }
                if (grid[x][y] == globals.id.spawner) {
                    cells[x][y].update();
                }
                else if (globals.walkable.includes(grid[x][y])) {
                    isSurrounded = false;
                }
            }
        }
        this.surrounded = isSurrounded;
        this.updated = true;
    }
    destroySelf() {
        grid[this.pos.x][this.pos.y] = globals.id.empty;
        cells[this.pos.x][this.pos.y] = null;
        this.deletionFlag = true;
        globals.spawnerDeletionFlags++;
    }
}

class Pheromone {
    constructor(initX, initY, initStrength) {
        this.pos = { x: initX, y: initY };
        this.strength = initStrength;
        // this.orientation = orientation;
    }
}

function cloneArray(to, from) {
    to = [];
    for (let index1 = 0; index1 < from.length; ++index1) {
        to[index1] = from[index1];
        for (let index2 = 0; index2 < from[index1].length; ++index2) {
            to[index1][index2] = from[index1][index2];
        }
    }
}

Math.dist = function (x, y, x1, y1) {
    return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
};

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

    cbContainer.className = "checkboxContainer";
    checkMark.className = "checkmark";
    checkbox.className = "checkbox";

    checkbox.type = "checkbox";
    checkbox.id = String(id);
    checkbox.checked = checked;

    cbContainer.innerText = String(text);
    // cbContainer.checked = checked;
    cbContainer.checkbox = checkbox;

    cbContainer.appendChild(checkbox);
    cbContainer.appendChild(checkMark);
    // cbContainer.addEventListener("mousedown", function () { this.checked = checkbox.checked; });
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
        document.addEventListener("mouseup", function () { globals.toolButtonDown = false; globals.mousepos = []; });
        canvas.addEventListener("mousemove", onCanvasMouseMove);
        globals.htmlIDs.unshift("grid");
    }
    context = canvas.getContext("2d");
    context.enableBloom = function () { context.canvas.style.filter = "url(" + srcPath + "bloom.svg" + "#bloom)" };
    context.disableBloom = function () { context.canvas.style.filter = "url()"; };

    drawImage = context.createImageData(canvasWidth, canvasHeight);
    drawBuffer = drawImage.data;
    for (const col of globals.colors) {
        let t = hexToRgb(col);
        if (t != null) {
            globals.colorsExperimental.push(t);
        } else {
            globals.colorsExperimental.push(hexToRgb(computedStyle.getPropertyValue(col).replace(/\s/g, '')));
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
    let antLimitS = createCustomSlider(0, 1000, 'antLimit', "100%", antLimit, function () { antLimit = antLimitS.value; }, (x) => antLimit);
    let pheromoneRadiusS = createCustomSlider(1, Math.round(gridSize / 10), 'pheromoneRadius', "100%", pheromoneRadius, function () { pheromoneRadius = pheromoneRadiusS.value; }, (x) => pheromoneRadius);
    let pheromoneInitStrengthS = createCustomSlider(1, 10, 'pheromoneInitStrength', "100%", pheromoneInitStrength, function () { pheromoneInitStrength = pheromoneInitStrengthS.value * 10; }, (x) => pheromoneInitStrength);
    let pheromoneDecreasePerTickS = createCustomSlider(1, 20, 'pheromoneDecrease', "100%", pheromoneDecreasePerTick, function () { pheromoneDecreasePerTick = pheromoneDecreasePerTickS.value / 10.0; }, (x) => pheromoneDecreasePerTick);
    let pheromoneExistThresholdS = createCustomSlider(1, 14, 'pheromoneThreshold', "100%", Math.round(pheromoneExistThreshold / 5), function () { pheromoneExistThreshold = pheromoneExistThresholdS.value * 5; }, (x) => pheromoneExistThreshold);
    let updateIntervalS = createCustomSlider(1, 200, 'fpsSlider', "100%", Math.round(updateInterval), function () { changeUpdateInterval(Math.round(1000 / updateIntervalS.value)); }, (x) => Math.round(1000 / updateInterval));

    addParameter("Ant Limit", antLimitS);
    addParameter("Desired TPS", updateIntervalS);
    addParameter("Pheromone Initial Strength", pheromoneInitStrengthS);
    addParameter("Pheromone Spread Radius", pheromoneRadiusS);
    addParameter("Pheromone Decrease per Tick", pheromoneDecreasePerTickS);
    addParameter("Pheromone Exist Threshold", pheromoneExistThresholdS);
    addParameter(null, createCustomCheckbox('bloomCb', globals.bloom, "Bloom", function () { this.checkbox.checked ? context.disableBloom() : context.enableBloom(); }));
    addParameter(null, createCustomCheckbox('mouselagCb', globals.mouseLagComp, "Fix Mouse Lag", function () { globals.mouseLagComp = !this.checkbox.checked; }));

    content.appendChild(parameterDiv);
}

function initializeContent() {
    let content = document.getElementById('content');
    if (!content) {
        alert("unable to find div id=content, creating");
        content = document.createElement("div");
        document.body.appendChild(content);
        //globals.htmlIDs.unshift("content");
    }
    content.style.alignContent = "center";
    content.style.textAlign = "center";
    content.style.display = "block";
    content.id = "content";
    content.ondragstart = function () { return false; };
    return content;
}

function initializeControls() {
    let content = document.getElementById('content');
    if (!content) {
        content = initializeContent();
    }

    let controls = document.getElementById("controls");
    if (controls) {
        controls.remove();
    }
    controls = document.createElement("div");
    controls.id = "controls";
    controls.style.display = "block";
    controls.style.textAlign = "center";
    controls.ondragstart = function () { return false; };
    globals.htmlIDs.unshift("controls");

    for (const element of globals.htmlControlsIDs) {
        let img = document.createElement('img');
        img.src = srcPath + element + ".png";
        img.id = element;
        img.addEventListener("mousedown", toolSelectionClick);
        if (element == "eraser") {
            img.addEventListener("dblclick", function () { antExit(); antStart(); });
        }
        img.ondragstart = function () { return false; };
        img.style.width = controlSize;
        img.style.height = controlSize;
        img.style.display = "inline-block";
        img.style.margin = "10px";
        img.style.userSelect = "none";
        controls.appendChild(img);
        globals.htmlIDs.unshift(element);
    }

    let tools = document.createElement("div");
    tools.id = "tools";
    tools.style.display = "block";
    tools.style.textAlign = "center";
    globals.htmlIDs.unshift("tools");

    let pauseButton = document.createElement("img");
    pauseButton.src = srcPath + "pause.png";
    pauseButton.style.height = pauseButton.style.width = "20px";
    pauseButton.style.display = "inline-block";
    pauseButton.style.marginLeft = "3px";
    pauseButton.id = "pause";
    pauseButton.addEventListener("click", onPauseButtonClick);

    toolSizeSlider = createCustomSlider(toolMinSize, toolMaxSize, 'toolSizeSlider', controlSize * globals.htmlControlsIDs.length, globals.toolSize, function () { globals.toolSize = Number(toolSizeSlider.value); console.log(globals.toolSize) });

    tools.appendChild(toolSizeSlider);
    tools.appendChild(pauseButton);
    controls.appendChild(tools);
    content.appendChild(controls);

    //footer fix
    let ff = document.createElement('div');
    ff.display = "block";
    ff.style.minHeight = String(Math.round(document.getElementsByTagName('footer')[0].clientHeight * 1.1)) + "px";
    ff.innerHTML = "&nbsp;";
    controls.appendChild(ff);
    //    

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", function (event) { globals.shiftKeyDown *= !(event.code.indexOf("Shift") >= 0); });
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
    grid = [];
    gridBuffer = [];
    antSpawners = [];
    ants = [];
    cells = [];
    computedStyle = getComputedStyle(document.body);
    for (let x = 0; x < gridSize; ++x) {
        grid[x] = [];
        gridBuffer[x] = [];
        cells[x] = [];
        for (let y = 0; y < gridSize; ++y) {
            grid[x][y] = globals.id.empty;
            gridBuffer[x][y] = globals.id.empty;
            cells[x][y] = null;
        }
    }
    registerCustomSlider();
    registerCustomCheckbox();
    initializeCanvas();
    initializeControls();
}

function draw() {

    function fill(x, y, width, height, color) {
        let index;
        for (let xx = x; xx < x + width; ++xx) {
            for (let yy = y; yy < y + height; ++yy) {
                index = 4 * (canvasWidth * yy + xx);
                drawBuffer[index + 0] = color.r;
                drawBuffer[index + 1] = color.g;
                drawBuffer[index + 2] = color.b;
                drawBuffer[index + 3] = color.a;
            }
        }
    }



    fill(0, 0, canvasWidth, canvasHeight, globals.colorsExperimental[globals.id.empty]);

    for (let x = 0; x < gridSize; ++x) {
        for (let y = 0; y < gridSize; ++y) {
            if (globals.staticDrawable.includes(grid[x][y])) {
                fill(x * cellWidth, y * cellHeight, cellWidth, cellHeight, globals.colorsExperimental[grid[x][y]]);
            }
        }
    }

    if (showPheromones) {
        let colorCoeff;
        for (let index = 0; index < pheromones.length; ++index) {
            colorCoeff = pheromones[index].strength / pheromoneInitStrength * 255;
            fill(pheromones[index].pos.x * cellWidth, pheromones[index].pos.y * cellHeight, cellWidth, cellHeight, { r: colorCoeff * 0.4, g: colorCoeff * 0.5, b: colorCoeff, a: Math.sin(colorCoeff / 300) * 255 });
        }
    }

    for (let index = 0; index < ants.length; ++index) {
        fill(ants[index].pos.x * cellWidth, ants[index].pos.y * cellHeight, cellWidth, cellHeight, globals.colorsExperimental[globals.id.ant]);
    }

    // cloneArray(gridBuffer, grid);
    context.putImageData(drawImage, 0, 0);//Swap ДБ
}

function update() {
    if (globals.paused) {
        return true;
    }
    antLogic();
    pheromoneTick();
    draw();
}

function placeCellCluster(x, y) {
    let left = Math.max(x - globals.toolSize, 0);
    let right = Math.min(x + globals.toolSize, gridSize - 1);
    let YarikDown = Math.max(y - globals.toolSize, 0);
    let up = Math.min(y + globals.toolSize, gridSize - 1);
    for (let xi = left; xi < right; ++xi) {
        for (let yi = YarikDown; yi < up; ++yi) {
            if (grid[xi][yi] == globals.id.spawner) {
                cells[xi][yi].destroySelf();
            }
            switch (globals.selectedTool) {
                case 1:
                    antSpawners.push(new Spawner(xi, yi));
                    cells[xi][yi] = antSpawners[antSpawners.length - 1];
                    grid[xi][yi] = globals.id.spawner;
                    // console.log(String(xi) + " " + String(yi));
                    break;
                case 0:
                    grid[xi][yi] = globals.selectedTool;
                    cells[xi][yi] = null;
                    break;
                default:
                    grid[xi][yi] = globals.selectedTool;
                    break;
            }
        }
    }
}

function plotLine(x0, y0, x1, y1) {
    if (Math.abs(y1 - y0) < Math.abs(x1 - x0))
        if (x0 > x1)
            plotLineLow(x1, y1, x0, y0)
        else
            plotLineLow(x0, y0, x1, y1)
    else
        if (y0 > y1)
            plotLineHigh(x1, y1, x0, y0)
        else
            plotLineHigh(x0, y0, x1, y1)
}

function plotLineLow(x0, y0, x1, y1) {
    let dx = x1 - x0
    let dy = y1 - y0
    let yi = 1
    if (dy < 0) {
        yi = -1
        dy = -dy
    }
    let D = (2 * dy) - dx
    let y = y0;

    for (let x = x0; x < x1; ++x) {
        placeCellCluster(x, y);
        if (D > 0) {
            y += yi;
            D += 2 * (dy - dx);
        }
        else {
            D += 2 * dy;
        }
    }
}

function plotLineHigh(x0, y0, x1, y1) {
    let dx = x1 - x0
    let dy = y1 - y0
    let xi = 1
    if (dx < 0) {
        xi = -1
        dx = -dx
    }
    let D = (2 * dx) - dy
    x = x0
    for (let y = y0; y < y1; ++y) {
        placeCellCluster(x, y);
        if (D > 0) {
            x += xi;
            D += 2 * (dx - dy);
        } else {
            D += 2 * dx;
        }
    }
}

function onCanvasMouseMove(event) {
    if (!globals.toolButtonDown) {
        return false;
    }
    let rect = event.target.getBoundingClientRect();
    let x = Math.floor((event.clientX - rect.left) / cellWidth), y = Math.floor((event.clientY - rect.top) / cellHeight);
    if (globals.shiftKeyDown) {
        if (Math.abs(globals.shiftInitPos.x - x) > Math.abs(globals.shiftInitPos.y - y)) {
            y = globals.shiftInitPos.y;
        }
        else {
            x = globals.shiftInitPos.x;
        }
    }
    if (globals.mouseLagComp) {
        plotLine(x, y, globals.mousepos[0], globals.mousepos[1]);
        globals.mousepos = [x, y];
    }
    placeCellCluster(x, y);
    //console.log(String(Math.floor((event.pageX - this.offsetLeft) / cellWidth)) + " " + String(Math.floor((event.pageY - this.offsetTop) / cellHeight)));

}

function onCanvasMouseDown(event) {
    globals.toolButtonDown = true;
    let rect = event.target.getBoundingClientRect();
    let x = Math.floor((event.clientX - rect.left) / cellWidth), y = Math.floor((event.clientY - rect.top) / cellHeight);
    if (globals.shiftKeyDown) {
        globals.shiftInitPos = { x: x, y: y };
    }
    placeCellCluster(x, y);
}

function onKeyDown(event) {
    globals.shiftKeyDown = (/Shift/.test(event.code));
    if (/Digit[1234]/.test(event.code)) {
        let num = Number(String(event.code)[5]);
        globals.selectedTool = (num) % globals.htmlControlsIDs.length;

        if (globals.selectedToolElement) {
            globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSize;
        }
        globals.selectedToolElement = document.getElementById(globals.htmlControlsIDs[num - 1]);
        globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSizeShrunk;
    }
    else if (/Space/.test(event.code)) {
        onPauseButtonClick();
        event.preventDefault();
    } else if (/Tab/.test(event.code)) {
        let params = document.getElementById("parameters");
        event.preventDefault();
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

function toolSelectionClick(event) {
    let target = event.target;
    globals.selectedTool = (globals.htmlControlsIDs.indexOf(event.target.id) + 1) % globals.htmlControlsIDs.length;

    if (globals.selectedToolElement) {
        globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSize;
    }
    globals.selectedToolElement = target;
    target.style.width = target.style.height = controlSizeShrunk;

    console.log(globals.htmlControlsIDs[globals.selectedTool - 1]);
}

function antLogic() {
    for (let index = 0; index < ants.length; ++index) {
        ants[index].turn();
    }

    if (globals.antCount < antLimit && antSpawners.length > 0 && Math.random() < antSpawnChance) {
        let num = Math.floor(Math.random() * antSpawners.length * 3) % antSpawners.length;
        if (antSpawners[num].deletionFlag) {
            do {
                antSpawners.splice(num, 1);
                num = Math.floor(Math.random() * antSpawners.length * 3) % antSpawners.length;
            }
            while (antSpawners.length > 0 && (antSpawners[num].deletionFlag));
        }
        if (antSpawners.length > 0 && !antSpawners[num].deletionFlag && !antSpawners[num].isSurrounded) {
            antSpawners[num].spawnAnt();
        }
    } else if (globals.antCount > antLimit) {
        while (Math.random() < antDespawnRate && globals.antCount > antLimit && ants.length > 0) {
            ants.splice(Math.floor(Math.random() * ants.length * 3) % ants.length, 1);
            globals.antCount--;
        }
    }
    // signal
    // for (var x = 0; x < gridSize; x = x + 1) {
    //     for (var y = 0; y < gridSize; ++y) {
    //         // adjust reference
    //         grid[x][y].ant = gridBuffer[x][y].ant;
    //         if (grid[x][y].has_ant() && grid[x][y].ant.isCarryingFood) {
    //             boundedX = get_bounded_index(x);
    //             boundedY = get_bounded_index(y);
    //             var signal_strength = 1 - Math.pow(0.5, 1 / calc_distance(x, y, boundedX, boundedY));
    //             grid[boundedX][boundedY].signal += signal_strength;
    //             // is the ant near the nest with food? drop food
    //             if (i < 5 && y < 5) {
    //                 grid[x][y].ant.isCarryingFood = false;
    //             }
    //         }
    //         else {
    //             grid[x][y].signal *= 0.95;
    //         }
    //         if (grid[x][y].signal < 0.05) {
    //             grid[x][y].signal = 0;
    //         }
    //     }
    // }    
}

function pheromoneTick() {
    for (let index = 0; index < pheromones.length; ++index) {
        pheromones[index].strength -= pheromoneDecreasePerTick;
        if (pheromones[index].strength < pheromoneExistThreshold) {
            cells[pheromones[index].pos.x][pheromones[index].pos.y] = null;
            grid[pheromones[index].pos.x][pheromones[index].pos.y] = globals.id.empty;
            pheromones.splice(index, 1);
        }
    }
}

function changeUpdateInterval(newUpdInt) {
    clearInterval(updateFunctionIntervalId);
    updateInterval = newUpdInt;
    updateFunctionIntervalId = setInterval(globals.paused == true ? draw : update, updateInterval);
}

function pauseAnts() {
    clearInterval(updateFunctionIntervalId);
    updateFunctionIntervalId = setInterval(draw, updateInterval);
    globals.paused = true;
}

function resumeAnts() {
    clearInterval(updateFunctionIntervalId);
    updateFunctionIntervalId = setInterval(update, updateInterval);
    globals.paused = false;
}

function onPauseButtonClick() {
    if (globals.paused) {
        resumeAnts();
        document.getElementById("pause").src = srcPath + "pause.png";
    }
    else {
        pauseAnts();
        document.getElementById("pause").src = srcPath + "resume.png";
    }
}

function antStart() {
    initialize();
    updateFunctionIntervalId = setInterval(update, updateInterval);
}

function antExit() {
    removeElements();
    clearInterval(updateFunctionIntervalId);
    grid = [];
    gridBuffer = [];
    antSpawners = [];
    ants = [];
    cells = [];
    pheromones = [];
    globals = new Globals();
}

antStart();




