const Camera = {
    create(x, y, z, fov) {
        const camera = Object.assign(Object.create(this), { x, y, z });
        camera.fov = fov;
        return camera;
    },

    set fov(angle) {
        this.d = 1 / Math.tan(Math.PI * angle / 360);
    },

    horizon(distance, width, height) {
        return this.transformPoint([0, 0, this.z + distance], width, height)[1];
    },

    translate(p) {
        return [p[0] - this.x, p[1] - this.y, Math.abs(p[2] - this.z)];
    },

    project(p) {
        return [p[0] * this.d / p[2], p[1] * this.d / p[2]];
    },

    scale(p, width, height) {
        return [width / 2 * (1 + p[0]), height / 2 * (1 - p[1])];
    },

    transformPoint(p, width, height) {
        return this.scale(this.project(this.translate(p)), width, height);
    },
};

const ROAD_WIDTH = 400;
const ROAD_LENGTH = 200;
const MIRROR_W = 0.2;
const MIRROR_H = 0.07;

const Settings = {
    cameraX: [ROAD_WIDTH / 3, -ROAD_WIDTH, ROAD_WIDTH, value => { camera.x = value; }],
    cameraHeight: [150, 0, 1000, value => { camera.y = value; }],
    cameraFOV: [120, 0, 180, value => { camera.fov = value; }],
    drawCount: [40, 0, 100, value => { Settings.drawCount[0] = value; }],
    speed: [500, 0, 2000, value => { Settings.speed[0] = value; }],
};

const controls = document.querySelector("div.controls");
const cameraSpan = controls.appendChild(document.createElement("p"));
for (const [name, setting] of Object.entries(Settings)) {
    const p = controls.appendChild(document.createElement("p"));
    p.textContent = `${name}: `;
    const range = p.appendChild(document.createElement("input"));
    const span = p.appendChild(document.createElement("span"));
    span.textContent = setting[0];
    range.setAttribute("type", "range");
    range.setAttribute("value", setting[0]);
    range.setAttribute("min", setting[1]);
    range.setAttribute("max", setting[2]);
    range.addEventListener("input", () => {
        setting[3](range.valueAsNumber);
        span.textContent = range.value;
    });
}

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const N = 1000;
const SEGMENTS = Array(N).fill(0).map((_, i) => ([0, i * ROAD_LENGTH]));
// const SEGMENTS = Array(N).fill(0).map((_, i) => ([Math.cos(i / 10) * ROAD_WIDTH, i * ROAD_LENGTH]));

const camera = Camera.create(
    ROAD_WIDTH / 3,
    Settings.cameraHeight[0],
    Settings.drawCount[2] * ROAD_LENGTH,
    Settings.cameraFOV[0]
);

function update(dt) {
    camera.z += dt * Settings.speed[0];
}

function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const size = Math.min(width, height);

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;

    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.translate(0, Math.max(0, height - size));
    context.beginPath();
    context.strokeStyle = "#102040";

    let offset = Math.floor(camera.z / ROAD_LENGTH);
    if (offset >= SEGMENTS.length - Settings.drawCount[0] - 1) {
        offset = Settings.drawCount[2];
        camera.z = offset * ROAD_LENGTH + camera.z / ROAD_LENGTH;
    }
    cameraSpan.textContent = `Camera: ${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}, ${Math.round(camera.z / 100) * 100} (${offset})`;

    for (let i = 0; i < Settings.drawCount[0]; ++i) {
        const [x0, z0] = SEGMENTS[offset + i];
        const [x1, z1] = SEGMENTS[offset + i + 1];
        let p0 = camera.transformPoint([x0 - ROAD_WIDTH, 0, z0], width, height);
        let p1 = camera.transformPoint([x1 - ROAD_WIDTH, 0, z1], width, height);
        let p2 = camera.transformPoint([x1 + ROAD_WIDTH, 0, z1], width, height);
        let p3 = camera.transformPoint([x0 + ROAD_WIDTH, 0, z0], width, height);
        let p4 = camera.transformPoint([x0, 0, z0], width, height);
        let p5 = camera.transformPoint([(x1 + x0) / 2, 0, z0 + ROAD_LENGTH / 2], width, height);

        context.moveTo(p0[0], p0[1]);
        context.lineTo(p1[0], p1[1]);
        context.moveTo(p2[0], p2[1]);
        context.lineTo(p3[0], p3[1]);
        context.moveTo(p4[0], p4[1]);
        context.lineTo(p5[0], p5[1]);
    }

    const y = camera.horizon(Settings.drawCount[0] * ROAD_LENGTH, width, height);
    context.moveTo(0, y);
    context.lineTo(width, y);

    context.stroke();

    // Rear-view mirror
    context.save();
    context.translate(width / 2, size / 4);
    const w = size * MIRROR_W;
    const h = size * MIRROR_H;

    context.moveTo(0, 0);
    context.lineTo(w, 0);
    context.lineTo(w, h);
    context.lineTo(0, h);
    context.lineTo(0, 0);
    context.clip();

    /*context.translate(w, 0);
    context.scale(-1, 1);*/

    for (let i = 0; i < Settings.drawCount[0]; ++i) {
        const [x0, z0] = SEGMENTS[offset - i + 1];
        const [x1, z1] = SEGMENTS[offset - i];
        let p0 = camera.transformPoint([x0 - ROAD_WIDTH, 0, z0], w, h);
        let p1 = camera.transformPoint([x1 - ROAD_WIDTH, 0, z1], w, h);
        let p2 = camera.transformPoint([x1 + ROAD_WIDTH, 0, z1], w, h);
        let p3 = camera.transformPoint([x0 + ROAD_WIDTH, 0, z0], w, h);
        let p4 = camera.transformPoint([x0, 0, z0], w, h);
        let p5 = camera.transformPoint([(x1 + x0) / 2, 0, z1 + ROAD_LENGTH / 2], w, h);

        context.moveTo(p0[0], p0[1]);
        context.lineTo(p1[0], p1[1]);
        context.moveTo(p2[0], p2[1]);
        context.lineTo(p3[0], p3[1]);
        context.moveTo(p4[0], p4[1]);
        context.lineTo(p5[0], p5[1]);
    }

    const yy = camera.horizon(Settings.drawCount[0] * ROAD_LENGTH, w, h);
    context.moveTo(0, yy);
    context.lineTo(w, yy);

    context.stroke();
    context.restore();
    context.moveTo(0, y);
    context.lineTo(width, y);

    context.restore();
}

let lastUpdate = performance.now();
window.requestAnimationFrame(function loop() {
    const now = performance.now();
    update((now - lastUpdate) / 1000);
    draw();
    lastUpdate = now;
    window.requestAnimationFrame(loop);
});
