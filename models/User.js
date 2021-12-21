const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    email: {type: String, unique: true, },//이메일
    password: String, //패스워드
    key: String, // 인증 해쉬값
});

const User = mongoose.model('User', userSchema);

module.exports = User;