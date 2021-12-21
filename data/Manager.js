const fs = require("fs");

class Manager {
    constructor() {}
}

class ConstantManager extends Manager {
    constructor(data) {
        super();
        this.gameName = data.gameName;
    }
}

class MapManager extends Manager {
    constructor(data) {
        super();
        this.id = data.id;
        this.fields = {};
        data.fields.forEach((field) => {
            this.fields[`${field[0]}_${field[1]}`] = {
                x: field[0],
                y: field[1],
                description: field[2],
                canGo: field[3],
                fieldType:field[4],
                events: field[5]
            };
        });
    }
    getField(x, y) {
        return this.fields[`${x}_${y}`];
    }
}
const constantManager = new ConstantManager(
    JSON.parse(fs.readFileSync(__dirname + "/constants.json"))
);

const mapManager = new MapManager(
    JSON.parse(fs.readFileSync(__dirname + "/map.json"))
);
module.exports = {
    constantManager,
    mapManager,
};
