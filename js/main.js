// переменные управления мобильной платформой
var ctrlMotors = {  // ДПТ
    state: 's',         // теущий статус <- МП ("s"|"r"|"l"|"f"|"b")
    queue: false,       // наличие команд моторов в очереди <- МП
    cmd: 's',           // последняя команда -> МП ("s"|"r"|"l"|"f"|"b")
    v_dst: 0,           // заданная скорость -> МП (-3..0..3)
    v_real: 3,          // реальная скорость <- МП
    v_left: 0,          // -- левого мотора
    v_right: 0,         // -- правого мотора
    dir: Math.PI/2,
    dist: 0,
    token: 'motors',
    info: 'motors_info',
    markd: 'mark_mot',
    markl: 'rmark_motl',
    markr: 'rmark_motr'
};

var ctrlServo = {       // Серво привод
    angle_dst: Math.PI/2,  
    angle_real: Math.PI/2,
    dir: 0,
    dist: 0 ,
    token: 'servo',
    info: 'servo_info',
    markd: 'mark_ser',
    markr: 'rmark_ser'
}
/*
var ctrlStepp1 = {  // ШД1
    mode: 'm',          // текущий режим <- МП
    state: 's',         // теущий статус <- МП ("v"|"s")
    queue: false,       // наличие команд ШД1 в очереди <- МП
    cmd: 's',           // последняя команда -> МП ("r"|"l"|"s"|"h"|"a")
    angle_dst: Math.PI/2,       // заданное значение угла -> МП (-511..511, для команды "a")
    angle_real: Math.PI/2,      // текущее значение угла <- МП
    dir: Math.PI/2,             // последнее направление джойстика
    dist: 0,             // последняя дистанция джойстика
    token: 'stepp1',
    info: 'stepp1_info',
    modesw: 'sw_st1',
    markd: 'mark_st1',
    markr: 'rmark_st1'
};

var ctrlStepp2 = {  // ШД2
    mode: 'm',
    state: 's',
    queue: false,
    cmd: 's',
    angle_dst: Math.PI/2,
    angle_real: Math.PI/2,
    turn: 'n',
    dir: Math.PI/2,
    dist: 0,
    token: 'stepp2',
    info: 'stepp2_info',
    modesw : 'sw_st2',
    markd: 'mark_st2',
    markr: 'rmark_st2'
};
*/
var ctrlStepp = {
    a: {   mode: 'm', state: 's', queue: false, cmd: 's', angle_dst: Math.PI/2, angle_real: Math.PI/2, 
        turn: 'n', dir: Math.PI/2, dist: 0, token: 'stepp1', info: 'stepp1_info', 
        modesw : 'sw_st1', markd: 'mark_st1', markr: 'rmark_st1' },
    b: {   mode: 'm', state: 's', queue: false, cmd: 's', angle_dst: Math.PI/2, angle_real: Math.PI/2, 
        turn: 'n', dir: Math.PI/2, dist: 0, token: 'stepp2', info: 'stepp2_info', 
        modesw : 'sw_st2', markd: 'mark_st2', markr: 'rmark_st2' }  };

var ctrlLeds = [0, 0, 0, 0];

var remote_ip = "192.168.4.22";
//var remote_ip = "127.0.0.1";
var remote_port = 2012;

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

var ws_connected = false;

var wsUri = "ws://" + remote_ip + ":" + remote_port;

var websocket = new WebSocket(wsUri);

websocket.onopen = function(evt) {
    writeToScreen("Connected");
    //doSend("{'ready':true}");
    ws_connected = true;
    sendToESP('remote', 's', ws_connected);
};

