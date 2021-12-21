const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    player: { type: Schema.Types.ObjectId, ref: 'Player', unique: true },
    fields: [
        {
            x: Number,
            y: Number,
            descriptions: Array,
            canGo: Array,
            fieldType: String,
        },
    ],
});

const Map = mongoose.model('map', schema);

module.exports = {
    Map,
};