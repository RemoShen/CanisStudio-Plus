import classifyPoint from 'robust-point-in-polygon'
import { ICoord } from './ds'
import Tool from './tool'

type Point = [number, number];

export default class Lasso {
    static CLOSE_DIS: number = 75;
    static ORIGIN_RADIUS: number = 5;
    static LASSO_ORIGIN_ID = 'lassoOrigin';
    static LASSO_PATH_ID = 'lassoPath';
    static LASSO_CLOSEPATH_ID = 'lassoClosePath';

    svg: HTMLElement;
    origin: ICoord;
    polygon: Point[];
    constructor() {
        this.polygon = [];
    }

    public createSelectionFrame(svg: HTMLElement, origin: ICoord) {
        this.svg = svg;
        this.origin = origin;
        this.svg.appendChild(this.createPath(origin));
        this.svg.appendChild(this.createOrigin(origin));
    }

    public createOrigin(origin: ICoord): SVGCircleElement {
        const originCircle: SVGCircleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        originCircle.setAttributeNS(null, 'id', Lasso.LASSO_ORIGIN_ID);
        originCircle.setAttributeNS(null, 'cx', origin.x.toString());
        originCircle.setAttributeNS(null, 'cy', origin.y.toString());
        originCircle.setAttributeNS(null, 'r', Lasso.ORIGIN_RADIUS.toString());
        originCircle.setAttributeNS(null, 'opacity', '.5');
        originCircle.setAttributeNS(null, 'fill', '#3399FF');
        return originCircle;
    }

    public createPath(origin: ICoord): SVGPathElement {
        const lassoPath: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        lassoPath.setAttributeNS(null, 'id', Lasso.LASSO_PATH_ID);
        lassoPath.setAttributeNS(null, 'stroke', '#505050');
        lassoPath.setAttributeNS(null, 'fill-opacity', '.05');
        lassoPath.setAttributeNS(null, 'd', 'M' + origin.x + ',' + origin.y);
        this.polygon.push([origin.x, origin.y]);
        return lassoPath;
    }

    public updatePath(coord: ICoord): void {
        const oriPath: HTMLElement = document.getElementById(Lasso.LASSO_PATH_ID);
        (<SVGPathElement><unknown>oriPath).setAttributeNS(null, 'd', oriPath.getAttribute('d') + 'L' + coord.x + ',' + coord.y);
        this.polygon.push([coord.x, coord.y]);
        if (Tool.pointDist(coord.x, this.origin.x, coord.y, this.origin.y) <= Lasso.CLOSE_DIS) {
            if (document.getElementById(Lasso.LASSO_CLOSEPATH_ID)) {
                this.updateClosePath(coord);
            } else {
                this.createClosePath(coord);
            }
        } else {
            this.removeClosePath();
        }
    }

    public createClosePath(coord: ICoord): void {
        const closePath: SVGLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        closePath.setAttributeNS(null, 'id', Lasso.LASSO_CLOSEPATH_ID);
        closePath.setAttributeNS(null, 'stroke', '#505050');
        closePath.setAttributeNS(null, 'stroke-dasharray', '4,4');
        closePath.setAttributeNS(null, 'x1', this.origin.x.toString());
        closePath.setAttributeNS(null, 'y1', this.origin.y.toString());
        closePath.setAttributeNS(null, 'x2', coord.x.toString());
        closePath.setAttributeNS(null, 'y2', coord.y.toString());
        this.svg.appendChild(closePath);
    }

    public updateClosePath(coord: ICoord): void {
        const closePath: SVGLineElement = <SVGLineElement><unknown>document.getElementById(Lasso.LASSO_CLOSEPATH_ID);
        closePath.setAttributeNS(null, 'x2', coord.x.toString());
        closePath.setAttributeNS(null, 'y2', coord.y.toString());
    }

    public removeClosePath(): void {
        if (document.getElementById(Lasso.LASSO_CLOSEPATH_ID)) {
            document.getElementById(Lasso.LASSO_CLOSEPATH_ID).remove();
        }
    }

    public removeSelectionFrame(): void {
        if (document.getElementById(Lasso.LASSO_ORIGIN_ID)) {
            document.getElementById(Lasso.LASSO_ORIGIN_ID).remove();
        }
        if (document.getElementById(Lasso.LASSO_PATH_ID)) {
            document.getElementById(Lasso.LASSO_PATH_ID).remove();
        }
        this.removeClosePath();
    }

    public lassoSelect(framedMarks: string[]): string[] {
        let result: string[] = [];
        //filter marks
        Array.from(document.getElementsByClassName('mark')).forEach((m: HTMLElement) => {
            const markBBox = m.getBoundingClientRect();
            
            const coord1: ICoord = Tool.screenToSvgCoords(this.svg, markBBox.left, markBBox.top);
            const coord2: ICoord = Tool.screenToSvgCoords(this.svg, markBBox.left + markBBox.width, markBBox.top + markBBox.height);
            const pnt1 = <Point>[coord1.x, coord1.y],
                pnt2 = <Point>[coord1.x, coord2.y],
                pnt3 = <Point>[coord2.x, coord1.y],
                pnt4 = <Point>[coord2.x, coord2.y],
                pnt5 = <Point>[coord1.x + (coord2.x - coord1.x) / 2, coord1.y + (coord2.y - coord1.y) / 2];

            let framed: boolean = false;
            if (classifyPoint(this.polygon, pnt5) <= 0) {
                let framedPnt: number = 0;
                [pnt1, pnt2, pnt3, pnt4].forEach((pnt) => {
                    if (classifyPoint(this.polygon, pnt) <= 0) {
                        framedPnt++;
                    }
                })
                framed = framedPnt >= 2;
            }

            //update the appearance of marks
            if ((framedMarks.includes(m.id) && framed) || (!framedMarks.includes(m.id) && !framed)) {
                m.classList.add('non-framed-mark');
            } else if ((framedMarks.includes(m.id) && !framed) || (!framedMarks.includes(m.id) && framed)) {
                m.classList.remove('non-framed-mark');
                result.push(m.id);
            }
        })
        return result;
    }
}