// Snowfall
// idea: https://youtu.be/cl-mHFCGzYk

let snow = []; //存放调整好大小的食物
let gravity;

let zOff = 0;

let spritesheet;
let textures = []; //存放食物素材

// ml5 Face Detection Model
let faceapi;
let detections = [];
// Video
let video;
const faceOptions = { 
  withLandmarks: true, 
  withExpressions: false, 
  withDescriptors: false 
};

let username;
let start = false;

function preload() { //加载食物图片
  spritesheet = loadImage('../assets/Ghostpixxells_pixelfood.png'); 
  //console.log(nicknameInput);
  //song = loadSound('2019-01-02_-_8_Bit_Menu_-_David_Renda_-_FesliyanStudios.com.mp3')
  //song = new Audio('2019-01-02_-_8_Bit_Menu_-_David_Renda_-_FesliyanStudios.com.mp3');
}

var socket; //创建一个 socket 对象
function setup() {
  createCanvas(windowWidth, windowHeight); //画布大小跟随窗口
  gravity = createVector(0, 0.8); //设定重力

  //裁剪图像素材
  for (let x = 0; x < spritesheet.width; x += 32) { //创建食物
    for (let y = 0; y < spritesheet.height; y += 32) { //这个spritsheet是72px的
      let img = spritesheet.get(x, y, 32, 32); //获取食物图片
      image(img, x, y);  //取(x, y)处的图片
      textures.push(img); //放在textures里
    }
    console.log(textures);
  }

  //生成掉落食物
  for (let i = 0; i < 30; i++) { //生成30个食物
    let x = random(width);
    let y = random(height);
    let design = random(textures);
    snow.push(new Snowflake(x, y, design));  //最终生成的图片放入snow里
  }

  //准备camera
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide(); //让video显示在canvas上而不是堆叠元素
  faceapi = ml5.faceApi(video, faceOptions, faceReady); //调用api

  //新建一个socket连接到server
  //socket = io.connect('http://localhost:3000'); 
  //socket = io.connect('https://multiplayer-handsfree-flappy-b.herokuapp.com/');
  //isClicked = 0 //开始标志位
  document.querySelector('#update-nickname').addEventListener('click', () => { //按下按钮后连接到server
    start = true;
    //socket = io.connect('http://localhost:3000'); 
    socket = io.connect('https://multiplayer-handsfree-flappy-b.herokuapp.com/');
    //username = $("#nickname-input").attr("value");
    username = document.querySelector('#nickname-input').value;
    console.log('username: ',username);
  })

}

let mouthPos;
function draw() {
  background(0, 255, 0);
  //draw the video
  image(video, 0, 0, width, width * video.height / video.width);
  // Just look at the first face and draw all the points
  if (detections) {
    if (detections.length > 0) {
      // drawBox(detections);
      mouthPos = drawLandmarks(detections);
    }
  }

  if(start){
    zOff += 0.1;
    for (let i = 0; i < snow.length; i += 1){
      flake = snow[i]
    //for (flake of snow) {
      let xOff = flake.pos.x / width;
      let yOff = flake.pos.y / height;
      let wAngle = noise(xOff, yOff, zOff) * TWO_PI;
      let wind = p5.Vector.fromAngle(wAngle);
      if(mouthPos){
        eat(mouthPos,flake,i);
      }
      wind.mult(0.01);
      flake.applyForce(gravity);
      flake.applyForce(wind);
      flake.update();
      flake.render(); 
    }
  }
}

function faceReady() {
  faceapi.detect(gotFaces);
}

// Got faces
function gotFaces(error, result) {
  if (error) {
    console.log(error);
    return;
  }
  detections = result;
  faceapi.detect(gotFaces);
}

function drawLandmarks(detections) {
  noFill();
  stroke(161, 95, 251);
  strokeWeight(2);
  for (let i = 0; i < detections.length; i += 1) {
    const mouth = detections[i].parts.mouth;
    // const nose = detections[i].parts.nose;
    // const leftEye = detections[i].parts.leftEye;
    // const rightEye = detections[i].parts.rightEye;
    // const rightEyeBrow = detections[i].parts.rightEyeBrow;
    // const leftEyeBrow = detections[i].parts.leftEyeBrow;
    drawPart(mouth, true);
    // drawPart(nose, false);
    // drawPart(leftEye, true);
    // drawPart(leftEyeBrow, false);
    // drawPart(rightEye, true);
    // drawPart(rightEyeBrow, false);
    return mouth
  }
}

function drawPart(feature, closed) {
  beginShape();
  for (let i = 0; i < feature.length; i += 1) {
    const x = feature[i]._x;
    const y = feature[i]._y;
    vertex(x, y);
  }
  if (closed === true) {
    endShape(CLOSE);
  } else {
    endShape();
  }
}


let score = 0;
let $score = document.querySelector('#score');
function eat(mouth, flake, i){
  //print(mouth)
  let top = 999999;
  let bottom = -1;
  let left = 999999;
  let right = -1;
  for (point of mouth){
    top = min(top, point._y);
    bottom = max(bottom, point._y);
    left = min(left, point._x);
    right = max(right, point._x);
  }
 
  if (flake.pos.y > top & flake.pos.y < bottom){
    if (flake.pos.x > left & flake.pos.x < right){
        score += 1;
        $score.innerHTML = score;
        if (i > -1) { 
          snow.splice(i, 1);  //这个img消失
          snow.push(new Snowflake(random(width), random(height), random(textures))); //再生成一个新的加入
        }
        //发送分数给server
        socket.emit('updateScore', score, username); 
    }
  }

}

// let scoreList = 0;
// let $scoreList = document.querySelector('#score-list');
socket.on('displayScore', function (scores) {
  console.log('receive scores: ', scores);
  sortLeaderboard(scores);
})

//let scoreLabel = document.getElementById("score-label");
let topScoreLabel = document.getElementById("top-label");
let scoreList = document.getElementById("score-list");
function sortLeaderboard(scores){
  //scoreLabel.innerHTML = "Score: " + myScore;
  let listItems = "";
  scores.forEach((bird) => {
    if(bird.username != ''){
      listItems +=
      "<li class='score-item'><span class='name'>" +
      bird.username +
      "</span><span class='points'>" +
      bird.score +
      "pts</span></li>";
    }
  });
  scoreList.innerHTML = listItems;
}
