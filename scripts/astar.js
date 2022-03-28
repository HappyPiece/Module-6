var srcPath = "./resources/astar/";
var canvasWidth = 600;
var canvasHeight = 600;
var controlSize = "80px";
var controlSizeShrunk = "70px";

var gridSize = 75;
var grid = [];
var cellWidth = canvasWidth / gridSize;
var cellHeight = canvasHeight / gridSize;
var updateInterval = 125;
var updateFunctionIntervalId;
var prioritizeOpenDistance = false;
var computedStyle;
var context;//2d context
var drawImage;//буфер рендера
var drawBuffer;//сама data буффера - height*with*4 
var sliderBackgroundColor = "#242424";
var sliderThumbColor = "#04AA6D";
var sliderThumbSize = 25;
var algSteps = 1;
var dynamicSteps = false;
var globals;

class Globals {
    constructor() {
        this.paused = true;
        this.id = { empty: 0, wall: 1, start: 2, end: 3, visited: 4, open: 5, path: 6 };
        this.tools = { start: 0, end: 1, wall: 2, eraser: 3 };
        this.colors = ["#2a2a2a", "--background", "#3fFF20", "--error", "--primary", "#facf46", "--pheromones"];
        this.colorsExperimental = [];
        this.htmlControlsIDs = ["start", "end", "wall", "eraser"];
        this.htmlIDs = [];
        this.selectedTool = this.tools.start;
        this.selectedToolElement = null;
        this.eraseClickTimestamp = null;
        this.toolButtonDown = false;
        this.toolSize = 1;
        this.shiftKeyDown = false;
        this.shiftInitPos = { x: 0, y: 0 };
        this.bloom = false;
        this.mousepos = [];
    }
}

class Cell {
    constructor(x, y) {
        this.value = globals.id.empty;
        this.pos = [x, y];
        this.gVal = null;
        this.hVal = null;
        this.cost = null;
        this.parent = null;
        this.isVisited = false;
        this.isEvaluated = false;
    }
}

class Alg {
    constructor() {
        this.open = [];
        this.stepCount = 0;
        this.startingPoint = null;
        this.endingPoint = null;
        this.distDiag = 14;
        this.distCells = 10;
        this.isFinished = false;
        this.currentBackTrack = null;
    }

    reset() {
        this.open = [];
        this.stepCount = 0;
        if (this.startingPoint) {
            this.startingPoint.value = globals.id.empty;
        }
        if (this.endingPoint) {
            this.endingPoint.value = globals.id.empty;
        }
        this.currentBackTrack = null;
        this.startingPoint = null;
        this.endingPoint = null;
        this.isFinished = false;
    }

    calcDist(x, y, x1, y1) {//среднее из расстояния манхаттэна и среза по диагонали квадрата дает адекватные сокращения пути на открытом пространстве
        //(в таком случае он все равно ставит в приоритет прямые линии, однако на расстоянии диагонали квадрата между точками будет использовать ее)

        //но алгоритм становится медленнее и в лабиринтах это мало влияет, так как увеличивает область поиска, требуя при этом больше банальных вычислений
        //Вообще баланс между областью поиска и скоростью достижения цели - краеугольный камень алгоритма

        //для простоты и скорости убрать усреднение с alt
        let xdiff = Math.abs(x - x1), ydiff = Math.abs(y - y1);
        let alt = xdiff * this.distCells + ydiff * this.distCells;
        if (xdiff < ydiff)
            return (xdiff * this.distDiag + (ydiff - xdiff) * this.distCells + alt) / 2;
        else
            return (ydiff * this.distDiag + (xdiff - ydiff) * this.distCells + alt) / 2;

        // return Math.ceil(Math.dist(x, y, x1, y1)) * 10;
    }

    cantAccess(x1, y1, x2, y2) {
        return (x1 != x2 && y1 != y2) && (grid[x1][y2].value == globals.id.wall || grid[x2][y1].value == globals.id.wall);
    }

