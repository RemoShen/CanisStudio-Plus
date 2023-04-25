import Tool from "../util/tool";

export { Polygon, Point as PolygonPoint };
type Point = { x: number, y: number };

function pointDis(p1: Point, p2: Point): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function pointSub(p1: Point, p2: Point): Point {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

function pointDot(p1: Point, p2: Point): number {
    return p1.x * p2.x + p1.y * p2.y;
}

function pointCross(p1: Point, p2: Point): number {
    return p1.x * p2.y - p2.x * p1.y;
}

function pointToLine(p: Point, p1: Point, p2: Point): number {
    const pp1 = pointSub(p1, p);
    const p1p2 = pointSub(p2, p1);
    if (pointDot(pp1, p1p2) >= 0) {
        return pointDis(p, p1);
    }
    const pp2 = pointSub(p2, p);
    if (pointDot(pp2, p1p2) <= 0) {
        return pointDis(p, p2);
    }
    return Math.abs(pointCross(pp1, pp2) / pointDis(p1, p2));
}

class Transform {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;

    constructor(a: number, b: number, c: number, d: number, e: number, f: number) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
    }

    applyToPoint(p: Point): Point {
        const x = p.x;
        const y = p.y;
        return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f };
    }

    toString(): string {
        return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`
    }
}

function mergeTransform(m1: Transform, m2: Transform): Transform {
    return new Transform(
        m1.a * m2.a + m1.c * m2.b,
        m1.b * m2.a + m1.d * m2.b,
        m1.a * m2.c + m1.c * m2.d,
        m1.b * m2.c + m1.d * m2.d,
        m1.a * m2.e + m1.c * m2.f + m1.e,
        m1.b * m2.e + m1.d * m2.f + m1.f
    )
}

class Polygon {
    vertices: Point[] = [];
    useBoundingBox: boolean = false;
    svgWidth: number = 0;
    svgHeight: number = 0;
    yMax: number = -Infinity;
    yMin: number = Infinity;
    xMax: number = -Infinity;
    xMin: number = Infinity;
    closed: boolean = true;
    length: number = 0;
    massCenter: Point = { x: 0, y: 0 };

    isConnected(p: Polygon): boolean {
        const threshold = 1;
        const fp1 = this.vertices[0];
        const fp2 = p.vertices[0];
        const lp1 = this.vertices[this.vertices.length - 1];
        const lp2 = p.vertices[p.vertices.length - 1];
        if (pointDis(fp1, fp2) < threshold) {
            return true;
        }
        if (pointDis(fp1, lp2) < threshold) {
            return true;
        }
        if (pointDis(lp1, fp2) < threshold) {
            return true;
        }
        if (pointDis(lp1, lp2) < threshold) {
            return true;
        }
        return false
    }

    parseNumber(element: HTMLElement, name: string, defaultValue: number, relative: number): number {
        const s = element.getAttribute(name);
        if (s) {
            let index = s.indexOf("%");
            if (index != -1) {
                return relative * Number(s.slice(0, index)) / 100;
            }
            index = s.indexOf("px");
            if (index != -1) {
                return Number(s.slice(0, index));
            }
            return Number(s)
        }
        return defaultValue;
    }

    parseTransform(element: Element): Transform {
        let result = new Transform(1, 0, 0, 1, 0, 0);
        const transformAttr = element.getAttribute("transform");
        // return result;
        if (!transformAttr) {
            return result;
        }
        const transformStrs = transformAttr.split(")").filter(i => /[^\s]/.test(i));

        for (let i of transformStrs) {
            let [type, argList] = i.trim().split("(");
            const args = argList.split(/[ ,]+/).map(i => Number(i));
            if (type && type[0] == ",") {
                type = type.slice(1);
            }
            type = type.trim();
            switch (type) {
                case "matrix": {
                    console.assert(args.length >= 6);
                    result = mergeTransform(result, new Transform(
                        args[0],
                        args[1],
                        args[2],
                        args[3],
                        args[4],
                        args[5]
                    ))
                    break;
                }
                case "translate": {
                    console.assert(args.length >= 2);
                    result = mergeTransform(result, new Transform(1, 0, 0, 1, args[0], args[1]));
                    break;
                }
                case "rotate": {
                    console.assert(args.length >= 1);
                    const angle = args[0] / 180 * Math.PI;
                    let centerX = 0;
                    let centerY = 0;
                    if (args.length >= 3) {
                        centerX = args[1];
                        centerY = args[2];
                    }
                    const c = Math.cos(angle);
                    const s = Math.sin(angle);
                    result = mergeTransform(result, new Transform(
                        c, s, -s, c,
                        centerX * (1 - c) + centerY * s,
                        - centerX * s + centerY * (1 - c)
                    ));
                    break;
                }
                case "scale": {
                    console.assert(args.length >= 1);
                    const scaleX = args[0];
                    let scaleY = scaleX;
                    if (args.length >= 2) {
                        scaleY = args[1]
                    }
                    result = mergeTransform(result, new Transform(scaleX, 0, 0, scaleY, 0, 0));
                    break;
                }
                case "skewX": {
                    console.assert(args.length >= 1);
                    const angle = args[0] / 180 * Math.PI;
                    result = mergeTransform(result, new Transform(1, 0, Math.tan(angle), 1, 0, 0));
                    break;
                }
                case "skewY": {
                    console.assert(args.length >= 1);
                    const angle = args[0] / 180 * Math.PI;
                    result = mergeTransform(result, new Transform(1, Math.tan(angle), 0, 1, 0, 0));
                    break;
                }
                default: {
                    console.warn("not support this type of transform: " + type);
                    this.useBoundingBox = true;
                    return result;
                }
            }
        }
        return result;
    }

    parseShape(element: HTMLElement) {
        this.vertices = [];
        switch (element.tagName) {
            case "rect": {
                const x = this.parseNumber(element, "x", 0, this.svgWidth);
                const y = this.parseNumber(element, "y", 0, this.svgHeight);
                const width = this.parseNumber(element, "width", 0, this.svgWidth);
                const height = this.parseNumber(element, "height", 0, this.svgHeight);
                this.vertices.push({ x: x, y: y });
                this.vertices.push({ x: x + width, y: y });
                this.vertices.push({ x: x + width, y: y + height });
                this.vertices.push({ x: x, y: y + height });
                break;
            }
            case "circle": {
                const cx = this.parseNumber(element, "cx", 0, this.svgWidth);
                const cy = this.parseNumber(element, "cy", 0, this.svgHeight);
                const r = this.parseNumber(element, "r", 0, Math.sqrt(
                    (this.svgHeight * this.svgHeight + this.svgWidth * this.svgWidth) / 2)
                );
                const numberSegs = Math.max(8, Math.min(40, Math.ceil(r)));
                let angle = 0;
                const angleInc = Math.PI * 2 / numberSegs;
                for (let i = 0; i < numberSegs; i++) {
                    this.vertices.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
                    angle += angleInc;
                }
                break;
            }
            case "line": {
                this.closed = false;
                const x1 = this.parseNumber(element, "x1", 0, this.svgWidth);
                const y1 = this.parseNumber(element, "y1", 0, this.svgHeight);
                const x2 = this.parseNumber(element, "x2", 0, this.svgWidth);
                const y2 = this.parseNumber(element, "y2", 0, this.svgHeight);
                this.vertices.push({ x: x1, y: y1 });
                this.vertices.push({ x: x2, y: y2 });
                break;
            }
            case "path": {
                this.parsePath(element);
                break;
            }
            default: {
                this.useBoundingBox = true;
                return;
            }
        }
    }

    getTransformFromChartContent(element: HTMLElement): Transform {
        let transform = this.parseTransform(element);
        let parent = element.parentElement;
        while (parent && parent.id != "chartContent") {
            transform = mergeTransform(this.parseTransform(parent), transform);
            parent = parent.parentElement;
        }
        return transform;
    }

    parsePath(element: HTMLElement) {
        const fill = element.getAttribute("fill");
        if (fill && fill.toLowerCase() === "none") {
            this.closed = false;
        }
        const d = element.getAttribute("d");
        if (!d) {
            console.error("not found d in path")
            this.useBoundingBox = true;
            return;
        }
        const commandStrs = d.split(/(?=[A-Za-z])/).filter(i => /[^\s]/.test(i));
        let types: string[] = [];
        let argLists: number[][] = [];
        for (let command of commandStrs) {
            types.push(command[0]);
            argLists.push(command.slice(1).split(/[\s,]+/).filter(i => !!i).map(i => Number(i)));
        }
        const numberCommands = commandStrs.length;

        let lastPoint: Point = { x: 0, y: 0 };
        let lastCV: Point = { x: 0, y: 0 };

        for (let i = 0; i < numberCommands; i++) {
            const type = types[i];
            const args = argLists[i];
            switch (type) {
                case "M":
                case "m": {
                    if (i != 0) {
                        console.error("not support multi parts in path");
                        this.useBoundingBox = true;
                        return;
                    }
                    console.assert(args.length >= 2);
                    lastPoint = { x: args[0], y: args[1] };
                    this.vertices.push(lastPoint);
                    break;
                }
                case "l":
                    console.assert(args.length >= 2);
                    args[0] += lastPoint.x;
                    args[1] += lastPoint.y;
                case "L": {
                    console.assert(args.length >= 2);
                    lastPoint = { x: args[0], y: args[1] };
                    this.vertices.push(lastPoint);
                    break;
                }
                case "h":
                    console.assert(args.length >= 1);
                    args[0] += lastPoint.x;
                case "H":
                    console.assert(args.length >= 1);
                    lastPoint = { x: args[0], y: lastPoint.y }
                    this.vertices.push(lastPoint);
                    break;
                case "v":
                    console.assert(args.length >= 1);
                    args[0] += lastPoint.y;
                case "V":
                    console.assert(args.length >= 1);
                    lastPoint = { x: lastPoint.x, y: args[0] }
                    this.vertices.push(lastPoint);
                    break;
                case "a":
                    console.assert(args.length >= 7);
                    args[5] += lastPoint.x;
                    args[6] += lastPoint.y;
                case "A": {
                    console.assert(args.length >= 7);
                    args[0] = Math.abs(args[0]);
                    args[1] = Math.abs(args[1]);
                    const theta = args[2] / 180 * Math.PI;
                    const cosTheta = Math.cos(theta);
                    const sinTheta = Math.sin(theta);
                    const transform = mergeTransform(
                        new Transform(1 / args[0], 0, 0, 1 / args[1], 0, 0),
                        new Transform(cosTheta, -sinTheta, sinTheta, cosTheta, 0, 0),
                    )
                    const invTransform = mergeTransform(
                        new Transform(cosTheta, sinTheta, -sinTheta, cosTheta, lastPoint.x, lastPoint.y),
                        new Transform(args[0], 0, 0, args[1], 0, 0),
                    )
                    const endPoint = transform.applyToPoint({ x: args[5] - lastPoint.x, y: args[6] - lastPoint.y });
                    const chordLen = Math.hypot(endPoint.x, endPoint.y);
                    const radius = Math.max(chordLen / 2, 1);
                    const dis = Math.sqrt(radius * radius - (chordLen / 2) * (chordLen / 2));
                    const rotated: Point = { x: -endPoint.y / chordLen * dis, y: endPoint.x / chordLen * dis };
                    let center: Point;
                    if (args[3] + args[4] == 1) {
                        center = { x: endPoint.x / 2 + rotated.x, y: endPoint.y / 2 + rotated.y };
                    } else {
                        center = { x: endPoint.x / 2 - rotated.x, y: endPoint.y / 2 - rotated.y };
                    } let t1 = Math.atan2(-center.y, -center.x);
                    const t2 = Math.atan2(endPoint.y - center.y, endPoint.x - center.x);
                    let angle = t1;
                    let sweepAngle = t2 - t1;
                    if (args[4] == 0) {
                        if (sweepAngle > 0) {
                            sweepAngle -= 2 * Math.PI;
                        }
                    } else {
                        if (sweepAngle < 0) {
                            sweepAngle += 2 * Math.PI;
                        }
                    }
                    const numberSegs = Math.min(40, Math.ceil((args[0] + args[1]) * Math.abs(sweepAngle) / 4 / Math.PI));
                    const angleInc = sweepAngle / numberSegs;
                    for (let i = 0; i < numberSegs; i++) {
                        angle += angleInc;
                        this.vertices.push(invTransform.applyToPoint({
                            x: center.x + radius * Math.cos(angle),
                            y: center.y + radius * Math.sin(angle)
                        }))
                    }

                    lastPoint = { x: args[5], y: args[6] };
                    break;
                }
                case "q":
                    console.assert(args.length >= 4);
                    args[0] += lastPoint.x;
                    args[1] += lastPoint.y;
                    args[2] += lastPoint.x;
                    args[3] += lastPoint.y;
                case "Q": {
                    console.assert(args.length >= 4);
                    const numberSegs = 8;
                    for (let i = 1; i <= numberSegs; i++) {
                        const t = i / numberSegs;
                        const c0 = (1 - t) * (1 - t);
                        const c1 = 2 * t * (1 - t);
                        const c2 = t * t;
                        this.vertices.push({
                            x: lastPoint.x * c0 + args[0] * c1 + args[2] * c2,
                            y: lastPoint.y * c0 + args[1] * c1 + args[3] * c2
                        })
                    }
                    lastPoint = { x: args[2], y: args[3] }
                    lastCV = { x: args[0], y: args[1] };
                    // TODO: add adaptive sampling
                    break;
                }
                case "t":
                    console.assert(args.length >= 2);
                    args[0] += lastPoint.x;
                    args[1] += lastPoint.y;
                case "T": {
                    console.assert(args.length >= 2);
                    if (i == 0 || !("tTqQ".includes(types[i - 1]))) {
                        lastCV = lastPoint;
                    } else {
                        lastCV = {
                            x: lastPoint.x * 2 - lastCV.x,
                            y: lastPoint.y * 2 - lastCV.y
                        }
                    }
                    const numberSegs = 8;
                    for (let i = 1; i <= numberSegs; i++) {
                        const t = i / numberSegs;
                        const c0 = (1 - t) * (1 - t);
                        const c1 = 2 * t * (1 - t);
                        const c2 = t * t;
                        this.vertices.push({
                            x: lastPoint.x * c0 + lastCV.x * c1 + args[0] * c2,
                            y: lastPoint.y * c0 + lastCV.y * c1 + args[1] * c2
                        })
                    }
                    lastPoint = { x: args[0], y: args[1] }
                    // TODO: add adaptive sampling
                    break
                }
                case "c":
                    console.assert(args.length >= 6);
                    args[0] += lastPoint.x;
                    args[1] += lastPoint.y;
                    args[2] += lastPoint.x;
                    args[3] += lastPoint.y;
                    args[4] += lastPoint.x;
                    args[5] += lastPoint.y;
                case "C": {
                    console.assert(args.length >= 6);
                    const numberSegs = 12;
                    for (let i = 1; i <= numberSegs; i++) {
                        const t = i / numberSegs;
                        const c0 = (1 - t) * (1 - t) * (1 - t);
                        const c1 = 3 * (1 - t) * (1 - t) * t;
                        const c2 = 3 * (1 - t) * t * t;
                        const c3 = t * t * t;
                        this.vertices.push({
                            x: lastPoint.x * c0 + args[0] * c1 + args[2] * c2 + args[4] * c3,
                            y: lastPoint.y * c0 + args[1] * c1 + args[3] * c2 + args[5] * c3
                        })
                    }
                    lastCV = { x: args[2], y: args[3] };
                    lastPoint = { x: args[4], y: args[5] };
                    // TODO: add adaptive sampling
                    break;
                }
                case "s":
                    console.assert(args.length >= 6);
                    args[0] += lastPoint.x;
                    args[1] += lastPoint.y;
                    args[2] += lastPoint.x;
                    args[3] += lastPoint.y;
                case "S": {
                    console.assert(args.length >= 6);
                    if (i == 0 || !("cCsS".includes(types[i - 1]))) {
                        lastCV = lastPoint;
                    } else {
                        lastCV = {
                            x: lastPoint.x * 2 - lastCV.x,
                            y: lastPoint.y * 2 - lastCV.y
                        }
                    }
                    const numberSegs = 12;
                    for (let i = 1; i <= numberSegs; i++) {
                        const t = i / numberSegs;
                        const c0 = (1 - t) * (1 - t) * (1 - t);
                        const c1 = 3 * (1 - t) * (1 - t) * t;
                        const c2 = 3 * (1 - t) * t * t;
                        const c3 = t * t * t;
                        this.vertices.push({
                            x: lastPoint.x * c0 + lastCV.x * c1 + args[0] * c2 + args[2] * c3,
                            y: lastPoint.y * c0 + lastCV.y * c1 + args[1] * c2 + args[3] * c3
                        })
                    }
                    lastCV = { x: args[0], y: args[1] }
                    lastPoint = { x: args[2], y: args[3] }
                    // TODO: add adaptive sampling
                    break;
                }
                case "z":
                case "Z": {
                    this.closed = true;
                    return;
                }
                default: {
                    console.warn("not support command " + type);
                    if (type.toLowerCase() === type) {
                        args[args.length - 2] += lastPoint.x;
                        args[args.length - 1] += lastPoint.y;
                    }
                    lastPoint = { x: args[args.length - 2], y: args[args.length - 1] };
                    this.vertices.push(lastPoint);
                }
            }
        }
    }

    applyTransform(transform: Transform) {
        const vertices = this.vertices;
        const l = vertices.length;

        for (let i = 0; i < l; i++) {
            vertices[i] = transform.applyToPoint(vertices[i]);
        }
    }

    lineIntersect(y: number): number[] {
        const vertices = this.vertices;
        const l = vertices.length - 1;
        const result: number[] = [];
        for (let i = 0; i < l; i++) {
            const y1 = vertices[i].y;
            const y2 = vertices[i + 1].y;
            if ((y1 >= y && y2 >= y) || (y1 < y && y2 < y)) {
                continue;
            }
            const x1 = vertices[i].x;
            const x2 = vertices[i + 1].x;
            const t = (y - y1) / (y2 - y1);
            result.push(x1 + (x2 - x1) * t);
        }
        return result;
    }

    fromBoundingBox(element: HTMLElement) {
        this.vertices = [];
        let svg = document.getElementById("visChart");
        const boundingBox = element.getBoundingClientRect();
        const topLeft = Tool.screenToSvgCoords(svg, boundingBox.left, boundingBox.top) as Point;
        const bottomRight = Tool.screenToSvgCoords(svg, boundingBox.right, boundingBox.bottom) as Point;
        this.vertices.push(topLeft);
        this.vertices.push({ x: topLeft.x, y: bottomRight.y });
        this.vertices.push(bottomRight);
        this.vertices.push({ x: bottomRight.x, y: topLeft.y });
        this.vertices.push(topLeft);

        this.yMax = bottomRight.y;
        this.yMin = topLeft.y;
        this.xMax = bottomRight.x;
        this.xMin = topLeft.x;

        console.assert(this.yMax >= this.yMin);

        this.calcLength();
    }

    fromElement(element: HTMLElement) {
        // not support viewBox

        this.vertices = [];
        // this.element = element.cloneNode() as Element;

        let transform = this.parseTransform(element);
        let parent = element.parentElement;
        while (parent && parent.tagName == "g") {
            transform = mergeTransform(this.parseTransform(parent), transform);
            parent = parent.parentElement;
        }
        while (parent && parent.tagName != "svg") {
            parent = parent.parentElement;
        }
        if (parent) {
            let svgDomRect = parent.getBoundingClientRect();
            this.svgWidth = svgDomRect.width;
            this.svgHeight = svgDomRect.height;
        } else {
            console.error("svg not found")
        }
        // this.transform = transform;
        if (!this.useBoundingBox) {
            this.parseShape(element);
        }
        if (!this.useBoundingBox) {
            this.applyTransform(transform);
            this.yMax = -Infinity;
            this.yMin = Infinity;
            this.xMax = -Infinity;
            this.xMin = Infinity;
            for (let i of this.vertices) {
                this.yMax = Math.max(this.yMax, i.y);
                this.yMin = Math.min(this.yMin, i.y);
                this.xMax = Math.max(this.xMax, i.x);
                this.xMin = Math.min(this.xMin, i.x);
            }
            if (this.closed) {
                this.vertices.push(this.vertices[0]);
            }
            this.calcLength();
        } else {
            this.fromBoundingBox(element);
        }
        // this.resample(5);
    }

    fromVertices(vertices: Point[]) {
        this.vertices = vertices;
        this.yMax = -Infinity;
        this.yMin = Infinity;
        this.xMax = -Infinity;
        this.xMin = Infinity;
        for (let i of this.vertices) {
            this.yMax = Math.max(this.yMax, i.y);
            this.yMin = Math.min(this.yMin, i.y);
            this.xMax = Math.max(this.xMax, i.x);
            this.xMin = Math.min(this.xMin, i.x);
        }
        if (vertices[0].x != vertices[vertices.length - 1].x || vertices[0].y != vertices[vertices.length - 1].y) {
            vertices.push(vertices[0]);
        }
        this.calcLength();
    }

    calcLength() {
        this.length = 0;
        const vertices = this.vertices;
        const l = vertices.length;
        for (let i = 0; i < l - 1; i++) {
            let edgeLen = pointDis(vertices[i], vertices[i + 1]);
            this.massCenter.x += vertices[i].x * edgeLen;
            this.massCenter.y += vertices[i].y * edgeLen;
            this.massCenter.x += vertices[i + 1].x * edgeLen;
            this.massCenter.y += vertices[i + 1].y * edgeLen;
            this.length += edgeLen;
        }
        this.massCenter.x /= this.length * 2;
        this.massCenter.y /= this.length * 2;
    }

    resample(numberPoints: number): Point[] {
        const result: Point[] = [];
        // console.warn(this.length);

        const vertices = this.vertices;
        const l = vertices.length;
        let currentPoint: Point = this.vertices[0];
        let index = 1;

        function findNextPoint(dis: number) {
            let edgeLen: number;
            while ((edgeLen = pointDis(currentPoint, vertices[index])) < dis) {
                dis -= edgeLen;
                currentPoint = vertices[index];
                index++;
            }
            console.assert(edgeLen > 0);
            const t = dis / edgeLen;
            currentPoint = {
                x: currentPoint.x * (1 - t) + vertices[index].x * t,
                y: currentPoint.y * (1 - t) + vertices[index].y * t,
            };
        }

        let segLen = this.length / numberPoints;
        findNextPoint(segLen / 2);
        for (let i = 0; i < numberPoints - 1; i++) {
            result.push(currentPoint);
            findNextPoint(segLen);
        }
        result.push(currentPoint);

        this.vertices = result;
        return result;
    }

    distance(p: Point): number {
        let result = Infinity;
        let vertices = this.vertices;
        let l = vertices.length;
        for (let i = 0; i < l - 1; i++) {
            result = Math.min(result, pointToLine(p, vertices[i], vertices[i + 1]));
        }
        // const svg = document.getElementById("visChart");
        // let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        // circle.setAttribute("cx", p.x.toString());
        // circle.setAttribute("cy", p.y.toString());
        // circle.setAttribute("r", result.toString());
        // circle.setAttribute("opacity", ".1");
        // svg.appendChild(circle);
        return result;
    }

    display(): SVGElement {
        const svgns = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(svgns, "g");
        const path = document.createElementNS(svgns, "path");
        const commands: string[] = [];
        let isFirst = true;
        for (let i of this.vertices) {
            if (isFirst) {
                isFirst = false;
                commands.push("M");
            } else {
                commands.push("L");
            }
            commands.push(`${i.x} ${i.y}`);
        }
        // commands.push("z");
        path.setAttribute("d", commands.join(""));

        path.setAttribute("fill", "none");
        path.setAttribute("stroke-width", "2");
        // path.setAttribute("fill", `#${Math.floor(Math.random() * 255).toString(16)}${Math.floor(Math.random() * 255).toString(16)}${Math.floor(Math.random() * 255).toString(16)}`);
        path.setAttribute("opacity", "1");
        path.setAttribute("stroke", "red");
        group.appendChild(path);

        const circle = document.createElementNS(svgns, "circle");
        circle.setAttribute("cx", this.massCenter.x.toString());
        circle.setAttribute("cy", this.massCenter.y.toString());
        circle.setAttribute("r", "4");
        group.appendChild(circle);

        return group;
    }

}