websocket.onmessage = function(evt) {
    //alert(evt.data);
    console.log(evt.data);
    writeToScreen(evt.data);
    var event = JSON.parse(evt.data);
    if(event.hasOwnProperty('motors')) {
        if (event.motors[0] === 'e') {
            ctrlMotors.queue = false;
        }
        else {
            ctrlMotors.queue = true;   
        }
        ctrlMotors.state = event.motors[1];
        ctrlMotors.v_real = event.motors[2];
        ctrlMotors.v_left = event.motors[3];
        ctrlMotors.v_right = event.motors[4];
        jPosMotDraw(ctrlMotors)
    }
    if(event.hasOwnProperty('servo')) {
        ctrlServo.angle_real = (event.servo - 18) * Math.PI / 18;
        jPosDrawServo(ctrlServo);
    }
    /*
    if(event.hasOwnProperty('stepp1')) {
        if (event.stepp1[0] === 'e') {
            ctrlStepp1.queue = false;
        }
        else {
            ctrlStepp1.queue = true;   
        }
        ctrlStepp1.state = event.stepp1[1];
        ctrlStepp1.mode = event.stepp1[2];
        ctrlStepp1.turns = event.stepp1[3];
        ctrlStepp1.angle_real = event.stepp1[4] * Math.PI / 256; // A * 2 * PI /512
        jPosDraw(ctrlStepp1);
    }
    */
    if(event.hasOwnProperty('stepp1')) {
        var st = ctrlStepp.a;
        if (event.stepp1[0] === 'e') {
            st.queue = false;
        }
        else {
            st.queue = true;   
        }
        st.state = event.stepp1[1];
        st.mode = event.stepp1[2];
        st.turns = event.stepp1[3];
        // A * 2 * PI /512 + PI/2
        st.angle_real = event.stepp1[4] * Math.PI / 256 + Math.PI / 2;
        jPosDraw(st);
    }

    if(event.hasOwnProperty('stepp2')) {
        var st = ctrlStepp.b;
        if (event.stepp2[0] === 'e') {
            st.queue = false;
        }
        else {
            st.queue = true;   
        }
        st.state = event.stepp2[1];
        st.mode = event.stepp2[2];
        st.turns = event.stepp2[3];
        // A * 2 * PI /512 + PI/2
        st.angle_real = event.stepp2[4] * Math.PI / 256 + Math.PI / 2;
        jPosDraw(st);
    }
};

websocket.onerror = function(evt) {
    writeToScreen("*** Websocket error!");
    //websocket.close();
};

websocket.onclose = function() { 
    ws_connected = false;
    writeToScreen("Disconnected");
};

function doSend(message) {
    if (websocket.readyState === 1) { // 0 - connecting, 1 - open, 2 - closing, 3 - closed
        websocket.send(message);
        writeToScreen("sent message: " + message);
    }
    else if (websocket.readyState === 2) {
        writeToScreen("websocket is in closing process");
    }
    else if (websocket.readyState === 0) {
        writeToScreen("websocket is closed");
    }
}

function writeToScreen(message) {
    var outputEl = document.getElementById('diagmsg');
    outputEl.innerHTML = message;
}


function sendToESP(token, newcmd, par1) {
    var st = '{"' + token + '":';
    switch(token) {
        case 'stepp1':
        case 'stepp2':
        case 'motors':
        case 'leds':
            st = st + '["' + newcmd + '",' + par1.toString() + ']';
            break;
        case 'echo':
        case 'dist':
            st = st + '"' + newcmd + '"';
            break;
        case 'servo':
        case 'pause':
        case 'remote':
        case 'check':
        case 'pwroff':
        case 'stop':
        st = st + par1.toString();
    }
    st =  st + '}';
    doSend(st);
    console.log('Send: ' + token + ' ' + newcmd + ' ' + par1);
    console.log(st);
    return true;
};

var markR = 57;
var markD = 63;

var rmarkR = 57;
var dmarkR = 63;
var markMotStep = 48;

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
    var xy = calcContCenter(ctrl_j.token);
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
    var xy = calcContCenter(ctrl_j.token);
    var a = ctrl_j.angle_real;
    var mr = document.getElementById(ctrl_j.markr);

    mr.style.left = xy['x'] - 64 + 'px';
    mr.style.top = xy['y'] - 64 + 'px';
    mr.style.transform = "rotate(" + String(Math.PI / 2 - ctrl_j.angle_real) + "rad)";

    a = ctrl_j.angle_dst;
    var md = document.getElementById(ctrl_j.markd);
    x = xy['x'] + dmarkR * Math.cos(a);
    y = xy['y'] - dmarkR * Math.sin(a);
    md.style.left = x - 5 + 'px';
    md.style.top = y - 5 + 'px';
}