    iterateNeighbors(cell) {
        for (let x = cell.pos[0] - 1; x < cell.pos[0] + 2; ++x) {
            for (let y = cell.pos[1] - 1; y < cell.pos[1] + 2; ++y) {
                if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || x == cell.pos[0] && y == cell.pos[1] || grid[x][y].value == globals.id.wall || grid[x][y].isEvaluated || this.cantAccess(x, y, cell.pos[0], cell.pos[1])) {
                    continue;
                }
                let cost, gVal, hVal;

                hVal = this.calcDist(x, y, this.endingPoint.pos[0], this.endingPoint.pos[1]);
                gVal = prioritizeOpenDistance * cell.gVal + ((x != cell.pos[0] && y != cell.pos[1]) ? this.distDiag : this.distCells);//this.calcDist(x, y, cell.pos[0], cell.pos[1]);
                cost = gVal + hVal;
                if (!grid[x][y].isVisited || grid[x][y].cost && grid[x][y].cost > cost) {
                    grid[x][y].parent = cell;
                    grid[x][y].hVal = hVal;
                    grid[x][y].gVal = gVal;
                    grid[x][y].cost = cost;
                    if (!grid[x][y].isVisited) {
                        this.open.push(grid[x][y]);
                        grid[x][y].isVisited = true;
                        grid[x][y].value = globals.id.open;
                    }
                }
            }
        }
    }

    begin() {
        for (let x = 0; x < gridSize; ++x) {
            for (let y = 0; y < gridSize; ++y) {
                grid[x][y].isVisited = false;
                grid[x][y].isEvaluated = false;
                grid[x][y].parent = null;
            }
        }
        this.open.push(this.startingPoint);
        document.getElementById("begin").changeText(globals.paused ? "Continue" : "Stop");
    }

    step() {
        if (this.startingPoint == null | this.endingPoint == null) {
            alert("specify starting and ending points first");
            pause();
            return;
        }
        if (this.stepCount == 0) {
            this.begin();
            this.stepCount++;
            return;
        } else if (this.isFinished) {
            if (this.startingPoint.value == globals.id.start) {
                return;
            }
            if (!this.currentBackTrack) {
                this.currentBackTrack = this.endingPoint.parent;
                this.endingPoint.value = globals.id.start;
            } else if (this.currentBackTrack.pos == this.startingPoint.pos) {
                this.currentBackTrack.value = globals.id.start;
                pause();
                document.getElementById('begin').changeText("Restart");
            } else {
                this.currentBackTrack.value = globals.id.path;
                this.currentBackTrack = this.currentBackTrack.parent;
            }
            return;
        }
        if (dynamicSteps && this.open.length) {
            algSteps = this.open.length - 1;
        }
        do {
            if (this.open.length <= 0) {
                alert("Couldn't find path");
                this.startingPoint.value = globals.id.end;
                pause();
                document.getElementById('begin').changeText("Restart");
                this.isFinished = true;
                return;
            }
            let foundIndex = 0;
            for (let index = 1; index < this.open.length; ++index) {
                if (this.open[index].cost < this.open[foundIndex].cost) {
                    foundIndex = index;
                }
            }
            let current = this.open[foundIndex];
            this.open.swapDelete(foundIndex);
            current.isEvaluated = true;

            if (current.pos == this.endingPoint.pos) {
                this.isFinished = true;
                return;
            }
            this.iterateNeighbors(current);
            current.value = globals.id.visited;
            // this.open.sort((a, b) => a.cost - b.cost);
        } while (this.stepCount++ % algSteps || this.isFinished);
    }

}
alg = new Alg();

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

