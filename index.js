import { MnistData } from "./data.js";

// initialising variables to be used
var canvas, ctx, classifyButton, clearButton, trainLabel, predictionLabel;
var pos = { x: 0, y: 0 };
var rawImage;
var model;

// canvas handlers
function setPosition(e) {
  pos.x = e.clientX - 100;
  pos.y = e.clientY - 100;
}

function draw(e) {
  if (e.buttons != 1) return;
  ctx.beginPath();
  ctx.lineWidth = 24;
  ctx.lineCap = "round";
  ctx.strokeStyle = "white";
  ctx.moveTo(pos.x, pos.y);
  setPosition(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  rawImage.src = canvas.toDataURL("image/png");
}

function erase() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 280, 280);
  predictionLabel.innerHTML = "";
}

// tfjs handlers
function getModel() {
  model = tf.sequential();
  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 1],
      kernelSize: 3,
      filters: 8,
      activation: "relu",
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  model.add(
    tf.layers.conv2d({ filters: 16, kernelSize: 3, activation: "relu" })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 128, activation: "relu" }));
  model.add(tf.layers.dense({ units: 10, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return model;
}

async function train(model, data) {
  const metrics = ["loss", "val_loss", "accuracy", "val_accuracy"];
  const container = { name: "Model Training", styles: { height: "640px" } };
  const fitCallbacks = tfvis.show.fitCallbacks(container, metrics);

  const BATCH_SIZE = 512;
  const TRAIN_DATA_SIZE = 5500;
  const TEST_DATA_SIZE = 1000;

  const [trainXs, trainYs] = tf.tidy(() => {
    const d = data.nextTrainBatch(TRAIN_DATA_SIZE);
    return [d.xs.reshape([TRAIN_DATA_SIZE, 28, 28, 1]), d.labels];
  });

  const [testXs, testYs] = tf.tidy(() => {
    const d = data.nextTestBatch(TEST_DATA_SIZE);
    return [d.xs.reshape([TEST_DATA_SIZE, 28, 28, 1]), d.labels];
  });

  return model.fit(trainXs, trainYs, {
    batchSize: BATCH_SIZE,
    validationData: [testXs, testYs],
    epochs: 20,
    shuffle: true,
    callbacks: fitCallbacks,
  });
}

function classify() {
  predictionLabel.innerHTML = "";
  var raw = tf.browser.fromPixels(rawImage, 1);
  var resized = tf.image.resizeBilinear(raw, [28, 28]);
  var tensor = resized.expandDims(0);
  var prediction = model.predict(tensor);

  var pIndex = tf.argMax(prediction, 1).dataSync();

  predictionLabel.innerHTML = pIndex;
}

// get all references
function init() {
  canvas = document.getElementById("canvas");
  rawImage = document.getElementById("canvasimg");

  ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 280, 280);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mousedown", setPosition);
  canvas.addEventListener("mouseenter", setPosition);

  classifyButton = document.getElementById("classb");
  classifyButton.addEventListener("click", classify);

  clearButton = document.getElementById("cb");
  clearButton.addEventListener("click", erase);

  trainLabel = document.getElementById("trainlabel");
  predictionLabel = document.getElementById("prediction");
}

async function start() {
  const data = new MnistData();
  await data.load();

  const model = getModel();
  tfvis.show.modelSummary({ name: "Model Architecture" }, model);

  await train(model, data);
  //await model.save('downloads://my_model')
  init();
  trainLabel.innerHTML = "Training is done, try classifying your handwriting!";
}

document.addEventListener("DOMContentLoaded", start);
