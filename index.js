/**  @type {HTMLCanvasElement} */
var canvas = document.getElementById('game-canvas');
canvas.width = config.render.canvasWidth;
canvas.height = config.render.canvasHeight;
var ctx = canvas.getContext('2d');

const generationCountText = document.getElementById('generation');
const populationCountText = document.getElementById('population');
const scoreCountText = document.getElementById('score');

tf.setBackend('cpu');

let generation = 0;
let score = 0;

let birds = [];
var pipes = [];

let closestPipe = null;

initilize();

// Start the game
var frameCount = 0;
requestAnimationFrame(gameLoop);

let selectedBird = null;

// The game loop
function gameLoop() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let bird of birds) {
    bird.update();
    bird.think();
    bird.draw();
  }

  if (selectedBird != null) {
    selectedBird.draw();
  } else {
    selectBirdForDraw();
  }

  // Draw the pipes

  for (let pipe of pipes) {
    ctx.beginPath();
    ctx.fillStyle = pipe == closestPipe ? 'red' : 'black';
    ctx.fillRect(pipe.x, 0, config.render.pipeSize, pipe.y);
    ctx.fillRect(
      pipe.x,
      pipe.y + config.render.pipeGap,
      config.render.pipeSize,
      canvas.height
    );
    ctx.stroke();

    // Move the pipes to the left
    pipe.x -= 2;
  }

  // Check for collision with the pipes
  for (let pipe of pipes) {
    for (let bird of birds) {
      if (
        bird.x + config.render.birdSize > pipe.x &&
        bird.x < pipe.x + config.render.pipeSize
      ) {
        if (
          bird.y < pipe.y ||
          bird.y + config.render.birdSize > pipe.y + config.render.pipeGap
        ) {
          birdDied(bird);
        }
      }
    }
  }

  for (let bird of birds) {
    // Check for collision with the bottom and top of the canvas
    if (bird.y + config.render.birdSize > canvas.height || bird.y < 0) {
      birdDied(bird);
    }
  }

  // Add a new pipe every 100 frames
  if (frameCount % config.pipeGenerationTime === 0) {
    pipes.push({
      x: canvas.width,
      y: Math.random() * (canvas.height - config.render.pipeGap),
    });
  }

  if (pipes[0]) {
    if (closestPipe == null) closestPipe = pipes[0];
    let diff = closestPipe.x + config.render.pipeSize - config.birdLocationX;
    if (diff < 0) {
      score += 1;
      closestPipe = pipes[1];
    }
  }

  // Update the frame count
  frameCount++;

  pipes = pipes.filter((p) => p.x > 0);

  const go = birds.every((b) => b.isDead);

  if (go) {
    gameOver();
  }
  populationCountText.innerHTML =
    'Population: ' + birds.filter((v) => !v.isDead).length;
  scoreCountText.innerHTML = 'Score: ' + score;

  // Request another animation frame
  requestAnimationFrame(gameLoop);
}

function initilize() {
  for (let i = 0; i < config.populationSize; i++) {
    birds.push(new Bird());
  }
}

function gameOver() {
  // Create new birds by combining the weights of the top K birds
  tf.tidy(() => {
    const sortedPopulation = birds.sort((a, b) => b.score - a.score);
    const topKPopulation = sortedPopulation.slice(0, 1)[0];
    let newPopulation = [];
    let weights = topKPopulation.model.getWeights().slice();
    for (let i = 0; i < config.populationSize; i++) {
      let mutatedWeights = mutate(weights);
      // let weights = topKPopulation.model.getWeights().slice();
      // for (let j = 0; j < topKPopulation.model.getWeights().length; j++) {
      //   weights[j] = topKPopulation.model.getWeights()[j].clone();
      // }
      newPopulation.push(new Bird(mutatedWeights));
    }
    birds.map((b) => b.dispose());
    frameCount = 0;
    score = 0;
    pipes = [];
    birds = newPopulation;
    closestPipe = null;
    generation++;
    generationCountText.innerHTML = 'Generation: ' + generation;
  });
}

function birdDied(bird) {
  bird.isDead = true;
  if (bird == selectedBird) {
    selectBirdForDraw();
  }
}

function selectBirdForDraw() {
  selectedBird = birds.find((v) => !v.isDead);
}

function mutate(weights) {
  return tf.tidy(() => {
    const mutatedWeights = [];
    for (let i = 0; i < weights.length; i++) {
      let tensor = weights[i];
      let shape = weights[i].shape;
      let values = tensor.dataSync().slice();

      values = values.map((v) =>
        Math.random() < config.mutationRate ? v + gaussianRandom() : v
      );
      let newTensor = tf.tensor(values, shape);
      mutatedWeights[i] = newTensor;
    }
    return mutatedWeights;
  });
}

function round(number, scale = 2) {
  return Math.round(number * (10 ^ scale)) / (10 ^ scale);
}

function gaussianRandom() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return gaussianRandom(); // resample between 0 and 1
  return num;
}
