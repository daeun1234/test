const express = require('express');
const app = express();
const mongoose = require('mongoose');
const port = 3000;

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const { constantManager, mapManager } = require('./data/Manager');
const dinos = require('./data/monster.json');
const eventsJson = require('./data/events.json')
const itemsJson = require('./data/items.json')
const { User, Player, Inventory } = require('./models');
const { encryptPassword, setAuth } = require('./utils');


//json처리
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


//몽고 DB 연결
const mongoURL = 'mongodb+srv://test0:test0@testmongo.xir8z.mongodb.net/gameServer?retryWrites=true&w=majority';
mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected!!!')
}).catch(err => {
    console.log(err)
})


// function which returns random number btw min max
function randomNum(min, max) {
    const randNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return randNum;
}

const authentication = async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) return res.sendStatus(401);
    const [bearer, key] = authorization.split(" ");
    if (bearer !== "Bearer") return res.sendStatus(401);
    const player = await Player.findOne({ key });
    if (!player) return res.sendStatus(401);

    req.player = player;
    next();
};


//뷰 엔진 (api 로그인,회원가입 기능 테스트 완료후 뷰 연결)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use('/static', express.static(path.join(__dirname, 'public')));
app.engine('html', require('ejs').renderFile);


//처음화면
app.get('/', (req, res) => {
    res.render('login')
})

//회원가입
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const encryptedPassword = encryptPassword(password);
    let user = null;
    try {
        user = new User({ email: email, password: encryptedPassword });
        await user.save();
    } catch (err) {
        return res.status(400).json({ error: 'email is duplicated' });
    }
    res.status(200).json({ _id: user._id });
})

//로그인
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const encryptedPassword = encryptPassword(password);
    const user = await User.findOne({ email, password: encryptedPassword });

    if (user === null)
        return res.status(403).json({ error: 'email or password is invaild' });

    user.key = encryptPassword(crypto.randomBytes(20));
    let header_auth = `Bearer ${user.key}`;
    res.cookie('authorization', header_auth);
    res.cookie('email', email);
    await user.save();

    res.status(200).json({ key: user.key });
})

//플레이어 선택 화면
app.get('/player', setAuth, async(req,res) => {
    if (req.cookies.email !== '') {
        const email = req.cookies.email
        const players = await Player.find().where({email})
        res.render("home", {data: {players}})
    } else {
        res.redirect(301, '/')
    }
})

//캐릭터 생성
app.post('/player/create', setAuth, async (req, res) => {
    try {
        const name = req.body.name;
        const email = req.cookies.email;
        let msg = "";
        if (await Player.exists({ name })) {
            msg = "Player is already exists"
        } else {
            const player = new Player({
                name,
                maxHP: 100,
                HP: 100,
                str: randomNum(4, 6),
                def: randomNum(2, 5),
                x: 0,
                y: 0,
                email
            })

            const key = crypto.randomBytes(24).toString("hex");
            player.key = key;
            await player.save()
            msg = "Success"
        }
        res.status(200).json({ msg }) //임시 결과값
    } catch (error) {
        res.status(400).json({ error: "DB_ERROR" })
    }
})


app.get('/game/:name', (req, res) => {
    const name = req.params.name;
    res.render("game", {data: name})
})


//플레이어 상태 확인(신동환)
//########################################################
app.get('/player/:name', setAuth, async (req, res) => {
    try {
        const name = req.params.name
        const  player = await Player.findOne({ name })
        const  level = player.level
        const  exp = player.exp
        const  maxHP = player.maxHP
        const  HP = player.HP
        const  str = player.str
        const  def = player.def
        const  data = { level, exp, maxHP, HP, str, def }
        res.status(200).json(data)
    } catch (error) {
        res.status(400).json({ error: "DB_ERROR" })
    }
})