Array.prototype.swapDelete = function (index) {
    this[index] = this[this.length - 1];
    this.pop();
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

function initializeCanvas() {
    let canvas = document.getElementById("grid");
    initializeContent();
    let cuntent = document.getElementById('content');
    if (canvas == null) {
        canvas = document.createElement('canvas');
        canvas.id = "grid";
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.display = "inline";
        canvas.style.border = "0.2vmin solid" + computedStyle.getPropertyValue("--primary");
        // canvas.style.alignSelf = "center";        
        cuntent.appendChild(canvas);
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
        let t = hexToRgb(col);
        if (t != null) {
            globals.colorsExperimental.push(t);
        } else {
            globals.colorsExperimental.push(hexToRgb(computedStyle.getPropertyValue(col).replace(/\s/g, '')));
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
    updateIntervalS.style.minWidth = "175px";
    let gridSizeS = createCustomSlider(1, 5, 'gridResize', "100%", Math.round(gridSize / 25), function () { resizeGrid(this.value < 5 ? Math.round(this.value * 25) : 600); }, (x) => gridSize);
    let begin = createCustomButton('begin', "Begin Pathfinding", "100%", onStartButton);
    begin.style.marginTop = "5px";
    addParameter("Desired TPS", updateIntervalS);
    addParameter("Grid Size", gridSizeS);
    addParameter(null, createCustomCheckbox('bloomCb', false, "Bloom", function () { this.checkbox.checked ? context.disableBloom() : context.enableBloom(); }));
    addParameter(null, createCustomCheckbox('generate', false, "Generate Maze", function () { this.checkbox.checked = true; alg.reset(); grid.clearGrid(); grid.genMaze(); }));
    addParameter(null, createCustomCheckbox('openDist', false, "Faster", function () { if (globals.paused == false) this.checkbox.checked = !this.checkbox.checked; else prioritizeOpenDistance = this.checkbox.checked; }));
    addParameter(null, begin);

    document.getElementById('content').appendChild(parameterDiv);
}

function initializeContent() {
    let cuntent = document.getElementById('content');
    if (!cuntent) {
        alert("unable to find div id=content, creating");
        cuntent = document.createElement("div");
        document.body.appendChild(cuntent);
        //globals.htmlIDs.unshift("content");
    }
    cuntent.style.alignContent = "center";
    cuntent.style.textAlign = "center";
    cuntent.style.display = "block";
    cuntent.style.userSelect = "none";
    cuntent.id = "content";
    cuntent.ondragstart = function () { return false; };
    return cuntent;
}

function initializeControls() {
    let cuntent = document.getElementById('content');
    if (!cuntent) {
        cuntent = initializeContent();
    }

    let controls = document.getElementById("controls");
    if (controls) {
        controls.remove();
    }
    controls = document.createElement("div");
    controls.id = "controls";
    controls.style.display = "inline-flex";
    controls.style.textAlign = "center";
    controls.style.marginRight = "3%";
    // controls.style.marginTop = "2%";
    // controls.style.position = "fixed";
    controls.style.flexDirection = "column";
    controls.style.alignItems = "center";
    // controls.style.left = "12%";
    controls.style.verticalAlign = "top";

    controls.ondragstart = function () { return false; };
    globals.htmlIDs.unshift("controls");

    for (const element of globals.htmlControlsIDs) {
        let img = document.createElement('img');
        img.src = srcPath + element + ".png";
        img.id = element;
        img.addEventListener("mousedown", toolSelectionClick);
        if (element == "eraser") {
            img.addEventListener("dblclick", function () { exit(); start(); });
        }
        img.ondragstart = function () { return false; };
        img.style.width = controlSize;
        img.style.height = controlSize;
        img.style.display = "block";
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

    // let pauseButton = document.createElement("img");
    // pauseButton.src = srcPath + "pause.png";
    // pauseButton.style.height = pauseButton.style.width = "20px";
    // pauseButton.style.display = "inline-block";
    // pauseButton.style.marginLeft = "3px";
    // pauseButton.id = "pause";
    // pauseButton.addEventListener("click", onPauseButtonClick);

    // toolSizeSlider = createCustomSlider(toolMinSize, toolMaxSize, 'toolSizeSlider', controlSize * globals.htmlControlsIDs.length, globals.toolSize, function () { globals.toolSize = Number(toolSizeSlider.value); console.log(globals.toolSize) });

    // tools.appendChild(toolSizeSlider);
    // tools.appendChild(pauseButton);
    controls.appendChild(tools);
    //cuntent.insertBefore(controls, document.getElementById('grid'));
    document.getElementById('parameters').appendChild(controls);

    //footer fix
    // let ff = document.createElement('div');
    // ff.display = "block";
    // ff.style.minHeight = String(Math.round(document.getElementsByTagName('footer')[0].clientHeight * 1.1)) + "px";
    // ff.innerHTML = "&nbsp;";
    // controls.appendChild(ff);
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
    computedStyle = getComputedStyle(document.body);
    for (let x = 0; x < gridSize; ++x) {
        grid[x] = [];
        for (let y = 0; y < gridSize; ++y) {
            grid[x][y] = new Cell(x, y);
        }
    }

    registerCustomSlider();
    registerCustomCheckbox();
    registerCustomButton();
    initializeCanvas();
    initializeControls();
}

grid.clearGrid = function () {
    for (let x = 0; x < gridSize; ++x) {
        for (let y = 0; y < gridSize; ++y) {
            if (grid[x][y].value != globals.id.wall && grid[x][y].value != globals.id.empty) {
                grid[x][y].value = globals.id.empty;
            }
            grid[x][y].isVisited = false;
            grid[x][y].isEvaluated = false;
        }
    }
}

grid.genMaze = function () {
    console.log("generating maze");
    let walls = [], rooms = [];
    for (let x = 0; x < gridSize; ++x) {
        for (let y = 0; y < gridSize; ++y) {
            grid[x][y].value = !(x % 2) | !(y % 2) | x == gridSize - 1 | y == gridSize - 1;
            if (grid[x][y].value && x % 2 != y % 2) {
                walls.push(grid[x][y]);
                grid[x][y].isVisited = false;
            } else if ((x % 2) * (y % 2)) {
                rooms.push(grid[x][y]);
            }
        }
    }
    let includedWalls = [];
    includedWalls.addRoomWalls = function (room) {
        for (let x = room.pos[0] - 1; x < room.pos[0] + 2; ++x) {
            for (let y = room.pos[1] - 1; y < room.pos[1] + 2; ++y) {
                if (x % 2 == y % 2 || x <= 0 || x >= gridSize - 1 || y <= 0 || y >= gridSize - 1) {
                    continue;
                }
                this.push(grid[x][y]);
            }
        }
    }

    let index = Math.floor(Math.random() * 3 * rooms.length) % rooms.length;
    rooms[index].isVisited = true;
    includedWalls.addRoomWalls(rooms[index]);
    let wall, room1, room2;
    while (includedWalls.length) {
        index = Math.floor(Math.random() * 3 * includedWalls.length) % includedWalls.length;
        wall = includedWalls[index];
        room1 = grid[wall.pos[0] - !(wall.pos[0] % 2)][wall.pos[1] - !(wall.pos[1] % 2)];
        room2 = grid[wall.pos[0] + !(wall.pos[0] % 2)][wall.pos[1] + !(wall.pos[1] % 2)];
        if (room1.isVisited != room2.isVisited) {
            wall.value = globals.id.empty;
            if (!room2.isVisited) {
                room1 = room2;
            }
            room1.isVisited = true;
            includedWalls.addRoomWalls(room1);
        }
        includedWalls.splice(index, 1);
    }
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
            if (grid[x][y].value != globals.id.empty) {
                fill(x * cellWidth, y * cellHeight, cellWidth, cellHeight, globals.colorsExperimental[grid[x][y].value]);
            }
        }
    }

    context.putImageData(drawImage, 0, 0);//Swap ДБ
}

function update() {
    alg.step();
    draw();
}

function placeCellCluster(x, y) {
    // if (alg.stepCount && !globals.paused && (grid[x][y].value == globals.id.start || grid[x][y].value == globals.id.end)) {
    //     alert("stop the algorithm to change the environment");
    //     return;
    // }
    if (grid[x][y].value == globals.id.start) {
        alg.startingPoint = null;
    } else if (grid[x][y].value == globals.id.end) {
        alg.endingPoint = null;
    }

    switch (globals.selectedTool) {
        case globals.id.start:
            if (alg.startingPoint && alg.startingPoint.value == globals.id.start) {
                alg.startingPoint.value = globals.id.empty;
            }
            grid[x][y].value = globals.id.start;
            alg.startingPoint = grid[x][y];
            break;
        case globals.id.end:
            if (alg.endingPoint && alg.endingPoint.value == globals.id.end) {
                alg.endingPoint.value = globals.id.empty;
            }
            grid[x][y].value = globals.id.end;
            alg.endingPoint = grid[x][y];
            break;
        case globals.id.wall:
            grid[x][y].value = globals.id.wall;
            break;
        case globals.id.empty:
            grid[x][y].value = globals.id.empty;
            console.log(x, y);
            break;
        default:
            // grid[x][y].value = globals.selectedTool;
            alert("unknown tool");
            break;
    }

}

function onCanvasMouseMove(event) {
    if (!globals.toolButtonDown || alg.isFinished) {
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
    // if (globals.mousepos.length > 0) {
    //     let beginX = Math.min(globals.mousepos[0], x), beginY = Math.min(globals.mousepos[1], y);
    //     let endX = Math.max(globals.mousepos[0], x), endY = Math.max(globals.mousepos[1], y);
    //     let c = 0;
    //     // console.log("X: ", beginX, endX);
    //     // console.log("Y: ", beginY, endY);
    //     for (let lineY = beginY; lineY < endY && c < 100; ++lineY) {
    //         for (let lineX = beginX; lineX < endX && c < 100; ++lineX) {
    //             lineX = (lineY - beginY) * (endX - beginX) / (endY - beginY) + beginX;
    //             // console.log(lineX, lineY);
    //             if (lineX >= gridSize || lineY >= gridSize) {
    //                 return;
    //             }
    //             placeCellCluster(lineX, lineY);
    //             c++
    //         }
    //     }
    // }
    // globals.mousepos = [x, y];
    // placeCellCluster(x, y);
    //console.log(String(Math.floor((event.pageX - this.offsetLeft) / cellWidth)) + " " + String(Math.floor((event.pageY - this.offsetTop) / cellHeight)));
    if (globals.mousepos) {
        plotLine(x, y, globals.mousepos[0], globals.mousepos[1]);
    }
    placeCellCluster(x, y);
    globals.mousepos = [x, y];
}

function onCanvasMouseDown(event) {
    globals.toolButtonDown = true;
    if (alg.isFinished) {
        return;
    }
    let rect = event.target.getBoundingClientRect();
    let x = Math.floor((event.clientX - rect.left) / cellWidth), y = Math.floor((event.clientY - rect.top) / cellHeight);
    if (globals.shiftKeyDown) {
        globals.shiftInitPos = { x: x, y: y };
    }
    placeCellCluster(x, y);
}

function onStartButton() {
    if (alg.isFinished) {
        alg.reset();
        grid.clearGrid();
        pause();
        return;
    }
    if (globals.paused) {
        resume();
    } else {
        pause();
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

function onKeyDown(event) {
    globals.shiftKeyDown = (/Shift/.test(event.code));
    if (/Digit[1234]/.test(event.code) || 48 < event.which && event.which < 53) {
        selectTool(Number(event.which - 49));
    }
    else if (/Space/.test(event.code) || event.which == 32) {
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

function toolSelectionClick(event) {
    let target = event.target;
    selectTool(globals.htmlControlsIDs.indexOf(event.target.id));
}

function selectTool(toolId) {
    switch (toolId) {
        case globals.tools.start:
            globals.selectedTool = globals.id.start;
            break;
        case globals.tools.end:
            globals.selectedTool = globals.id.end;
            break;
        case globals.tools.wall:
            globals.selectedTool = globals.id.wall;
            break;
        case globals.tools.eraser:
            globals.selectedTool = globals.id.empty;
            break;
        default: break;
    }

    if (globals.selectedToolElement) {
        globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSize;
    }
    globals.selectedToolElement = document.getElementById(globals.htmlControlsIDs[toolId]);
    globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSizeShrunk;

}

function changeUpdateInterval(newUpdInt) {
    clearInterval(updateFunctionIntervalId);
    updateInterval = newUpdInt;
    updateFunctionIntervalId = setInterval(globals.paused ? draw : update, updateInterval);
}

function resizeGrid(newSize) {
    let x = 0, y = gridSize;

    while (newSize > grid.length) {
        y = gridSize;
        if (x >= gridSize) {
            grid.push([]);
            y = 0;
        }
        while (newSize > grid[x].length) {
            grid[x].push(new Cell(x, y));
            y++;
        }
        x++
    }

    grid.length = newSize;
    if (newSize < gridSize) {
        for (let x = 0; x < newSize; ++x) {
            grid[x].length = newSize;
        }
    }
    gridSize = newSize;

    cellWidth = Math.round(canvasWidth / gridSize);
    cellHeight = Math.round(canvasHeight / gridSize);
}

function resume() {
    globals.paused = false;
    changeUpdateInterval(updateInterval);
    document.getElementById("begin").changeText("Stop");
}

function pause() {
    globals.paused = true;
    clearInterval(updateFunctionIntervalId);
    updateFunctionIntervalId = setInterval(draw, updateInterval);
    document.getElementById("begin").changeText("Continue");
}

function start() {
    globals = new Globals();
    initialize();
    alg = new Alg();
    updateFunctionIntervalId = setInterval(draw, updateInterval);
    let search = new Audio(srcPath + 'search.wav');
    search.play();
}

function exit() {
    removeElements();
    clearInterval(updateFunctionIntervalId);
}

start();




