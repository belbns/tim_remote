// длина очереди команд в МП
const CmdQueueLen = 10;
// переменные управления мобильной платформой
var ctrlMotors = {  // ДПТ
    state: 's',         // теущий статус <- МП ("s"|"r"|"l"|"f"|"b")
    queue: CmdQueueLen, // свободное место для команд в очереди <- МП
    cmd: 's',           // последняя команда -> МП ("s"|"r"|"l"|"f"|"b")
    v_dst: 0,           // заданная скорость -> МП (-3..0..3)
    v_real: 3,          // реальная скорость <- МП
    v_left: 0,          // -- левого мотора
    v_right: 0,         // -- правого мотора
    dir: Math.PI/2,
    dist: 0,
    id: 'motors',
    token: 'mot',
    info: 'motors_info',
    markd: 'mark_mot',
    markl: 'rmark_motl',
    markr: 'rmark_motr'
};

// Серво привод, на моб. пл. передается в градусах 0..180, 90 - центр
var ctrlServo = {
//    angle_dst: Math.PI/2,  
//    angle_real: Math.PI/2,
    angle_dst: 90,  
    angle_real: 90,
    queue: CmdQueueLen, // свободное место для команд в очереди <- МП
    dir: 0,
    dist: 0 ,
    id: 'servo',
    token: 'servo',
    info: 'servo_info',
    markd: 'mark_ser',
    markr: 'rmark_ser'
}

var ctrlStepp = [
    { num: 0,  mode: 'm', state: 's', queue: CmdQueueLen, cmd: 's', angle_dst: Math.PI/2, 
        angle_real: Math.PI/2, turns: 0, dir: Math.PI/2, dist: 0, id: 'stepp1', token: 'st', 
        info: 'stepp1_info', modesw : 'sw_st1', markd: 'mark_st1', markr: 'rmark_st1' 
    },
    { num: 1,  mode: 'm', state: 's', queue: CmdQueueLen, cmd: 's', angle_dst: Math.PI/2, 
        angle_real: Math.PI/2, turns: 0, dir: Math.PI/2, dist: 0, id: 'stepp2', token: 'st',
        info: 'stepp2_info', modesw : 'sw_st2', markd: 'mark_st2', markr: 'rmark_st2' 
    } ];

var ctrlLeds = [0, 0, 0, 0];
var LedsQueue = 0;
var Dist = 2048;
var DistQueue = 0;
var CmdQueue = 0;
var adc_val = [0, 0, 0, 0];
var LowBatt = false;
var HighLoad = false;

const adcBattMin = 1580;
const battMeterMax = 120;
/*
var storage = window.localStorage;

var remote_ip = storage.getItem("remote_ip");
if (!remote_ip) {
    //remote_ip = "192.168.4.22";
    remote_ip = "127.0.0.1";
    storage.setItem("remote_ip", remote_ip);
}

var remote_port = storage.getItem("remote_port");
if (!remote_port) {
    remote_port = 2012;
    storage.setItem("remote_port", remote_port);
}
*/

// Кэш объекта выбранного устройства
let deviceCache = null;
// Кэш объекта характеристики
let characteristicCache = null;

// Запустить выбор Bluetooth устройства и подключиться к выбранному
function connect() {
    var ret = (deviceCache ? Promise.resolve(deviceCache) :
        requestBluetoothDevice()).
        then(device => connectDeviceAndCacheCharacteristic(device)).
        then(characteristic => startNotifications(characteristic)).
        catch(error => writeToScreen(error));
    //ret = true; // DEBUG
    if (ret) {
        document.getElementById('rmark_motl').style.visibility = 'visible';
        document.getElementById('rmark_motr').style.visibility = 'visible';
        document.getElementById('rmark_ser').style.visibility = 'visible';

        cleanScreen();
        writeToScreen('== BLE connected ==');
    }
    else {
        document.getElementById('sw_start').checked = false;        
    }
    return ret;
}

