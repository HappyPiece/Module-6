var srcPath = "./resources/ants/";
var canvasWidth = 600;
var canvasHeight = 600;
var controlSize = "100px";
var controlSizeShrunk = "80px";
var toolMaxSize = 7;
var toolMinSize = 1;
var antStep = 1;
var pheromoneRadius = 1;
var pheromoneInitStrength = 100;
var antLimit = 150;
var signalInitialStrength = 100;
var maxSpawnAttemptDistance = 8;
var maxAntTravelDistance = 100;
var antSpawnChance = 0.5;
var antRandomMovementThreshold = 0.1;


var gridSize = 150;
var grid = [];
var gridBuffer = [];
var antSpawners = [];
var ants = [];
var cells = []; //Хранит указатели на все объекты-содержимое (пока это только муравьи и спавнеры, причем муравьям идентификация не нужна, а значит и хендлеры не пригодятся)
var pheromones = [];
var cellWidth = canvasWidth / gridSize;
var cellHeight = canvasHeight / gridSize;
var updateInterval = 30;
var updateFunctionIntervalId;

class Globals {
    constructor() {
        this.paused = false;
        this.id = { empty: 0, spawner: 1, food: 2, wall: 3, ant: 4, pheromone: 5 };
        this.walkable = [this.id.empty, this.id.pheromone, this.id.ant];
        this.staticDrawable = [this.id.food, this.id.wall, this.id.spawner];
        this.behavior = { wander: 0, track: 1, return: 2 };
        // this.tools = { empty: 0, spawner: 1, food: 2, wall: 3 };
        this.colors = ["#E5E5E5", "#8b8b8b", "#a5e314", "#000000", "#008b8b", "#2c4c2c"];
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
    }
}
var globals = new Globals();