function jPosMotDraw(ctrl_j) {
    var xy = calcContCenter(ctrl_j.token);
    //var bg = document.getElementById(ctrl_j.token); //bg.style['background-image'] = 'img/Actions-go-previous-48';
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
        if ( sendToESP(ctrl_m.token, 'n', ctrl_m.v_dst) ) {
            if (ctrl_m.v_dst > 0) {
                ctrl_m.cmd = 'f';
            }
            else if (ctrl_m.v_dst < 0) {
                ctrl_m.cmd = 'b';
            }
            else {
                ctrl_m.cmd = 's';
            }
            document.getElementById(ctrl_m.token).style['background-image'] = 'none';
        }
    }

    function mStop() {
        if ( sendToESP(ctrl_m.token, 's', 0) ) {
            ctrl_m.cmd = 's';
            ctrl_m.v_dst = 0;
            document.getElementById(ctrl_m.token).style['background-image'] = 'none';
        }
    }

    var cmd = 's';
    var param1 = 0;
    var v = 0;
    if (ctrl_m.dist < 20) { // нажатие в центре - стоп или отмена поворота
        if ((ctrl_m.cmd === 'l') || (ctrl_m.cmd === 'r')) { // в повороте
            mTurnCancel();
        }
        else {      // стоп
            mStop();
        }
    }
    else {
        if ( (ctrl_m.dir > (Math.PI / 4)) && (ctrl_m.dir < (Math.PI * 3 / 4)) ) { // вверх
            if ((ctrl_m.cmd === 'l') || (ctrl_m.cmd === 'r')) { // в повороте - отменяем поворот
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
                        if (sendToESP(ctrl_m.token, cmd, v)) {
                            ctrl_m.cmd = cmd;
                            ctrl_m.v_dst = v;
                        }
                    }
                }
            }
        }
        else if ( (ctrl_m.dir > (Math.PI * 5 / 4)) && (ctrl_m.dir < (Math.PI * 7 / 4)) ) { // вниз
            if ((ctrl_m.cmd === 'l') || (ctrl_m.cmd === 'r')) { // в повороте - отменяем поворот
                mTurnCancel();
            }
            else {
                v = ctrl_m.v_dst;
                if (v > -3) {
                    v -= 1;
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
                        if (sendToESP(ctrl_m.token, cmd, v)) {
                            ctrl_m.cmd = cmd;
                            ctrl_m.v_dst = v;
                        }
                    }
                }
            }
        }
        else if ( (ctrl_m.dir > (Math.PI * 3 / 4)) && (ctrl_m.dir < (Math.PI * 5 / 4)) ) { // влево
            if (ctrl_m.cmd === 'r') {   // если был поворот вправо - просто отменяем
                mTurnCancel();
            }
            else {
                if (sendToESP(ctrl_m.token, 'l', 0)) {
                    ctrl_m.cmd = 'l';
                }                
            }
        }
        else {  // вправо
            if (ctrl_m.cmd === 'l') {   // если был поворот влево - отменяем
                mTurnCancel();
            }
            else {
                if (sendToESP(ctrl_m.token, 'r', 0)) {
                    ctrl_m.cmd = 'r';
                }                
            }
        }
    }
}

function steppCommand(ctrl_st) {
    var cmd = 's';
    var param1 = 0;
    if (ctrl_st.dist < 20) { // нажатие в центре - стоп или возврат в 0

        switch (ctrl_st.cmd) {
            case 's':               // s уже посылали, посылаем h - home без сброса оборотов
                cmd = 'h';
                break;
            case 'h':               // h уже посылали, посылаем h - home со сбросом оборотов 
                cmd = 'h';
                param1 = 1;
                break;
            default:
                cmd = 's';
        }

        if (sendToESP(ctrl_st.token, cmd, param1)) {
            ctrl_st.cmd = cmd;
            ctrl_st.angle_dst = Math.PI / 2;
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
                    if (sendToESP(ctrl_st.token, cmd, 0))
                    {
                        ctrl_st.cmd = cmd;
                    }
                }
            }
            else if ( (r_angle < (Math.PI / 2)) || (r_angle > (3 * Math.PI / 2)) ) { // вправо
                if (ctrl_st.cmd !== 'r') {  // если не повторяем прежнюю команду
                    if (ctrl_st.cmd === 'l') {  // в противоположную сторону - стоп
                        cmd = 's';
                        ctrl_st.angle_dst = Math.PI;
                    }
                    else {
                        cmd = 'r';
                    }
                    if (sendToESP(ctrl_st.token, cmd, 0))
                    {
                        ctrl_st.cmd = cmd;
                    }
                }
            }
            // на остальное не обращаем внимание
        }
        else {  // режим - угол - установка ШД в заданное положение
            var an = r_angle - Math.PI / 2; // поворачиваем вправо на Pi/2
            if (an < 0) {
                an += Math.PI * 2;
            }
            param1 = Math.round(an * 512 / (2 * Math.PI));  // пересчитываем в шаги ШД
            cmd = 'a';
            if (sendToESP(ctrl_st.token, cmd, param1))
            {
                ctrl_st.cmd = cmd;
                ctrl_st.angle_dst = r_angle;
            }
        }
    }    
};