// Запрос выбора Bluetooth устройства
function requestBluetoothDevice() {
    //
    //writeToScreen('Requesting bluetooth device...');

    return navigator.bluetooth.requestDevice({
        filters: [{services: [0xFFE0]}],
    }).
        then(device => {
            //writeToScreen('"' + device.name + '" bluetooth device selected');
            deviceCache = device;

            // Добавленная строка
            deviceCache.addEventListener('gattserverdisconnected',
                handleDisconnection);

            return deviceCache;
        });
}

// Обработчик разъединения
function handleDisconnection(event) {
    let device = event.target;

    //writeToScreen('"' + device.name +
    //    '" bluetooth device disconnected, trying to reconnect...');

    connectDeviceAndCacheCharacteristic(device).
        then(characteristic => startNotifications(characteristic)).
        catch(error => log(error));

    document.getElementById('sw_start').checked = false;
}

// Отключиться от подключенного устройства
function disconnect() {
    if (deviceCache) {
        //writeToScreen('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
        deviceCache.removeEventListener('gattserverdisconnected',
            handleDisconnection);

        if (deviceCache.gatt.connected) {
            deviceCache.gatt.disconnect();
            //writeToScreen('"' + deviceCache.name + '" bluetooth device disconnected');
        }
        else {
            //writeToScreen('"' + deviceCache.name +
            //    '" bluetooth device is already disconnected');
        }
    }

     // Добавленное условие
    if (characteristicCache) {
        characteristicCache.removeEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
        characteristicCache = null;
    }

    deviceCache = null;
    document.getElementById('rmark_motl').style.visibility = 'hidden';
    document.getElementById('rmark_motr').style.visibility = 'hidden';
    document.getElementById('rmark_ser').style.visibility = 'hidden';

}

// Подключение к определенному устройству, получение сервиса и характеристики
function connectDeviceAndCacheCharacteristic(device) {
    //
    if (device.gatt.connected && characteristicCache) {
        return Promise.resolve(characteristicCache);
    }

    //writeToScreen('Connecting to GATT server...');

    return device.gatt.connect().
        then(server => {
            //writeToScreen('GATT server connected, getting service...');

            return server.getPrimaryService(0xFFE0);
        }).
        then(service => {
            //writeToScreen('Service found, getting characteristic...');

            return service.getCharacteristic(0xFFE1);
        }).
        then(characteristic => {
            //writeToScreen('Characteristic found');
            characteristicCache = characteristic;

            return characteristicCache;
        });
}

// Включение получения уведомлений об изменении характеристики
function startNotifications(characteristic) {
    //
    //writeToScreen('Starting notifications...');

    return characteristic.startNotifications().
        then(() => {
            //writeToScreen('Notifications started');
            // Добавленная строка
            characteristic.addEventListener('characteristicvaluechanged',
                handleCharacteristicValueChanged);
        });
}