class Ant {
    constructor(initX, initY) {
        this.state = globals.behavior.wander;
        this.pos = { x: initX, y: initY };
        this.isCarryingFood = false;
        this.isBusy = false;
        this.lastSignal = 0;
        this.orientation = Math.floor(Math.random() * 8) % 8;// верх-низ-право-лево-диагонали        
        this.spawnerCoords = { x: initX, y: initY };
        this.travelDistance = 0;
    }
    // randomMove() {
    //     // var x = Math.random() * antStep; x = Math.floor(x * 2 - x);
    //     // var y = Math.random() * antStep; y = Math.floor(y * 2 - y);
    //     var x = this.pos.x + Math.floor(Math.random() * 3 * antStep) % (antStep * 2 + 1) - antStep;
    //     var y = this.pos.y + Math.floor(Math.random() * 3 * antStep) % (antStep * 2 + 1) - antStep;
    //     x = Math.max(Math.min(x, gridSize - 1), 0);
    //     y = Math.max(Math.min(y, gridSize - 1), 0);
    //     if (grid[x][y] == globals.id.empty) {
    //         this.pos.x = x;
    //         this.pos.y = y;
    //     }
    // }
    // moveTo(x, y) {
    //     x = Math.max(Math.min(x, gridSize - 1), 0);
    //     y = Math.max(Math.min(y, gridSize - 1), 0);
    //     if (grid[x][y] == globals.id.empty) {
    //         this.pos.x = x;
    //         this.pos.y = y;
    //     }
    // }
    placePheromones() {
        var x, y;
        for (var dx = -pheromoneRadius; dx <= pheromoneRadius; ++dx) {
            for (var dy = -pheromoneRadius; dy <= pheromoneRadius; ++dy) {
                x = this.pos.x + dx, y = this.pos.y + dy;
                if (!(x < gridSize && x > -1 && y < gridSize && y > -1)) {
                    continue;
                }
                else {
                    switch (grid[x][y]) {
                        case globals.id.empty:
                            pheromones.push(new Pheromone(x, y, this.orientation));
                            cells[x][y] = pheromones[pheromones.length - 1];
                            grid[x][y] = globals.id.pheromone;
                            break;
                        case globals.id.pheromone:
                            break;
                        default: break;
                    }
                }
            }
        }
    }
    turn() {
        //this.checkPheromones();
        switch (this.state) {
            case globals.behavior.wander:
                var dx, dy, turnAngleRad, x, y;
                var potentialMove = []
                for (var angle = this.orientation - 1; angle < this.orientation + 2; ++angle) {//муравей имеет угол обзора в 3 из 8 направлений (ориентация +-1)
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
                var t = potentialMove[Math.floor(Math.random() * 5) % potentialMove.length];
                x = t[0], y = t[1];
                this.placePheromones();
                this.pos.x = x;
                this.pos.y = y;
                this.travelDistance += 1;
                if (this.travelDistance >= maxAntTravelDistance) {
                    this.travelDistance = 0;
                    this.state = globals.behavior.return;
                }
                break;
            case globals.behavior.track:

                break;
            case globals.behavior.return:
                if (this.isCarryingFood) {
                    //возвращается и оставляет феромоны
                }
                this.pos.x += Math.sign(this.spawnerCoords.x - this.pos.x);
                this.pos.y += Math.sign(this.spawnerCoords.y - this.pos.y);
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
        var x = this.pos.x, y = this.pos.y;
        var xi, yi;
        for (var delta = 0; delta < Math.min(this.pos.x, this.pos.y, gridSize - this.pos.x, gridSize - this.pos.y, maxSpawnAttemptDistance); ++delta) {
            for (var dx = -1; dx < 2; ++dx) {
                for (var dy = -1; dy < 2; ++dy) {
                    xi = x + delta * dx, yi = y + delta * dy;
                    if (globals.walkable.includes(grid[xi][yi])) {
                        ants.push(new Ant(xi, yi));
                        // cells[xi][yi] = ants[ants.length - 1];
                        globals.antCount++;
                        console.log("Successfuly spawned at " + String(ants[ants.length - 1].pos.x) + " " + String(ants[ants.length - 1].pos.y));
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

        var isSurrounded = true;
        var x, y;
        for (var dx = -1; dx < 2; ++dx) {
            for (var dy = -1; dy < 2; ++dy) {
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
    }
    destroySelf() {
        grid[this.pos.x][this.pos.y] = globals.id.empty;
        cells[this.pos.x][this.pos.y] = null;
        this.deletionFlag = true;
        globals.spawnerDeletionFlags++;
    }
}

class Pheromone {
    constructor(initX, initY, orientation) {
        this.pos = { x: initX, y: initY };
        this.strength = pheromoneInitStrength;
        this.orientation = orientation;
    }
}
// class Cell{
//     constructor(){
//         this.contents = null;
//     }
// }

// Math.toRadians = function (deg) {
//     return deg * Math.PI / 180;
// }

// Math.toDegrees = function (rad) {
//     return rad * 180 / Math.PI;
// }

function cloneArray(to, from) {
    to = [];
    for (var index1 = 0; index1 < from.length; ++index1) {
        to[index1] = from[index1];
        for (var index2 = 0; index2 < from[index1].length; ++index2) {
            to[index1][index2] = from[index1][index2];
        }
    }
}


function initializeCanvas() {
    var canvas = document.getElementById("grid")
    if (canvas == null) {
        canvas = document.createElement('canvas');
        canvas.id = "grid";
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.display = "inline";
        // canvas.style.alignSelf = "center";
        initializeContent();
        var content = document.getElementById('content');
        content.appendChild(canvas);
        // canvas.addEventListener("click", onCanvasClicked);
        canvas.addEventListener("mousedown", onCanvasMouseDown);
        document.addEventListener("mouseup", function () { globals.toolButtonDown = false; });
        canvas.addEventListener("mousemove", onCanvasMouseMove);
        globals.htmlIDs.unshift("grid");
    }
}
//Может ломать сайт из-за display block, нужен тест
function initializeContent() {
    var content = document.getElementById('content');
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
    var content = document.getElementById('content');
    if (!content) {
        content = initializeContent();
    }

    var controls = document.getElementById("controls");
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
        var img = document.createElement('img');
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

    var tools = document.createElement("div");
    tools.id = "tools";
    tools.style.display = "block";
    tools.style.textAlign = "center";
    globals.htmlIDs.unshift("tools");

    //<input type="range" min="1" max="3" value="2" class="slider" id="myRange"></input>
    // .slider {
    //     -webkit-appearance: none;
    //     width: 100%;
    //     height: 25px;
    //     background: #d3d3d3;
    //     outline: none;
    //     opacity: 0.7;
    //     -webkit-transition: .2s;
    //     transition: opacity .2s;
    //   }

    //   .slider:hover {
    //     opacity: 1;
    //   }

    //   .slider::-webkit-slider-thumb {
    //     -webkit-appearance: none;
    //     appearance: none;
    //     width: 25px;
    //     height: 25px;
    //     background: #04AA6D;
    //     cursor: pointer;
    //   }

    //   .slider::-moz-range-thumb {
    //     width: 25px;
    //     height: 25px;
    //     background: #04AA6D;
    //     cursor: pointer;
    //   }
    var toolSizeSlider = document.createElement("input");
    toolSizeSlider.className = "toolSizeSlider";
    toolSizeSlider.type = "range";
    toolSizeSlider.min = String(toolMinSize);
    toolSizeSlider.max = String(toolMaxSize);
    toolSizeSlider.value = String(globals.toolSize);
    toolSizeSlider.id = "toolSize";
    toolSizeSlider.style.appearance = "none";
    toolSizeSlider.style.width = String(controlSize * globals.htmlControlsIDs.length) + "px";
    toolSizeSlider.style.height = "20px";
    toolSizeSlider.style.alignSelf = "center";
    toolSizeSlider.style.background = "#d3d3d3";
    toolSizeSlider.style.outline = "none";
    toolSizeSlider.style.textAlign = "center";
    toolSizeSlider.style.opacity = "0.7";
    toolSizeSlider.style.transition = "opacity .2s";
    toolSizeSlider.addEventListener("mouseenter", function () { toolSizeSlider.style.opacity = "1"; });
    toolSizeSlider.addEventListener("mouseleave", function () { toolSizeSlider.style.opacity = "0.7"; });
    toolSizeSlider.addEventListener("change", function () { globals.toolSize = Number(toolSizeSlider.value); console.log(globals.toolSize) });
    var pauseButton = document.createElement("img");
    pauseButton.src = srcPath + "pause.png";
    pauseButton.style.height = pauseButton.style.width = "20px";
    pauseButton.style.display = "inline-block";
    pauseButton.style.marginLeft = "3px";
    pauseButton.id = "pause";
    pauseButton.addEventListener("click", onPauseButtonClick);

    tools.appendChild(toolSizeSlider);
    tools.appendChild(pauseButton);
    controls.appendChild(tools);
    content.appendChild(controls);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", function (event) { globals.shiftKeyDown *= !(event.code.indexOf("Shift") >= 0); });

}

function removeElements() {
    function notFoundAlert(el) {
        alert("element id=" + el + " not found, unable to delete");
    }
    for (const element of globals.htmlIDs) {
        var el = document.getElementById(element);
        if (!el) {
            notFoundAlert(element)
            continue;
        }
        el.remove();
    }
    globals.htmlIDs = [];
}


//Главная функция инициализации компонентов
function initialize() {
    grid = [];
    gridBuffer = [];
    antSpawners = [];
    ants = [];
    cells = [];
    for (var x = 0; x < gridSize; ++x) {
        grid[x] = [];
        gridBuffer[x] = [];
        cells[x] = [];
        for (var y = 0; y < gridSize; ++y) {
            grid[x][y] = globals.id.empty;
            gridBuffer[x][y] = globals.id.empty;
            cells[x][y] = null;
        }
    }
    initializeCanvas();
    initializeControls();
}

function draw() {// Функция отрисовки украдена из первой же ссылки в гугле, потому что я хз, как самому такое придумать.
    var context = document.getElementById("grid").getContext("2d");

    function fill(x, y, width, height, color) {
        context.clearRect(x, y, width, height);
        context.fillStyle = color;
        context.fillRect(x, y, width, height);
    }

    fill(0, 0, canvasWidth, canvasHeight, globals.colors[globals.id.empty]);

    for (var x = 0; x < gridSize; ++x) {
        for (var y = 0; y < gridSize; ++y) {
            if (gridBuffer[x][y] != grid[x][y] && globals.staticDrawable.includes(grid[x][y])) {
                fill(x * cellWidth, y * cellHeight, cellWidth, cellHeight, globals.colors[grid[x][y]]);
                // console.log("filled");
            }
        }
    }
    for (var index = 0; index < ants.length; ++index) {
        fill(ants[index].pos.x * cellWidth, ants[index].pos.y * cellHeight, cellWidth, cellHeight, globals.colors[globals.id.ant]);
    }

    cloneArray(gridBuffer, grid);
}//Теоретический конец копипасты



//--------------------------------------------------------------
//--------------    А дальше уже свое видимо    ----------------




function update() {
    antLogic();
    // check_for_food();
    // sense_signal();
    draw();
}

function updatePaused() {
    draw();
}

function placeCellCluster(x, y) {
    var left = Math.max(x - globals.toolSize, 0);
    var right = Math.min(x + globals.toolSize, gridSize - 1);
    var YarikDown = Math.max(y - globals.toolSize, 0);
    var up = Math.min(y + globals.toolSize, gridSize - 1);
    for (var xi = left; xi < right; ++xi) {
        for (var yi = YarikDown; yi < up; ++yi) {
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
                    break;
                default:
                    grid[xi][yi] = globals.selectedTool;
                    break;
            }
        }
    }
}


function onCanvasMouseMove(event) {
    if (!globals.toolButtonDown) {
        return false;
    }

    var x = Math.floor((event.pageX - this.offsetLeft) / cellWidth), y = Math.floor((event.pageY - this.offsetTop) / cellHeight);
    if (globals.shiftKeyDown) {
        if (Math.abs(globals.shiftInitPos.x - x) > Math.abs(globals.shiftInitPos.y - y)) {
            y = globals.shiftInitPos.y;
        }
        else {
            x = globals.shiftInitPos.x;
        }
    }
    placeCellCluster(x, y);
    //console.log(String(Math.floor((event.pageX - this.offsetLeft) / cellWidth)) + " " + String(Math.floor((event.pageY - this.offsetTop) / cellHeight)));

}

function onCanvasMouseDown(event) {
    globals.toolButtonDown = true;
    if (globals.shiftKeyDown) {
        globals.shiftInitPos = { x: Math.floor((event.pageX - this.offsetLeft) / cellWidth), y: Math.floor((event.pageY - this.offsetTop) / cellHeight) };
        // console.log(globals.shiftKeyDown);
        // console.log(globals.shiftInitPos);
    }

    var x = Math.floor((event.pageX - this.offsetLeft) / cellWidth), y = Math.floor((event.pageY - this.offsetTop) / cellHeight);
    placeCellCluster(x, y);
}

function onKeyDown(event) {
    globals.shiftKeyDown = (/Shift/.test(event.code));
    if (/Digit[1234]/.test(event.code)) {
        var num = Number(String(event.code)[5]);
        globals.selectedTool = (num) % globals.htmlControlsIDs.length;

        if (globals.selectedToolElement) {
            globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSize;
        }
        globals.selectedToolElement = document.getElementById(globals.htmlControlsIDs[num - 1]);
        globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSizeShrunk;
    }
    else if (/Space/.test(event.code)) {
        onPauseButtonClick();
    }
}

function toolSelectionClick(event) {
    var target = event.target;
    globals.selectedTool = (globals.htmlControlsIDs.indexOf(event.target.id) + 1) % globals.htmlControlsIDs.length;

    if (globals.selectedToolElement) {
        globals.selectedToolElement.style.width = globals.selectedToolElement.style.height = controlSize;
    }
    globals.selectedToolElement = target;
    target.style.width = target.style.height = controlSizeShrunk;

    console.log(globals.htmlControlsIDs[globals.selectedTool - 1]);
}

// function sense_signal() {
//     for (var x = 0; x < gridSize; ++x) {
//         for (var y = 0; y < gridSize; ++y) {
//             if (grid[x][y].has_ant()) {
//                 grid[x][y].ant.lastSignal = grid[x][y].signal;
//             }
//         }
//     }
// }

function antLogic() {
    for (var index = 0; index < ants.length; ++index) {
        ants[index].turn();
    }

    if (globals.antCount < antLimit && antSpawners.length > 0 && Math.random() < antSpawnChance) {
        var num = Math.floor(Math.random() * antSpawners.length * 3) % antSpawners.length;
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


// function get_coords_from_orientation(x, y) {
//     var coords = [];
//     var orientation_radians = Math.toRadians(grid[x][y].ant.orientation)
//     coords.push(get_bounded_index(Math.round(x + Math.cos(orientation_radians))));
//     coords.push(get_bounded_index(Math.round(y + Math.sin(orientation_radians))));
//     return coords;
// }

// function move_ant(x, y) {
//     var new_coords, j, jj;
//     if (grid[x][y].ant.isCarryingFood) {
//         var current_distance = calc_distance_to_nest(x, y);
//         do {
//             grid[i][y].ant.orientation = Math.random() * 360;
//             new_coords = get_coords_from_orientation(x, y);
//             j = new_coords[0];
//             jj = new_coords[1];
//         } while (calc_distance_to_nest(j, jj) >= current_distance);
//     }
//     else {
//         // random movement in case there is no signal
//         new_coords = get_coords_from_orientation(i, y);
//         j = new_coords[0];
//         jj = new_coords[1];
//         grid[x][y].ant.orientation += Math.random() * 45 - 22.5;
//         // let's check for some signal
//         var last = grid[x][y].ant.lastSignal;
//         var current;
//         var min = 0;
//         var max = 0;
//         for (var n_i = x - 1; n_i <= x + 1; n_i++) {
//             for (var n_index1 = y - 1; n_index1 <= y + 1; n_index1++) {
//                 bounded_n_i = get_bounded_index(n_i);
//                 bounded_n_index1 = get_bounded_index(n_index1);
//                 current = grid[bounded_n_i][bounded_n_index1].signal;
//                 if (current.signal == 0) {
//                     continue;
//                 }
//                 var diff = last - current;
//                 if (last == 0) {
//                     if (diff < min) {
//                         j = bounded_n_i;
//                         jj = bounded_n_index1;
//                     }
//                 }
//                 else {
//                     if (diff > max) {
//                         j = bounded_n_i;
//                         jj = bounded_n_index1;
//                     }
//                 }
//             }
//         }
//     }
//     // some randomness
//     if (Math.random() < 0.05) {
//         new_coords = get_random_coordinates(x, y);
//         j = new_coords[0];
//         jj = new_coords[1];
//     }
//     // now that we have new coords:
//     if (!gridBuffer[j][jj].has_ant()) {
//         // adjust reference
//         gridBuffer[j][jj].ant = gridBuffer[x][y].ant;
//         gridBuffer[x][y].ant = null;
//     }
// }

// function calc_distance(i, index1, j, jj) {
//     return Math.pow(Math.pow(Math.abs(i - j), 2) + Math.pow(Math.abs(index1 - jj), 2), 0.5);
// }

// function calc_distance_to_nest(i, index1) {
//     return calc_distance(i, index1, 0, 0);
// }

// function get_random_coordinates(i, index1) {
//     var j = get_random_int(i - 1, i + 1);
//     var jj = get_random_int(index1 - 1, index1 + 1);
//     j = get_bounded_index(j);
//     jj = get_bounded_index(jj);
//     return [j, jj];
// }

// function check_for_food(i, index1) {
//     for (var i = 0; i < gridSize; i = i + 1) {
//         for (var index1 = 0; index1 < gridSize; ++y) {
//             if (grid[i][index1].has_ant() && !grid[i][index1].ant.isCarryingFood) {
//                 if (grid[i][index1].food > 0) {
//                     grid[i][index1].ant.isCarryingFood = true;
//                     grid[i][index1].food--;
//                 }
//             }
//         }
//     }
// }



// function get_random_int(min, max) {
//     return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// function get_bounded_index(index) {
//     var bounded_index = index;
//     if (index < 0) {
//         bounded_index = 0;
//     }
//     if (index >= gridSize) {
//         bounded_index = gridSize - 1;
//     }
//     return bounded_index;
// }


function antStart() {
    initialize();
    updateFunctionIntervalId = setInterval(update, updateInterval);// автовызов update через updateInterval мс
}

function changeUpdateInterval() {
    clearInterval(updateFunctionIntervalId);
    updateFunctionIntervalId = setInterval(update, updateInterval);
}

function pauseAnts() {
    clearInterval(updateFunctionIntervalId);
    updateFunctionIntervalId = setInterval(updatePaused, updateInterval);
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

function antExit() {
    removeElements();
    clearInterval(updateFunctionIntervalId);
    grid = [];
    gridBuffer = [];
    antSpawners = [];
    ants = [];
    cells = [];
    globals = new Globals();
}

antStart()


//Спавнеры будут обладать флагом canSpawn

//Когда ставят новую группу, каждый спавнер в группе получает update

//Каждый спавнер по соседству с обновленным также получит update

//Если спавнер окружен со всех сторон, он объявляется нерабочим.

//Для этого придется переписать архитектуру мира - он должен быть из блоков, у каждого из которых будет хендл к объекту-содержимому

//При этом объекты также будут сгруппированы в свои списки по типу и рендериться только через них (не нужен рендер всей сетки)