function servoCommand(ctrl_se) {

    function angleLimit(a) {
        var an = a;
        if (an > Math.PI) {
            if (an < (Math.PI * 5 / 4)) {
                an = Math.PI;
            }
            else if (an > (Math.PI * 7 / 4)) {
                an = 0;
            }
            else {
                an = Math.PI / 2;   // нижний сектор - стоп
            }
        }
        return an;
    }

    function servoAngle(al) {
        return 18 + Math.round(al * 18 / Math.PI);
    }

    var angle = Math.PI / 2; // если нажатие будет в центре - возврат в Pi/2
    if (ctrl_se.dist > 20) {
        angle = angleLimit(ctrl_se.dir);
    }

    if (sendToESP(ctrl_se.token, 's', servoAngle(angle))) {
        ctrl_se.angle_dst = angle;
    }
};


var joystickStepp1 = nipplejs.create({
    zone: document.getElementById('stepp1'),
    mode: 'static',
    position: getJoystickPos('stepp1'),
    color: 'green',
    size: 120
});
joystickStepp1.on('move', function (evt, nipple) {
    ctrlStepp.a.dir = nipple.angle.radian;
    ctrlStepp.a.dist = nipple.distance;
});
joystickStepp1.on('end', function () {
    var outputEl = document.getElementById('stepp1_info');
    outputEl.innerHTML = 'dir=' + ctrlStepp.a.dir.toFixed(4) + ' dist=' + ctrlStepp.a.dist.toFixed(4);
    if (ctrlFlag) {
        steppCommand(ctrlStepp.a);
        jPosDraw(ctrlStepp.a);
    }
});

var joystickStepp2 = nipplejs.create({
    zone: document.getElementById('stepp2'),
    mode: 'static',
    position: getJoystickPos('stepp2'),
    color: 'blue',
    size: 120
});
joystickStepp2.on('move', function (evt, nipple) {
    ctrlStepp.b.dir = nipple.angle.radian;
    ctrlStepp.b.dist = nipple.distance;
});
joystickStepp2.on('end', function () {
    var outputEl = document.getElementById('stepp2_info');
    outputEl.innerHTML = 'dir=' + ctrlStepp.b.dir.toFixed(0) + ' dist=' + ctrlStepp.b.dist.toFixed(0);
    if (ctrlFlag) {
        steppCommand(ctrlStepp.b);
        jPosDraw(ctrlStepp.b);
    }
});

var joystickMotors = nipplejs.create({
    zone: document.getElementById('motors'),
    mode: 'static',
    position: getJoystickPos('motors'),
    color: 'brown',
    //lockX: true,
    size: 120
});
joystickMotors.on('move', function (evt, nipple) {
    ctrlMotors.dir = nipple.angle.radian;
    ctrlMotors.dist = nipple.distance;

});
joystickMotors.on('end', function () {
    var outputEl = document.getElementById('motors_info');
    outputEl.innerHTML = 'dir=' + ctrlMotors.dir.toFixed(0) + ' dist=' + ctrlMotors.dist.toFixed(0);
    if (ctrlFlag) {
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
    size: 128
});
joystickServo.on('move', function (evt, nipple) {
    ctrlServo.dir = nipple.angle.radian;
    ctrlServo.dist = nipple.distance;
});
joystickServo.on('end', function () {
    var outputEl = document.getElementById('servo_info');
    outputEl.innerHTML = 'dir=' + ctrlServo.dir.toFixed(0) + ' dist=' + ctrlServo.dist.toFixed(2);
    if (ctrlFlag) {
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

function crtrl_on(sw) {
	if (sw.checked) {
        jPosDraw(ctrlStepp.a);
        jPosDraw(ctrlStepp.b);
        jPosMotDraw(ctrlMotors);
        jPosDrawServo(ctrlServo);
        ctrlFlag = true;
	}
    else {
        ctrlFlag = false;
    }
}

function led_switch(clicked_id) {
    var butt = document.getElementById(clicked_id);
    var led = parseInt(clicked_id[6]);

    var l = ctrlLeds[led] + 1;
    if (l > 2) {
        l = 0;
    }
    var mask = 1 << led;
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


    if ( sendToESP('leds', cmd, mask) ) {
        butt.style['background-image'] = st;
        ctrlLeds[led] = l;
    }
}

function resize_on() {

}

