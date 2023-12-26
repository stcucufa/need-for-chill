function svg(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [attribute, value] of Object.entries(attributes)) {
        element.setAttribute(attribute, value);
    }
    return element;
}

const lerp = (x1, x2, t) => x1 * (1 - t) + x2 * t;
const curve = (x1, y1, x2, y2, t = 0.5) => `
    M${x1},${y1}
    C${lerp(x2, x1, t)},${y1} ${lerp(x1, x2, t)},${y2} ${x2},${y2}
`;
const rad = angle => angle / 180 * Math.PI;
const deg = th => th * 180 / Math.PI;

const Road = {
    create(element) {
        const road = Object.assign(Object.create(this), { points: [[0, 0]], element, curves: [] });
        road.curveElements = road.element.appendChild(svg("g"));
        road.pointElements = road.element.appendChild(svg("g"));
        road.addElementForPoint(road.points[0]);
        return road;
    },

    R: 5,
    DX: 100,
    MAX_ANGLE: 30,

    addElementForPoint([cx, cy]) {
        return this.pointElements.appendChild(svg("circle", { cx, cy, r: this.R }));
    },

    addPoint() {
        const [x1, y1] = this.points.at(-1);
        const x2 = x1 + this.DX;
        const y2 = y1;
        const p = [x2, y2];
        this.points.push(p);
        const element = this.addElementForPoint(p);
        element.addEventListener("pointerdown", this);
        this.curves.push(this.curveElements.appendChild(svg("path", { d: curve(x1, y1, x2, y2) })));
    },

    handleEvent(event) {
        switch (event.type) {
            case "pointerdown":
                event.preventDefault();
                document.addEventListener("pointermove", this);
                document.addEventListener("pointerup", this);
                const index = Array.prototype.indexOf.call(this.pointElements.children, event.target);
                this.drag = {
                    element: event.target,
                    point: this.points[index],
                    curve: this.curves[index - 1],
                    nextCurve: this.curves[index],
                    x: event.clientX,
                    y: event.clientY,
                    gx: Math.cos(rad(this.MAX_ANGLE)),
                    gy: Math.sin(rad(this.MAX_ANGLE))
                };
                [this.drag.x1, this.drag.y1] = this.points[index - 1];
                [this.drag.x2, this.drag.y2] = this.drag.point;
                if (this.drag.nextCurve) {
                    [this.drag.x3, this.drag.y3] = this.points[index + 1];
                }
                break;
            case "pointermove":
                let x2 = this.drag.x2 + event.clientX - this.drag.x;
                let y2 = this.drag.y2 + event.clientY - this.drag.y;
                const px = x2 - this.drag.x1;
                const py = y2 - this.drag.y1;
                const angle = deg(Math.atan2(py, px));
                if (angle > this.MAX_ANGLE) {
                    const d = px * this.drag.gx + py * this.drag.gy;
                    x2 = this.drag.x1 + d * this.drag.gx;
                    y2 = this.drag.y1 + d * this.drag.gy;
                } else if (angle < -this.MAX_ANGLE) {
                    const d = px * this.drag.gx - py * this.drag.gy;
                    x2 = this.drag.x1 + d * this.drag.gx;
                    y2 = this.drag.y1 - d * this.drag.gy;
                }
                if (this.drag.nextCurve) {
                    const qx = this.drag.x3 - x2;
                    const qy = y2 - this.drag.y3;
                    const angle = deg(Math.atan2(qy, qx));
                    if (angle > this.MAX_ANGLE) {
                        const d = qx * this.drag.gx + qy * this.drag.gy;
                        x2 = this.drag.x3 - d * this.drag.gx;
                        y2 = this.drag.y3 + d * this.drag.gy;
                    } else if (angle < -this.MAX_ANGLE) {
                        const d = qx * this.drag.gx - qy * this.drag.gy;
                        x2 = this.drag.x3 - d * this.drag.gx;
                        y2 = this.drag.y3 - d * this.drag.gy;
                    }
                }
                this.drag.point[0] = x2;
                this.drag.point[1] = y2;
                this.drag.element.setAttribute("cx", x2);
                this.drag.element.setAttribute("cy", y2);
                this.drag.curve.setAttribute("d", curve(this.drag.x1, this.drag.y1, x2, y2));
                this.drag.nextCurve?.setAttribute("d", curve(x2, y2, this.drag.x3, this.drag.y3));
                break;
            case "pointerup":
                document.removeEventListener("pointermove", this);
                document.removeEventListener("pointerup", this);
                delete this.drag;
                break;
        }
    }
};

const road = Road.create(document.querySelector("svg g"));
document.querySelector("button").addEventListener("click", () => { road.addPoint(); });
