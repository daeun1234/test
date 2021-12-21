const mongoose = require("mongoose");
const { Schema } = mongoose;


const schema = new Schema({
  player : { type: Schema.Types.ObjectId, ref: 'Player' }, //플레이어의 닉네임은 고유값이므로 pk 값 처럼 사용
  itemId: Number, //json의 아이템 id를 받아와 저장
  name: String,
  //cnt: Number, //장비는 항상 1개, 소비는 여러개가 들어갈 수 있음, 소비는 사용하면 cnt가 줄어듬
  have: Boolean, // 보유중인지
  wear: Boolean //해당 아이템의 착용 유무를 표시, 소비는 항상 false
})

const Inventory = mongoose.model("Inventory", schema)

module.exports = Inventory