// Получение данных
function handleCharacteristicValueChanged(event) {
    let value = new TextDecoder().decode(event.target.value);
    writeToScreen('rec: ' + value);

    var event = JSON.parse(value);
    if (event.hasOwnProperty('ms')) {
        ctrlMotors.state = event.ms[0];
        if ((ctrlMotors.state === 's') || (ctrlMotors.state === 'a'))
        {
            ctrlMotors.v_real = ctrlMotors.v_left = ctrlMotors.v_right = 0;
        }
        else if ((ctrlMotors.state === 'f') || (ctrlMotors.state === 'b'))
        {
            ctrlMotors.v_real = ctrlMotors.v_left = ctrlMotors.v_right = event.ms[1];
        }
        else if ((ctrlMotors.state === 'l') || (ctrlMotors.state === 'r'))
        {
            ctrlMotors.v_left = event.ms[1];
            ctrlMotors.v_right = event.ms[2];
        }
        jPosMotDraw(ctrlMotors)
    }
    else if (event.hasOwnProperty('qmot')) {
        ctrlMotors.queue = event.qmot;
    }
    else if(event.hasOwnProperty('servo')) {
        ctrlServo.angle_real = event.servo;
        jPosDrawServo(ctrlServo);
    }
    else if (event.hasOwnProperty('qservo')) {
        ctrlServo.queue = event.qservo;
    }
    else if (event.hasOwnProperty('ss')) {
        var stnum = event.ss[0];
        ctrlStepp[stnum].state = event.ss[1];
        ctrlStepp[stnum].mode = event.ss[2];
        if (ctrlStepp[stnum].mode === 'm')
        {
            document.getElementById(ctrlStepp[stnum].modesw).checked = false;
        }

    }
    else if (event.hasOwnProperty('sv')) {
        ctrlStepp[event.sv[0]].turns = event.sv[1];
        // A * 2 * PI / 512 + PI/2
        //ctrlStepp[event.sv[0]].angle_real = event.sv[2] * Math.PI / 256 + Math.PI / 2;
      if (event.sv[2] > 384) {
            ctrlStepp[event.sv[0]].angle_real = (event.sv[2] - 384) * Math.PI / 256;
        }
        else {
            ctrlStepp[event.sv[0]].angle_real = (event.sv[2] + 128) * Math.PI / 256;            
        }

        jPosDraw(ctrlStepp[event.sv[0]]);
    }
    else if (event.hasOwnProperty('qst1')) {
        ctrlStepp[0].queue = event.qst1;
    }
    else if (event.hasOwnProperty('qst2')) {
        ctrlStepp[1].queue = event.qst2;
    }
    else if (event.hasOwnProperty('adc')) {
        adc_val[event.adc[0]] = event.adc[1];
        var meterb = document.getElementById('battery');
        if (event.adc[0] == 0) {    // 3.3v
            var vt = Math.round((adc_val[0] - adcBattMin) / 3);
            if (vt > 0) {
                if (vt > battMeterMax) {
                    vt = battMeterMax;
                }
                else {
                    vt = 0;
                }
            }
            meterb.setAttribute('value', vt.toString());
        }
    }
    else if (event.hasOwnProperty('led')) {
        var ll = event.led[1];
        if (ll == 'b') {
            ctrlLeds[event.led[0]] = 2;
        }
        else if (ll == 'u') {
            ctrlLeds[event.led[0]] = 1;
        }
        else {
            ctrlLeds[event.led[0]] = 0;
        }
    }
    else if (event.hasOwnProperty('qleds')) {
        LedsQueue = event.qleds;
    }
    else if (event.hasOwnProperty('dist')) {
        Dist = event.qleds;
    }
    else if (event.hasOwnProperty('qdist')) {
        DistQueue = event.qdist;
    }
    else if (event.hasOwnProperty('queue')) {
        CmdQueue = event.queue;
    }
    else if (event.hasOwnProperty('batt')) {
        var bb = event.batt;
        if (bb == 'l') {
            HighLoad = true;
        }
        else if (bb == 'b') {
            LowBatt = true;
        }
    }

}

function crtrl_on(sw) {
    if (sw.checked) {
        // connect to BLE
        connect();              // DEBUG
        jPosDraw(ctrlStepp[0]);
        jPosDraw(ctrlStepp[1]);
        jPosMotDraw(ctrlMotors);
        jPosDrawServo(ctrlServo);
        ctrlFlag = true;
    }
    else {
        disconnect();
        ctrlFlag = false;
    }
}


function doSend(message) {
    message = String(message);
    if (!message || !characteristicCache) {
        return;
    }
    writeToCharacteristic(characteristicCache, message);
    writeToScreen('send: ' + message);
}

// Записать значение в характеристику
function writeToCharacteristic(characteristic, data) {
    characteristic.writeValue(new TextEncoder().encode(data));
}

const scrLen = 10;
function writeToScreen(message) {
    var outputEl = document.getElementById('diagmsg');
    if (outputEl.children.length == scrLen) {
        outputEl.removeChild(outputEl.children[0]);
    }
    
    outputEl.insertAdjacentHTML('beforeend',
      '<div class="myterm">' + message + '</div>');
}

function cleanScreen() {
    var outputEl = document.getElementById('diagmsg');
    var l = outputEl.children.length;
    for (var i = l - 1; i >= 0; i--) {
        outputEl.removeChild(outputEl.children[i]);
    }    
}