//장비 착용 해제, 소비템 사용
app.post('/player/item', setAuth, async (req, res) => {
    try {
        var name = req.body.name
        var item = req.body.item
        var wear = req.body.wear

        var player = await Player.findOne({ name })
        console.log(player)
        var inventory = await Inventory.findOne({ itemId: item.id })
        if (item.type === 'attack') {
            var str = item.str
            //장착
            if (wear === true) player.str += str
            //해제
            else player.str -= str

            inventory.wear = wear
            await player.save()
            await inventory.save()

            console.log(player)
            console.log(inventory)
            console.log('공격 장비 장착/해제')
        } else if (item.type === 'armor') {
            var def = item.def
            //장착
            if (wear === false) player.def += def
            //해제
            else player.def -= def

            inventory.wear = wear
            await player.save()
            await inventory.save()

            console.log(player)
            console.log(inventory)
            console.log('방어 장비 장착/해제')
        } else if (item.type === 'consumption') {
            if (item.hp === item.maxHP) {
                console.log('max 체력, 회복 불가')
            } else {
                var hp = item.hp
                player.hp += hp
                if (player.hp > player.maxHP) player.hp = player.maxHP
                inventory.cnt--
                if (inventory.cnt === 0) delete inventory
                await player.save()
                await inventory.save()
            }

            console.log(player)
            console.log(inventory)
            console.log('소비 아이템 사용')
        }
        res.status(200).json({ msg: 'success' })
    } catch (error) {
        console.log(error)
        res.status(400).json({ error: "DB_ERROR" })
    }
})



//맵 화면 (임시)
app.get('/player/map/:name', setAuth, async (req, res) => {
    res.render("map")
})

