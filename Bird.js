class Bird {
  constructor(weights) {
    this.x = config.birdLocationX;
    this.y = 20;
    this.velocity = 0;
    this.gravity = 0.25;
    this.isDead = false;
    this.score = 0;
    this.model = tf.sequential();

    this.model.add(
      tf.layers.dense({
        inputShape: [5],
        units: 3,
        activation: 'relu',
      })
    );

    this.model.add(
      tf.layers.dense({
        units: 1,
        activation: 'sigmoid',
      })
    );

    if (weights) this.model.setWeights(weights);

    this.model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
  }

  think() {
    if (this.isDead) return;

    let x = closestPipe?.x ?? canvas.width;
    let y = closestPipe?.y ?? canvas.height / 2;

    // Prepare the input data for the model
    const inputTensor = tf.tensor2d([
      [round(this.x), round(this.y), round(this.velocity), round(x), round(y)],
    ]);

    const output = this.model.predict(inputTensor);
    // Get the predicted probability of jumping
    const jumpProb = output.dataSync()[0];
    output.dispose();
    inputTensor.dispose();
    // Determine whether to jump or not based on the predicted probability
    if (jumpProb > 0.5) {
      this.jump();
    }
  }

  draw() {
    if (this.isDead) return;
    ctx.beginPath();
    ctx.fillStyle = 'black';
    ctx.fillRect(
      this.x,
      this.y,
      config.render.birdSize,
      config.render.birdSize
    );
    ctx.stroke();
  }

  update() {
    if (this.isDead) return;

    this.velocity += this.gravity;
    this.y += this.velocity;
    this.score++;
  }

  jump() {
    this.velocity = -5;
  }

  dispose() {
    this.model.dispose();
  }
}