function sendToBLE(token, newcmd, par1, devnum) {
    var st = '{"' + token + '":';
    switch(token) {
        case 'mot':
            var p1 = par1;
            if ((newcmd === 'l') || (newcmd === 'r') || (newcmd === 'n') || (newcmd === 's')) {
                st = st + '"' + newcmd + '"';    
            }
            else {
                st = st + '["' + newcmd + '",' + p1.toString() + ']';
            }
            break;
        case 'le':
            if (newcmd === 'p') {
                st = st + '["' + newcmd + '",'+ par1.toString() + ']';
            }
            else {
                st = st + '["' + newcmd + '",'+ devnum.toString() + ']';
            }

            break;
        case 'st':
            if ((newcmd === 'p') || (newcmd === 'a')) {
                st = st + '["' + newcmd + '",' + devnum.toString() + ',' + par1.toString() + ']';
            }
            else {
                st = st + '["' + newcmd + '",' + devnum.toString() + ']';
            }
            break;
        case 'echo':
        case 'servo':
            st = st + '["' + newcmd + '",' + par1.toString() + ']';
            break;
        case 'dist':
            st = st + '"' + newcmd + '"';
            break;
        case 'pause':
        case 'check':
        case 'pwroff':
        case 'stop':
        st = st + par1.toString();
    }
    st =  st + '}';
    doSend(st + '\n');
    console.log('Send: ' + token + ' ' + newcmd + ' ' + par1);
    console.log(st);
    return true;
};

const joystickSize = 160;
var markR = joystickSize / 2 - 3;
var markD = joystickSize / 2 + 3;

var rmarkR = markR;
var dmarkR = markD;
const markMotStep = 48;

var ctrlFlag = false;

function getJoystickPos(cont) {
    var xy = new Object;
    xy = calcContCenter(cont);
    var topPos = xy['y'] + 'px';
    var leftPos = xy['x'] + 'px';
    var pos = new Object();
    pos['top'] = topPos;
    pos['left'] = leftPos;
    return pos
};

function jPosDraw(ctrl_j) {
    var xy = calcContCenter(ctrl_j.id);
    var a = ctrl_j.angle_real;
    var mr = document.getElementById(ctrl_j.markr);
    var x = xy['x'] + rmarkR * Math.cos(a);
    var y = xy['y'] - rmarkR * Math.sin(a);
    mr.style.left = x - 5 + 'px';
    mr.style.top = y - 5 + 'px';

    a = ctrl_j.angle_dst;
    var md = document.getElementById(ctrl_j.markd);
    x = xy['x'] + dmarkR * Math.cos(a);
    y = xy['y'] - dmarkR * Math.sin(a);
    md.style.left = x - 5 + 'px';
    md.style.top = y - 5 + 'px';
}

function jPosDrawServo(ctrl_j) {
    var xy = calcContCenter(ctrl_j.id);
    //var a = ctrl_j.angle_real;
    //var a_rad = a * Math.PI / 180;
    var mr = document.getElementById(ctrl_j.markr);

    mr.style.left = xy['x'] - 64 + 'px';
    mr.style.top = xy['y'] - 64 + 'px';
    //mr.style.transform = "rotate(" + String(Math.PI / 2 - a_rad) + "rad)";
    mr.style.transform = "rotate(" + String(90 - ctrl_j.angle_real) + "deg)";

    var a_rad = ctrl_j.angle_dst * Math.PI / 180;
    var md = document.getElementById(ctrl_j.markd);
    x = xy['x'] + dmarkR * Math.cos(a_rad);
    y = xy['y'] - dmarkR * Math.sin(a_rad);
    md.style.left = x - 5 + 'px';
    md.style.top = y - 5 + 'px';
}