app.post('/action/:name', setAuth, async (req, res) => {
    const { action } = req.body;
    const name = req.params.name;
    const user = req.user;
    const email = user.email
    const player = await Player.findOne({ name });
    let eventJson = {};
    let event = null;
    let field = null;
    let actions = [];

    // TODO : 확률별로 이벤트 발생하도록 변경
    // 이동재) 전 field에 대해 battle/item/heal/none이 확률적으로 일어나게 수정
    const makeEvent = ()=>{
        let typeNum = randomNum(1, 100);
        if (typeNum > 0 && typeNum <= 60) {
            return "battle";
        } else if (typeNum > 60 && typeNum <= 75) {
            return  "item";
        } else if (typeNum > 75 && typeNum <= 85) {
            return  "heal";
        } else {
            return  "none";
        }}

    let _eventType = makeEvent();

    // (처음 화면 : 1번만 등장 > game.ejs)
    if (action === "query") {
        field = mapManager.getField(player.x, player.y);
    }
    else if (action === "move") {
        const direction = parseInt(req.body.direction, 0); // 0 북. 1 동 . 2 남. 3 서.
        let x = player.x;
        let y = player.y;
        if (direction === 0) {
            y += 1;
        } else if (direction === 1) {
            x += 1;
        } else if (direction === 2) {
            y -= 1;
        } else if (direction === 3) {
            x -= 1;
        } else {
            res.sendStatus(400);
        }

        field = mapManager.getField(x, y);

        if (!field) res.sendStatus(400);
        player.x = x;
        player.y = y;
        await player.save();

        if (_eventType) {
            if (_eventType === "battle") {
                eventJson.event = "battle";
                event = {type: "battle", description: "공룡과 마주쳤다"}
                let _dino = null;

                field = mapManager.getField(player.x, player.y);
                if (field.fieldType === 'green') {
                    const monsterNum = randomNum(1, 2)
                    _dino = dinos.find(e => e.id === monsterNum)
                    event.description1 = '초식공룡이다! 야생의 ' + _dino.name + '이(가) 나타났다!! '
                } else if (field.fieldType === 'white') {
                    const monsterNum = randomNum(3, 5)
                    _dino = dinos.find(e => e.id === monsterNum)
                    event.description1 = '육식공룡이다! 야생의 ' + _dino.name + '이(가) 나타났다!! '
                } else if (field.fieldType === 'blue') {
                    const monsterNum = randomNum(6, 7)
                    _dino = dinos.find(e => e.id === monsterNum)
                    event.description1 = '수룡이다! 야생의 ' + _dino.name + '이(가) 나타났다!! '
                } else if (field.fieldType === 'yellow') {
                    const monsterNum = randomNum(8, 9)
                    _dino = dinos.find(e => e.id === monsterNum)
                    event.description1 = '익룡이다! 야생의 ' + _dino.name + '이(가) 나타났다!! '
                }

                // TODO: 이벤트 별로 events.json 에서 불러와 이벤트 처리
                let dinoHP = _dino.hp;
                const playerStr = player.str + player.itemStr;
                const playerDef = player.def + player.itemDef;
                let playerDamage = Math.max(_dino.str - playerDef, 1);
                let dinoDamage = Math.max(playerStr - _dino.def, 1);

                let turn = 1;

                let battleStatus = "ing";
                while (true) {
                    if (turn <= 10 && player.HP / player.maxHP > 0.2) {
                        event.description1 += `${turn}턴, `;
                        player.incrementHP(-playerDamage);
                        dinoHP -= dinoDamage;
                        console.log(dinoHP);
                        turn += 1;
                        console.log(`first ${turn}`)
                        if (dinoHP <= 0) {
                            eventJson.event = "win"


                            //경험치 획득 및 레벨업
                            event.description1 += `${_dino.name}을 쓰러뜨렸습니다! 경험치를 ${_dino.exp} 획득하였습니다! `;
                            player.exp += _dino.exp;

                            if (player.level >= 5) {
                                event.description1 += "최대 레벨입니다. "
                            } else if (player.exp > 10) {
                                let lvUp = parseInt(player.exp / 10);
                                for (let i = lvUp; i > 0; i--) {
                                    player.exp -= 10;
                                    player.level += 1;
                                    let strUp = Math.floor(Math.random() * (3)) + 2;
                                    let defUp = Math.floor(Math.random() * (4)) + 2;
                                    player.str += strUp;
                                    player.def += defUp;
                                    event.description1 += `레벨업! str이 ${strUp}, def가 ${defUp} 올랐습니다. `;
                                    battleStatus = "win";
                                }
                            }
                            // 공룡 이빨 획득
                            event.description1 += `${_dino.teeth}개의 이빨을 획득하였습니다! `;
                            player.teeth += _dino.teeth;
                            break;

                        } else if (player.HP <= 0) {
                            eventJson.event = "die";
                            event.description1 += `${_dino.name}에게 당했습니다... 정신을 차려보니 시작점입니다! `
                            player.x = 0;
                            player.y = 0;
                            player.HP = player.maxHP;

                            //아이템 잃어버리기
                            let itemName = null
                            while (true) {
                                const possibility = randomNum(0,2);
                                const item = await Inventory.find({player: player, having : true});
                                if (possibility === 0) {
                                    event.description1 += "운좋게 아무 것도 잃지 않았습니다. "
                                    break;
                                } else { // possibility = 1, 2
                                    if (item.length === 0) { // has no item
                                        break;
                                    } else { // has at least 1 item
                                        const lostNum = randomNum(0,item.length-1);
                                        itemName = item[lostNum].name;
                                        console.log(item);
                                        console.log('lostitem' + itemName);
                                        await Inventory.findOneAndUpdate({player: player, name : itemName}, {have: false});
                                        event.description1 += `${itemName}을(를) 잃어버렸습니다. `

                                        player.x = 0;
                                        player.y = 0;
                                        player.HP = player.maxHP;
                                        await player.save();
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        if (battleStatus === "ing") {
                            actions.push({
                                url: `/action/${name}`,
                                text: "계속 싸운다.",
                                params: {
                                    action: "ing",
                                    continue: 1,
                                    dinoHP: dinoHP,
                                    dino: _dino.name
                                }
                            });
                            actions.push({
                                url: `/action/${name}`,
                                text: "도망친다.",
                                params: {
                                    action: "ing",
                                    continue: 0,
                                    dinoHP: dinoHP,
                                    dino: _dino.name
                                }
                            });
                            break
                        }
                    }
                }
                await player.save();
            } else if (_eventType === "item") {
                event = {type: "item", description: "아이템을 획득했다."};
                //item은 기본 아이템(기본칼, 기본총, 천갑옷만 드랍) 추후에 강화가능
                let _itemNum = 3 * randomNum(0, 2) + 1;
                const _item = itemsJson.find(e => e.id === _itemNum);
                //console.log(_item);
                let haveItem = await Inventory.findOne({player: player, itemId: _itemNum});
                if (!haveItem) {
                    //const cntUp = existingItem.cnt + 1
                    //await Inventory.findOneAndUpdate({player: player, itemId: _item.id}, { cnt: cntUp });
                    try {
                    const inventory = new Inventory({
                        player: player,
                        itemId: _item.id,
                        name: _item.name,
                        have: true,
                        wear: false
                    });
                    event.description1 = _item.description;
                    await inventory.save();
                } catch (err) {
                    return res.status(400).json({error: 'cannot add inventory'});}
                } else if (!haveItem.have) {
                    try {
                            haveItem.have = true;
                            event.description1 = _item.description;
                            await haveItem.save();
                        } catch (err) {
                    return res.status(400).json({error: 'cannot add inventory'});}
                } else if (haveItem.have) {
                    event.description1 = `${_item.name}은(는) 이미 갖고 있는 아이템이다.`;
                }
            } else if (_eventType === "heal") {
                event = {type: "heal", description: "운좋게 체력을 회복했다."}
                event.description1 = "힘을 내서 다시 가보자!"
                player.incrementHP(15);
                await player.save();
            } else if (_eventType === "none") {
                event = {type: "none", description: "아무 일도 없었다."};
                event.description1 = "다시 길을 가자";
            }
        }
        // 싸움 계속 선택시 (전투마저하기)
    } else if (action === "ing") {
        x = player.x;
        y = player.y;
        const dino = req.body.dino;
        const _dino = dinos.find(e => e.name === dino);
        let dinoHP = req.body.dinoHP;
        let playerHP = player.HP;
        eventJson.event = "ing";

        field = mapManager.getField(x, y);
        if (req.body.continue === '1'){
            let turn = 1;
            const playerStr = player.str + player.itemStr;
            const playerDef = player.def + player.itemDef;
            let playerDamage = Math.max(_dino.str - playerDef, 1);
            let dinoDamage = Math.max(playerStr - _dino.def, 1);
            event={description1 :''}
            while (true) {
                event.description1 += `${turn}턴, `;
                player.HP -= playerDamage;
                dinoHP -= dinoDamage;
                turn += 1;
                if (player.HP <= 0) {
                    eventJson.event = "";
                    event.description1 += `${_dino.name}에게 당했습니다... 정신을 차려보니 시작점입니다! `
                    player.x = 0;
                    player.y = 0;
                    player.HP = player.maxHP;

                    //아이템 잃어버리기
                    let itemName = null
                    while (true) {
                        const possibility = randomNum(0, 2);
                        const item = await Inventory.find({player: player, having: true});
                        if (possibility === 0) {
                            event.description1 += "운좋게 아무 것도 잃지 않았습니다. "
                            break;
                        } else { // possibility = 1, 2
                            if (item.length === 0) { // has no item
                                break;
                            } else { // has at least 1 item
                                const lostNum = randomNum(0, item.length - 1);
                                itemName = item[lostNum].name;
                                console.log(item);
                                console.log('lostitem' + itemName);
                                await Inventory.findOneAndUpdate({player: player, name: itemName}, {have: false});
                                await player.save();
                                event.description1 += `${itemName}을(를) 잃어버렸습니다. `

                                player.x = 0;
                                player.y = 0;
                                player.HP = player.maxHP;
                                await player.save();
                                break;
                            }
                        }
                    }
                    break
                } else if (dinoHP <= 0) {

                    //경험치 획득 및 레벨업
                    event.description1 += `${_dino.name}을 쓰러뜨렸습니다! 경험치를 ${_dino.exp} 획득하였습니다! `;
                    player.exp += _dino.exp;
                    if (player.level >= 5) {
                        event.description1 += "최대 레벨입니다. "
                    } else if (player.exp > 10) {
                        let lvUp = parseInt(player.exp / 10);
                        for (let i = lvUp; i > 0; i--) {
                            player.exp -= 10;
                            player.level += 1;
                            let strUp = Math.floor(Math.random() * (3)) + 2;
                            let defUp = Math.floor(Math.random() * (4)) + 2;
                            player.str += strUp;
                            player.def += defUp;
                            event.description1 += `레벨업! str이 ${strUp}, def가 ${defUp} 올랐습니다. `;
                        }
                    }

                    // 공룡 이빨 획득
                    event.description1 += `${_dino.teeth}개의 이빨을 획득하였습니다! `;
                    player.teeth += _dino.teeth;
                    break;
                }
            }
        }
        // 도망치기 선택
        else if (req.body.continue === '0'){
            eventJson.event = "run";
        }
    }


    if (eventJson.event !== "battle" && eventJson.event !== "die") {
        actions =[];
        console.log('99999999999999999999')
        console.log(event)
        const directions = ["북", "동", "남", "서"];
        field.canGo.forEach((direction, i) => {
            if (direction === 1) {
                actions.push({
                    url: `/action/${name}`,
                    text: directions[i],
                    params: {direction: i, action: "move"}
                });
            }
        });
    }


      field = mapManager.getField(player.x,player.y);
      eventJson.message = field.descriptions ;
      console.log(_eventType)
      console.log(event)
    console.log(field)
    return res.send({ player, field, event, actions })
});




//맵이동 (아이템획득시 스탯 업데이트, 도망가기)


//전투 or 도망


//레벨업 (1업 마다 능력치 모두 1상승)


//사망 (게임 처음부터 시작)
app.get('/player/death/:name', setAuth, async (req, res) => {
    try {
        var name = req.params.name
        var player = await Player.findOne({ name })
        player.level = 1
        player.exp = 0
        player.maxHP = 10
        player.HP = 10
        player.str = 5
        player.def = 5
        player.x = 0
        player.y = 0
        await player.save()
        res.status(200).json({ msg: "death" })
    } catch (error) {
        res.status(400).json({ error: "DB_ERROR" })
    }
})


/* dinosaur 랜덤 배치 (박신영)
아래 랜덤 배치 관련 코드가 이미 짜여져 있어 일단 이렇게 해뒀습니다
const HERBIVORE_IDS = [1,2];
const CARNIVORE_IDS = [3,4,5];
const SEA_MONSTER_IDS = [6, 7];
const FLYING_IDS = [8,9];
function pickRandom(array) {
    return Math.floor(Math.random() * (array.length));
};
const TERRAIN = {
    GRASS: 0,
    MEAT: 1,
    WATER: 2,
    FLYING: 3,
}
function getRandomMonsterId(terrainType) {
    let monsterIds;
    switch (terrainType) {
        case TERRAIN.GRASS:
            monsterIds = HERBIVORE_IDS;
            break;
        case TERRAIN.MEAT:
            monsterIds = CARNIVORE_IDS;
            break;
        case TERRAIN.WATER:
            monsterIds = SEA_MONSTER_IDS;
            break;
        case TERRAIN.FLYING:
            monsterIds = FLYING_IDS;
            break;
        default:
            throw new Error('Unknown terrain type')
    }
    return pickRandom(monsterIds);
}
*/


// //맵 화면
// app.get('/player/map/:name', setAuth, async (req, res) => {
//     if (req.cookies.authorization) {
//         var name = req.params.name;
//         var player = await Player.findOne({ name });
//         console.log('player',player,name);
//         const mapTile=mapManager.getField(0,0);
//         //const mapTile=mapManager.getField(player.x,player.y);
//         const monsterId=getRandomMonsterId(mapTile.monster);
//         //console.log(monsterId);
//         const monster=monsterManager.getMonster(monsterId);
//         res.render("map", { data: { player, monster, mapTile } });
//     } else {
//         res.redirect(301, '/')
//     }
// })

//맵 화면
app.get('/player/map/:name', setAuth, async (req, res) => {
    if (req.cookies.authorization) {
        var name = req.params.name;
        var player = await Player.findOne({ name });
        console.log('player', player, name);
        const mapTile = mapManager.getField(0, 0);
        //const mapTile=mapManager.getField(player.x,player.y);
        const monsterId = getRandomMonsterId(mapTile.monster);
        //console.log(monsterId);
        const monster = monsterManager.getMonster(monsterId);
        res.render("map", { data: { player, monster, mapTile } });
    } else {
        res.redirect(301, '/')
    }
})



//서버 포트 연결
app.listen(port, () => {
    console.log(`listening at port: ${port}...`);
})