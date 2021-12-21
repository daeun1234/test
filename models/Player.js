const mongoose = require("mongoose");
const { Schema } = mongoose;

const schema = new Schema({
    name: String, //캐릭터 네임
    level: { type: Number, default: 1 }, //레벨
    exp: { type: Number, default: 0 },
    maxHP: { type: Number, default: 10 }, //최대 HP
    HP: { type: Number, default: 10 }, //현재 HP
    str: { type: Number, default: 5 }, //공격력
    itemStr: { type: Number, default: 0 }, //아이템 공격력
    def: { type: Number, default: 5 }, //방어력
    itemDef: { type: Number, default: 0 }, //아이템 방어력
    x: { type: Number, default: 0, max: 9 }, //맵의 x좌표
    y: { type: Number, default: 0, max: 9 }, //맵의 y좌표,
    teeth: {type: Number, default: 0}, //가진 이빨 개수,
    // items : {type: Array, default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}, //0~10:아이템, 11:공룡이빨, -> 착용, 해제를 적용하기 위해선 하나의 컬럼으로는 부족
    email: String,
    items: [{ type: Schema.Types.ObjectId, ref: 'Inventory' }],
});

schema.methods.incrementHP = function (val) {
    const hp = this.HP + val;
    this.HP = Math.min(Math.max(0, hp), this.maxHP);
};

schema.methods.incrementExp = function (val) {
    const exp = this.exp + val;
    let lvUp = parseInt(exp/10);
    for (let i=lvUp; i>0; i--) {
        this.exp = this.exp - 10;
        this.level += 1;
        this.str += Math.floor(Math.random()*(3)) + 2;
        this.def += Math.floor(Math.random()*(6)) + 2;
    }
}

const Player = mongoose.model("Player", schema);

module.exports = Player