function jPosMotDraw(ctrl_j) {
    var xy = calcContCenter(ctrl_j.id);
    //var bg = document.getElementById(ctrl_j.id); //bg.style['background-image'] = 'img/Actions-go-previous-48';
    var wp = 48;
    var hp = 48;
    var mr = document.getElementById(ctrl_j.markr); // правый мотор
    if (ctrl_j.v_right > 0) {
        switch(ctrl_j.v_right) {
            case 1: mr.src = "img/arrow-up-icon_b32.png";
                    wp = hp = 32;
                    break;
            case 2: mr.src = "img/arrow-up-icon_b48.png";
                    wp = hp = 48;
                    break;
            case 3: mr.src = "img/arrow-up-icon_b64.png";
                    wp = hp = 64;
        }
        //bg.style['background-image'] = 'img/Actions-go-next-48';
    }
    else if (ctrl_j.v_right < 0) {
        switch(ctrl_j.v_right) {
            case -1: mr.src = "img/arrow-down-icon_b32.png";
                    wp = hp = 32;
                break;
            case -2: mr.src = "img/arrow-down-icon_b48.png";
                    wp = hp = 48;
                break;
            case -3: mr.src = "img/arrow-down-icon_b64.png";
                    wp = hp = 64;
        }
        //bg.style['background-image'] = 'img/Actions-go-previous-48';
    }
    else {  // == 0
        mr.src = "img/Actions-edit-delete-48.png";
    }
    mr.style.width = wp + 'px';
    mr.style.height = hp + 'px';

    wp = 48;
    hp = 48;
    var ml = document.getElementById(ctrl_j.markl); // левый мотор
    if (ctrl_j.v_left > 0) {
            switch(ctrl_j.v_left) {
            case 1: ml.src = "img/arrow-up-icon_b32.png";
                    wp = hp = 32;
                    break;
            case 2: ml.src = "img/arrow-up-icon_b48.png";
                    wp = hp = 48;
                    break;
            case 3: ml.src = "img/arrow-up-icon_b64.png";
                    wp = hp = 64;
        }
        //bg.style['background-image'] = 'img/Actions-go-previous-48';
    }
    else if (ctrl_j.v_left < 0) {
        switch(ctrl_j.v_left) {
            case -1: ml.src = "img/arrow-down-icon_b32.png";
                    wp = hp = 32;
                    break;
            case -2: ml.src = "img/arrow-down-icon_b48.png";
                    wp = hp = 48;
                    break;
            case -3: ml.src = "img/arrow-down-icon_b64.png";
                    wp = hp = 64;
        }
        //bg.style['background-image'] = 'img/Actions-go-next-48';
    }
    else {  //
        ml.src = "img/Actions-edit-delete-48.png";
        //bg.style['background-image'] = 'none';
    }
    ml.style.width = wp + 'px';
    ml.style.height = hp + 'px';

    mr.style.left = xy['x'] + 70 + 32 - wp / 2  + 'px';
    mr.style.top = xy['y'] - hp / 2 + 'px';

    ml.style.left = xy['x'] - 70 - 32 - wp / 2 + 'px';
    ml.style.top = xy['y'] - hp / 2 + 'px';

    var md = document.getElementById(ctrl_j.markd); // маркер назначения
    var dy = markMotStep * ctrl_j.v_dst;
    y = xy['y'] - dy;
    md.style.left = xy['x'] - 5 + 'px';
    md.style.top = y - 5 + 'px';
}

function motorCommand(ctrl_m) {

    function mTurnCancel() {
        var cmd = 'n';
        if ( sendToBLE(ctrl_m.token, 'n', ctrl_m.v_dst, 0) ) {
            if (ctrl_m.v_dst > 0) {
                ctrl_m.cmd = 'f';
                //ctrl_m.v_right = ctrl_m.v_left = ctrl_m.v_real; // DEBUG
            }
            else if (ctrl_m.v_dst < 0) {
                ctrl_m.cmd = 'b';
                //ctrl_m.v_right = ctrl_m.v_left = ctrl_m.v_real; // DEBUG
            }
            else {
                ctrl_m.cmd = 's';
                //ctrl_m.v_right = ctrl_m.v_left = ctrl_m.v_real = 0; // DEBUG
            }
            //document.getElementById(ctrl_m.id).style['background-image'] = 'none';
        }
    }

    function mStop() {
        if ( sendToBLE(ctrl_m.token, 's', 0, 0) ) {
            ctrl_m.cmd = 's';
            ctrl_m.v_dst = 0;
            //ctrl_m.v_real = ctrl_m.v_left = ctrl_m.v_right = 0; // DEBUG

            //document.getElementById(ctrl_m.id).style['background-image'] = 'none';
        }
    }

    var cmd = 's';
    var v = 0;
    if (ctrl_m.dist < (joystickSize / 2 - 20)) { // нажатие в центре - стоп или отмена поворота
        if ((ctrl_m.state === 'l') || (ctrl_m.state === 'r')) { // в повороте
            mTurnCancel();
        }
        else {      // стоп
            mStop();
        }
    }
    else {
        if ( (ctrl_m.dir > (Math.PI / 4)) && (ctrl_m.dir < (Math.PI * 3 / 4)) ) { // вверх
            if ((ctrl_m.state === 'l') || (ctrl_m.state === 'r')) { // в повороте - отменяем поворот
                mTurnCancel();
            }
            else {
                v = ctrl_m.v_dst;
                if (v < 3) {
                    v += 1;
                    if (v > 0) {
                        cmd = 'f';
                    }
                    else if (v < 0) {
                        cmd = 'b';
                    }
                    else {  // == 0
                        cmd = 's';
                    }
                    if (cmd === 's') {
                        mStop();
                    }
                    else {
                        if (sendToBLE(ctrl_m.token, cmd, v, 0)) {
                            ctrl_m.cmd = cmd;
                            ctrl_m.v_dst = v;
                            //ctrl_m.v_real = ctrl_m.v_left = ctrl_m.v_right = v; // DEBUG
                        }
                    }
                }
            }
        }
        else if ( (ctrl_m.dir > (Math.PI * 5 / 4)) && (ctrl_m.dir < (Math.PI * 7 / 4)) ) { // вниз
            if ((ctrl_m.state === 'l') || (ctrl_m.state === 'r')) { // в повороте - отменяем поворот
                mTurnCancel();
            }
            else {
                v = ctrl_m.v_dst;
                if (v > -3) {
                    v -= 1;
                    if (v > 0) {
                        cmd = 'f';
                        //ctrl_m.v_real = ctrl_m.v_left = ctrl_m.v_right = v; // DEBUG
                    }
                    else if (v < 0) {
                        cmd = 'b';
                        //ctrl_m.v_real = ctrl_m.v_left = ctrl_m.v_right = v; // DEBUG
                    }
                    else {  // == 0
                        cmd = 's';
                    }
                    if (cmd === 's') {
                        mStop();
                    }
                    else {
                        if (sendToBLE(ctrl_m.token, cmd, v, 0)) {
                            ctrl_m.cmd = cmd;
                            ctrl_m.v_dst = v;
                        }
                    }
                }
            }
        }
        else if ( (ctrl_m.dir > (Math.PI * 3 / 4)) && (ctrl_m.dir < (Math.PI * 5 / 4)) ) { // влево
            if (ctrl_m.state === 'r') {   // если был поворот вправо - просто отменяем
                mTurnCancel();
            }
            else {
                if (sendToBLE(ctrl_m.token, 'l', 0, 0)) {
                    ctrl_m.cmd = 'l';
                    //ctrl_m.v_left = 0;              // DEBUG
                    //ctrl_m.v_right = ctrl_m.v_real; // DEBUG
                }                
            }
        }
        else {  // вправо
            if (ctrl_m.state === 'l') {   // если был поворот влево - отменяем
                mTurnCancel();
            }
            else {
                if (sendToBLE(ctrl_m.token, 'r', 0, 0)) {
                    ctrl_m.cmd = 'r';
                    //ctrl_m.v_right = 0;             // DEBUG
                    //ctrl_m.v_left = ctrl_m.v_real; // DEBUG
                }                
            }
        }
    }
}

function steppCommand(ctrl_st) {
    var cmd = 's';
    var param1 = 0;
    if (ctrl_st.dist < joystickSize / 2) { // нажатие в центре - стоп или возврат в 0
        if (ctrl_st.state === 'v') {
            cmd = 's';
        }
        else {
            if (ctrl_st.cmd === 's') {  // предыдущая команда была "стоп"
                cmd = 'h'; // - home без сброса оборотов
            }
            else if (ctrl_st.cmd === 'h') {  // предыдущая команда была home без сброса оборотов
                cmd = 'n'; //n - home со сбросом оборотов 
            }
        }

        if (sendToBLE(ctrl_st.token, cmd, param1, ctrl_st.num)) {
            ctrl_st.cmd = cmd;
            ctrl_st.angle_dst = Math.PI / 2;
            //ctrl_st.angle_real = ctrl_st.angle_dst; // DEBUG
        }
    }    
    else {
        var r_angle = ctrl_st.dir;
        var sw = document.getElementById(ctrl_st.modesw);
        if (sw.checked) {   // режим - вращение
            if ( (r_angle > (Math.PI / 2)) && (r_angle < (3 * Math.PI / 2)) ) { // влево
                if (ctrl_st.cmd !== 'l') {  // если не повторяем прежнюю команду
                    if (ctrl_st.cmd === 'r') {  // в противоположную сторону - стоп
                        cmd = 's';
                        ctrl_st.angle_dst = Math.PI;
                    }
                    else {
                        cmd = 'l';
                    }
                    if (sendToBLE(ctrl_st.token, cmd, 0, ctrl_st.num))
                    {
                        ctrl_st.cmd = cmd;
                        //ctrl_st.angle_real = ctrl_st.angle_dst + Math.PI / 4; // DEBUG
                    }
                }
            }
            else if ( (r_angle < (Math.PI / 2)) || (r_angle > (3 * Math.PI / 2)) ) { // вправо
                if (ctrl_st.cmd !== 'r') {  // если не повторяем прежнюю команду
                    if (ctrl_st.cmd === 'l') {  // в противоположную сторону - стоп
                        cmd = 's';
                        ctrl_st.angle_dst = Math.PI;
                        //ctrl_st.angle_real = ctrl_st.angle_dst; // DEBUG
                    }
                    else {
                        cmd = 'r';
                        //ctrl_st.angle_real = ctrl_st.angle_dst + Math.PI / 4; // DEBUG
                    }
                    if (sendToBLE(ctrl_st.token, cmd, 0, ctrl_st.num))
                    {
                        ctrl_st.cmd = cmd;
                        //ctrl_st.angle_real = ctrl_st.angle_dst - Math.PI / 4; // DEBUG
                    }
                }
            }
            // на остальное не обращаем внимание
        }
        else {  // режим - угол - установка ШД в заданное положение
            if (r_angle < (Math.PI / 2 - 0.01)) {
                param1 = Math.round(r_angle * 256 / Math.PI + 384);
            }
            else {
                param1 = Math.round(r_angle * 256 / Math.PI - 128);   
            }
            if (param1 < 0) {
                param1 = 0;
            }
            else if (param1 > 511) {
                param1 = 511;
            }

            //param1 = Math.round(an * 512 / (2 * Math.PI));  // пересчитываем в шаги ШД
            cmd = 'a';
            if (sendToBLE(ctrl_st.token, cmd, param1, ctrl_st.num)) {
                ctrl_st.cmd = cmd;
                ctrl_st.angle_dst = r_angle;
                //ctrl_st.angle_real = ctrl_st.angle_dst; // DEBUG
            }
        }
    }    
};


function servoCommand(ctrl_se) {
    function angleLimit(a) {
        var an = a;
        if (an > 180) {
            if (an < 225) {
                an = 180;
            }
            else if (an > 315) {
                an = 0;
            }
            else {
                an = 90;   // нижний сектор - стоп
            }
        }
        return an;
    }

    var angle = 90; // если нажатие будет в центре - возврат в 90 град.
    if (ctrl_se.dist > (joystickSize / 2 - 10)) {
        angle = angleLimit(ctrl_se.dir);
    }
    if (sendToBLE(ctrl_se.token, 's', angle, 0)) {
        ctrl_se.angle_dst = angle;
    }
};


var joystickStepp1 = nipplejs.create({
    zone: document.getElementById('stepp1'),
    mode: 'static',
    position: getJoystickPos('stepp1'),
    color: 'green',
    size: joystickSize
});
joystickStepp1.on('move', function (evt, nipple) {
    ctrlStepp[0].dir = nipple.angle.radian;
    ctrlStepp[0].dist = nipple.distance;
});
joystickStepp1.on('end', function () {
    var outputEl = document.getElementById('stepp1_info');
    //outputEl.innerHTML = 'dir=' + ctrlStepp[0].dir.toFixed(4) + ' dist=' + ctrlStepp[0].dist.toFixed(4);
    if (ctrlFlag) {
        outputEl.innerHTML = 'STEPPER1 (Qrem= ' + ctrlStepp[0].queue + ')';
        steppCommand(ctrlStepp[0]);
        jPosDraw(ctrlStepp[0]);
    }
});

var joystickStepp2 = nipplejs.create({
    zone: document.getElementById('stepp2'),
    mode: 'static',
    position: getJoystickPos('stepp2'),
    color: 'blue',
    size: joystickSize
});
joystickStepp2.on('move', function (evt, nipple) {
    ctrlStepp[1].dir = nipple.angle.radian;
    ctrlStepp[1].dist = nipple.distance;
});
joystickStepp2.on('end', function () {
    var outputEl = document.getElementById('stepp2_info');
    //outputEl.innerHTML = 'dir=' + ctrlStepp[1].dir.toFixed(0) + ' dist=' + ctrlStepp[1].dist.toFixed(0);
    if (ctrlFlag) {
        outputEl.innerHTML = 'STEPPER2 (Qrem= ' + ctrlStepp[1].queue + ')';
        steppCommand(ctrlStepp[1]);
        jPosDraw(ctrlStepp[1]);
    }
});

var joystickMotors = nipplejs.create({
    zone: document.getElementById('motors'),
    mode: 'static',
    position: getJoystickPos('motors'),
    color: 'brown',
    //lockX: true,
    size: joystickSize
});
joystickMotors.on('move', function (evt, nipple) {
    ctrlMotors.dir = nipple.angle.radian;
    ctrlMotors.dist = nipple.distance;

});
joystickMotors.on('end', function () {
    var outputEl = document.getElementById('motors_info');
    //outputEl.innerHTML = 'dir=' + ctrlMotors.dir.toFixed(0) + ' dist=' + ctrlMotors.dist.toFixed(0);
    if (ctrlFlag) {
        outputEl.innerHTML = 'MOTORS (Qrem= ' + ctrlMotors.queue + ')';
        motorCommand(ctrlMotors);
        jPosMotDraw(ctrlMotors);
    }
});

var joystickServo = nipplejs.create({
    zone: document.getElementById('servo'),
    mode: 'static',
    position: getJoystickPos('servo'),
    color: 'red',
    //lockX: true,
    size: joystickSize
});
joystickServo.on('move', function (evt, nipple) {
    ctrlServo.dir = Math.round(nipple.angle.degree);
    ctrlServo.dist = nipple.distance;
});
joystickServo.on('end', function () {
    var outputEl = document.getElementById('servo_info');
    //outputEl.innerHTML = 'dir=' + ctrlServo.dir.toFixed(0) + ' dist=' + ctrlServo.dist.toFixed(2);
    if (ctrlFlag) {
        outputEl.innerHTML = 'SERVO (Qrem= ' + ctrlServo.queue + ')';
        servoCommand(ctrlServo);
        jPosDrawServo(ctrlServo);
    }
});

function calcContCenter(cont) {
    var bodyRect = document.body.getBoundingClientRect();
    var contRect = document.getElementById(cont).getBoundingClientRect();
    var offsetTop   = contRect.top - bodyRect.top;
    var offsetLeft   = contRect.left - bodyRect.left;
    var centerXY = new Object();
    centerXY['x'] = Math.round(offsetLeft + contRect.width / 2);
    centerXY['y'] = Math.round(offsetTop + contRect.height / 2);
    return centerXY;
}


function led_switch(clicked_id) {
    var butt = document.getElementById(clicked_id);
    var led = parseInt(clicked_id[6]);

    var l = ctrlLeds[led] + 1;
    if (l > 2) {
        l = 0;
    }
    var st = "";
    var cmd = "";
    switch (l) {
        case 0:
            cmd = 'd';
            st = "url('img/circle_grey.png')";
            break;
        case 1:
            cmd = 'u';
            st = "url('img/circle_yellow.png')";
            break;
        case 2:
            cmd = 'b';
            st = "url('img/6.png')";
    }


    if ( sendToBLE('le', cmd, 0, led) ) {
        butt.style['background-image'] = st;
        ctrlLeds[led] = l;
    }
}

function resize_on() {

}

