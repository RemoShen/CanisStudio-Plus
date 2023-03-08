import { ICoord } from './ds'
import { state, State } from '../app/state'
import { player } from '../components/player'
import Rectangular from './rectangular'
import Lasso from './lasso'
import Reducer from '../app/reducer'
import { dragableCanvas } from '../components/widgets/dragableCanvas'
import * as action from '../app/action'
import PlusBtn from '../components/widgets/plusBtn'
import KfItem from '../components/widgets/kfItem'
import { GroupMenu } from '../components/widgets/kfGroup'
import Util from '../app/core/util'
import ViewWindow from '../components/viewWindow'

export default class Tool {
    static ENLARGE_THRESHOLD: number = 200;

    public static extractTransNums(translateStr: string): ICoord {
        const transNums = translateStr.match(/[+-]?\d+(?:\.\d+)?/g).map(x => parseFloat(x));
        return { x: transNums[0], y: transNums[1] };
    }
    public static firstLetterUppercase(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    public static pointDist(x1: number, x2: number, y1: number, y2: number): number {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    }
    /**
     * whether a contains b
     * @param a 
     * @param b 
     */
    public static arrayContained(a: any[], b: any[]): boolean {
        if (a.length < b.length) return false;
        for (var i = 0, len = b.length; i < len; i++) {
            if (a.indexOf(b[i]) == -1) return false;
        }
        return true;
    }
    /**
     * check whether b is an item in a
     * @param a 
     * @param b 
     */
    public static Array2DItem(a: any[][], b: any[]): boolean {
        for (let i = 0, len = a.length; i < len; i++) {
            if (Tool.identicalArrays(a[i], b)) {
                return true;
            }
        }
        return false;
    }
    public static formatTime(time: number): string {
        const minute: number = Math.floor(time / 60000);
        const second: number = Math.floor((time - minute * 60000) / 1000);
        const ms: number = Math.floor((time - minute * 60000 - second * 1000) / 1);
        const minStr: string = minute < 10 ? '0' + minute : '' + minute;
        const secStr: string = second < 10 ? '0' + second : '' + second;
        const msStr = ms < 100 ? (ms < 10 ? '00' + ms : '0' + ms) : '' + ms;
        return minStr + ':' + secStr + '.' + msStr;
    }
    public static svg2url(svgElement: HTMLElement): string {
        const svgString = svgElement.outerHTML;
        const svg = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svg);
        return url;
    }

    // public static svg2url(svgElement: HTMLElement, canvas: HTMLCanvasElement): string {
    //     // const svgString = new XMLSerializer().serializeToString(svgElement);
    //     const svgString = svgElement.outerHTML;
    //     const ctx = canvas.getContext("2d");
    //     const img = new Image();
    //     const svg = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    //     const url = URL.createObjectURL(svg);
    //     img.onload = function () {
    //         let dx = 0, dy = 0, scaleWidth = canvas.width, scaleHeight = canvas.width * (img.height / img.width);
    //         if (scaleHeight <= canvas.height) {
    //             dy = (canvas.height - scaleHeight) / 2;
    //         } else {
    //             scaleHeight = canvas.height;
    //             scaleWidth = canvas.height * (img.width / img.height);
    //             dx = (canvas.width - scaleWidth) / 2;
    //         }
    //         ctx.drawImage(img, dx, dy, scaleWidth, scaleHeight);
    //         URL.revokeObjectURL(url);
    //     };
    //     img.src = url;
    //     return url;
    // }

    public static identicalArrays(arr1: any[], arr2: any[]): boolean {
        let same: boolean = true;
        if (arr1.length !== arr2.length) {
            same = false;
        }
        for (let i = 0; i < arr1.length; i++) {
            if (arr2.indexOf(arr1[i]) < 0) {
                same = false;
                break;
            }
        }
        return same;
    }
    public static resizeWidgets(svgContainerId: string = ''): void {
        // this.resizeSvgContainer(svgContainerId);
        this.resizePlayerContainer();
    }

    public static resizePlayerContainer(): void {
        //resize player
        player.resizePlayer(player.widget.clientWidth - 160);
    }

    public static screenToSvgCoords(svg: any, x: number, y: number): ICoord {
        let rectPosiPoint1 = svg.createSVGPoint();
        rectPosiPoint1.x = x;
        rectPosiPoint1.y = y;
        return rectPosiPoint1.matrixTransform(svg.getScreenCTM().inverse());
    }

    //TODO: coord problem
    public static initLassoSelection(containerId: string): void {
        document.getElementById(containerId).onmousedown = (downEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
            const lassoSelection = new Lasso();
            const evtTarget: HTMLElement = <HTMLElement>downEvt.target;
            if (evtTarget.classList.contains('highlight-selection-frame') ||
                (evtTarget.classList.contains('mark') && state.selection.includes(evtTarget.id) && state.selection.length > 0)) {//clicked within the selection frame
                dragableCanvas.createCanvas(document.querySelector('#' + containerId + ' > svg:first-of-type'), { x: downEvt.pageX, y: downEvt.pageY });
            } else {//doing selection
                const svg: HTMLElement = document.getElementById('visChart');
                if (svg) {
                    const svgBBox = svg.getBoundingClientRect();
                    const startPoint: ICoord = this.screenToSvgCoords(svg, downEvt.pageX, downEvt.pageY);
                    const originX = downEvt.pageX - svgBBox.x, originY = downEvt.pageY - svgBBox.y;
                    let isDragging: boolean = true;
                    //create selection frame
                    lassoSelection.createSelectionFrame(svg, { x: startPoint.x, y: startPoint.y });
                    // lassoSelection.createSelectionFrame(svg, { x: originX, y: originY });
                    document.onmousemove = (moveEvt) => {
                        if (isDragging) {
                            const pathCoord: ICoord = this.screenToSvgCoords(svg, moveEvt.pageX, moveEvt.pageY);
                            const boundaryCheck: ICoord = { x: moveEvt.pageX - svgBBox.x, y: moveEvt.pageY - svgBBox.y };
                            const possibleMarks: string[] = lassoSelection.lassoSelect(state.selection);
                            //can't move outside the view
                            if (boundaryCheck.x >= 0 && boundaryCheck.x <= document.getElementById('chartContainer').offsetWidth && boundaryCheck.y >= 0 && boundaryCheck.y <= document.getElementById('chartContainer').offsetHeight) {
                                lassoSelection.updatePath(pathCoord);
                            }
                        }
                    }
                    document.onmouseup = (upEvt) => {
                        Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                        isDragging = false;
                        const selectedMarks: string[] = lassoSelection.lassoSelect(state.selection);
                        //save histroy before update state
                        if (this.identicalArrays(selectedMarks, state.selection)) {
                            State.tmpStateBusket.push({
                                historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
                                currentAction: { actionType: action.UPDATE_SELECTION, actionVal: [] }
                            })
                            State.saveHistory();
                            Reducer.triger(action.UPDATE_SELECTION, []);
                        } else {
                            State.tmpStateBusket.push({
                                historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
                                currentAction: { actionType: action.UPDATE_SELECTION, actionVal: selectedMarks }
                            })
                            State.saveHistory();
                            Reducer.triger(action.UPDATE_SELECTION, state.suggestion ? Util.suggestSelection(selectedMarks) : selectedMarks);
                        }

                        lassoSelection.removeSelectionFrame();
                        document.onmousemove = null;
                        document.onmouseup = null;
                    }
                }
            }
        }
    }
    public static initRectangularSelection(containerId: string): void {
        const rectangularSelection = new Rectangular();
        document.getElementById(containerId).onmousedown = (downEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
            downEvt.preventDefault();
            //get the scale of the chart since the size of the svg container is different from that of the chart
            // let scaleW: number = 1, scaleH: number = 1;
            const svg: any = document.getElementById('visChart');
            // if (svg) {
            //     scaleW = parseFloat(svg.getAttribute('width')) / document.getElementById('chartContainer').offsetWidth;
            //     scaleH = parseFloat(svg.getAttribute('height')) / document.getElementById('chartContainer').offsetHeight;
            // }

            const evtTarget: HTMLElement = <HTMLElement>downEvt.target;
            if (evtTarget.classList.contains('highlight-selection-frame') ||
                (evtTarget.classList.contains('mark') && state.selection.includes(evtTarget.id) && state.selection.length > 0)) {//clicked within the selection frame
                dragableCanvas.createCanvas(document.querySelector('#' + containerId + ' > svg:first-of-type'), { x: downEvt.pageX, y: downEvt.pageY });
            } else {//doing selection
                if (svg) {
                    const svgBBox = svg.getBoundingClientRect();
                    const rectPosi1: ICoord = this.screenToSvgCoords(svg, downEvt.pageX, downEvt.pageY);
                    let lastMouseX = downEvt.pageX, lastMouseY = downEvt.pageY;
                    let isDragging: boolean = true;
                    //create the selection frame
                    rectangularSelection.createSelectionFrame(svg);
                    document.onmousemove = (moveEvt) => {
                        if (isDragging) {
                            const rectPosi2: ICoord = this.screenToSvgCoords(svg, moveEvt.pageX, moveEvt.pageY);
                            // // const possibleMarks: string[] = rectangularSelection.rectangularSelect({
                            //     x1: rectPosi1.x,
                            //     y1: rectPosi1.y,
                            //     x2: rectPosi2.x,
                            //     y2: rectPosi2.y
                            // }, state.selection);

                            //can't move outside the view
                            if ((moveEvt.pageX - svgBBox.x) >= 0 &&
                                (moveEvt.pageX - svgBBox.x) <= document.getElementById('chartContainer').offsetWidth &&
                                (moveEvt.pageY - svgBBox.y) >= 0 &&
                                (moveEvt.pageY - svgBBox.y) <= document.getElementById('chartContainer').offsetHeight) {
                                const tmpX = (rectPosi2.x < rectPosi1.x ? rectPosi2.x : rectPosi1.x);
                                const tmpY = (rectPosi2.y < rectPosi1.y ? rectPosi2.y : rectPosi1.y);
                                const tmpWidth = Math.abs(rectPosi1.x - rectPosi2.x);
                                const tmpHeight = Math.abs(rectPosi1.y - rectPosi2.y);

                                /* update the selection frame */
                                rectangularSelection.updateSelectionFrame({ x1: tmpX, y1: tmpY, x2: tmpX + tmpWidth, y2: tmpY + tmpHeight });
                            }
                        }
                    }
                    document.onmouseup = (upEvt) => {
                        Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                        isDragging = false;
                        const mouseMoveThsh: number = 3;//mouse move less than 3px -> single selection; bigger than 3px -> rect selection
                        //save histroy before update state
                        if (Tool.pointDist(lastMouseX, upEvt.pageX, lastMouseY, upEvt.pageY) > mouseMoveThsh) {//doing rect selection
                            const rectPosi2: ICoord = this.screenToSvgCoords(svg, upEvt.pageX, upEvt.pageY);
                            const selectedMarks: string[] = rectangularSelection.rectangularSelect({
                                x1: rectPosi1.x,
                                y1: rectPosi1.y,
                                x2: rectPosi2.x,
                                y2: rectPosi2.y
                            }, state.selection);
                            State.tmpStateBusket.push({
                                historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
                                currentAction: { actionType: action.UPDATE_SELECTION, actionVal: selectedMarks }
                            })
                            State.saveHistory();
                            Reducer.triger(action.UPDATE_SELECTION, state.suggestion ? Util.suggestSelection(selectedMarks) : selectedMarks);
                        } else {//single selection
                            const clickedItem: HTMLElement = <HTMLElement>upEvt.target;
                            if (clickedItem.classList.contains('mark')) {//clicked on a mark
                                const clickedMarkId: string = clickedItem.id;
                                const selectedMarks: string[] = state.selection.includes(clickedMarkId) ? [...state.selection].splice(state.selection.indexOf(clickedMarkId), 1) : [...state.selection, clickedMarkId];
                                State.tmpStateBusket.push({
                                    historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
                                    currentAction: { actionType: action.UPDATE_SELECTION, actionVal: selectedMarks }
                                })
                                State.saveHistory();
                                Reducer.triger(action.UPDATE_SELECTION, state.suggestion ? Util.suggestSelection(selectedMarks) : selectedMarks);
                            } else {//didnt select any mark
                                State.tmpStateBusket.push({
                                    historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
                                    currentAction: { actionType: action.UPDATE_SELECTION, actionVal: [] }
                                })
                                State.saveHistory();
                                Reducer.triger(action.UPDATE_SELECTION, []);
                            }
                        }
                        rectangularSelection.removeSelectionFrame();
                        document.onmousemove = null;
                        document.onmouseup = null;
                    }
                }
            }
        }
    }

    public static updateTranslate(node: any, targetTrans: ICoord) {
        if (node.getAttributeNS(null, 'transform') && typeof node.getAttributeNS(null, 'transform') !== 'undefined') {
            const trans: ICoord = this.extractTransNums(node.getAttributeNS(null, 'transform'));
            node.setAttributeNS(null, 'transform', `translate(${trans.x + targetTrans.x}, ${trans.y + targetTrans.y})`);
        } else {
            node.setAttributeNS(null, 'transform', `translate(${targetTrans.x}, ${targetTrans.y})`);
        }
    }

    /**
     * judge which plus button or kf is dragged over
     * @param mousemovePosi 
     */
    public static judgeDragOver(mousePosi: ICoord): PlusBtn | KfItem {
        let dragOverItem: PlusBtn | KfItem;
        PlusBtn.allPlusBtn.forEach((pb: PlusBtn) => {
            if (pb.isHighlighted && pb.onShow) {
                const pbBBox: DOMRect = pb.container.getBoundingClientRect();
                if (mousePosi.x >= pbBBox.left && mousePosi.x <= pbBBox.right && mousePosi.y >= pbBBox.top && mousePosi.y <= pbBBox.bottom) {
                    dragOverItem = pb;
                }
            }
        })
        // KfItem.allKfItems.forEach((kf: KfItem) => {
        //     if (kf.isHighlighted) {
        //         const kfBBox: DOMRect = kf.container.getBoundingClientRect();
        //         if (mousePosi.x >= kfBBox.left && mousePosi.x <= kfBBox.right && mousePosi.y >= kfBBox.top && mousePosi.y <= kfBBox.bottom) {
        //             dragOverItem = kf;
        //         }
        //     }
        // })

        return dragOverItem;
    }

    public static clearDragOver() {
        PlusBtn.dragoverBtn = undefined;
        KfItem.dragoverKf = undefined;
    }

    /**
     * translate the elements in kf or kfgroup
     * @param rootNode : root dom node
     * @param transX 
     * @param transOffset : whether this is called when dragging offset
     */
    public static transNodeElements(rootNode: any, transX: number, transOffset: boolean = false) {
        const allNodeElements: any[] = transOffset ? Array.from(rootNode.childNodes).slice(1) : Array.from(rootNode.childNodes);
        allNodeElements.forEach((c: any) => {
            let isEasingNode: boolean = false;
            if (c.classList.contains('ease-transform')) {
                isEasingNode = true;
                c.classList.remove('ease-transform');
            }
            if (c.getAttributeNS(null, 'transform')) {
                const oriTrans: ICoord = Tool.extractTransNums(c.getAttributeNS(null, 'transform'));
                c.setAttributeNS(null, 'transform', `translate(${oriTrans.x + transX}, ${oriTrans.y})`);
            } else {
                c.setAttributeNS(null, 'transform', `translate(${transX}, 0)`);
            }
            if (isEasingNode) {
                c.classList.add('ease-transform');
            }
        })
    }

    public static translateEasing(easing: string): string {
        switch (easing) {
            case GroupMenu.EASING_LINEAR:
                return 'ease linear';
            case GroupMenu.EASING_IN_CUBIC:
                return 'ease in cubic';
            case GroupMenu.EASING_OUT_CUBIC:
                return 'ease out cubic';
            case GroupMenu.EASING_INOUT_CUBIC:
                return 'ease in & out cubic';
            case GroupMenu.EASING_IN_QUAD:
                return 'ease in quad';
            case GroupMenu.EASING_OUT_QUAD:
                return 'ease out quad';
            case GroupMenu.EASING_INOUT_QUAD:
                return 'ease in & out quad';
        }
    }

    /**
     * enlarge those marks with the given classname
     * @param svg 
     * @param clsName 
     */
    public static enlargeMarks(svg: HTMLElement, clsName: string, scale: number, includeCls: boolean) {
        const targetMarks: Element[] = includeCls ? Array.from(svg.getElementsByClassName(clsName)) : Array.from(svg.querySelectorAll(`.mark:not(.${clsName})`));

        targetMarks.forEach((m: HTMLElement) => {
            const oriStrokeWidth: string = m.getAttributeNS(null, 'stroke-width');
            const strokeWidthRecord: string = m.getAttributeNS(null, 'tmp-stroke-width');
            let strokeWidthToScale: number = 0;
            if (typeof m.getAttributeNS(null, 'stroke') === 'undefined' || !m.getAttributeNS(null, 'stroke') || m.getAttributeNS(null, 'stroke') === 'none') {
                m.setAttributeNS(null, 'stroke', typeof m.getAttributeNS(null, 'fill') === 'undefined' ? '#fff' : m.getAttributeNS(null, 'fill'));
            }
            if (typeof strokeWidthRecord !== 'undefined' && strokeWidthRecord) {
                strokeWidthToScale = parseFloat(strokeWidthRecord);
            } else {
                if (typeof oriStrokeWidth !== 'undefined' && oriStrokeWidth) {
                    m.setAttributeNS(null, 'tmp-stroke-width', `${oriStrokeWidth}`);
                    strokeWidthToScale = parseFloat(oriStrokeWidth);
                } else {
                    m.setAttributeNS(null, 'tmp-stroke-width', '0');
                    strokeWidthToScale = 0;
                }
            }

            if (m.tagName === 'text' && scale >= state.chartThumbNailZoomLevels / 2) {
                const txtBBox: DOMRect = m.getBoundingClientRect();
                const txtCover: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                txtCover.setAttributeNS(null, 'class', 'txt-cover');
                txtCover.setAttributeNS(null, 'x', m.getAttributeNS(null, 'x'));
                txtCover.setAttributeNS(null, 'y', `${parseFloat(m.getAttributeNS(null, 'y')) - txtBBox.height / state.zoomLevel}`);
                txtCover.setAttributeNS(null, 'width', `${txtBBox.width * 1.4 / state.zoomLevel}`);
                txtCover.setAttributeNS(null, 'height', `${txtBBox.height * 1.4 / state.zoomLevel}`);
                txtCover.setAttributeNS(null, 'opacity', '0.7');
                txtCover.setAttributeNS(null, 'fill', m.getAttributeNS(null, 'fill'));
                if (m.getAttributeNS(null, 'transform')) {
                    txtCover.setAttributeNS(null, 'transform', m.getAttributeNS(null, 'transform'));
                }
                m.parentElement.appendChild(txtCover);
                m.classList.add('fadeout-text');
                m.setAttributeNS(null, 'opacity', '0');
            }
            m.setAttributeNS(null, 'stroke-width', `${scale * 2 + strokeWidthToScale}`);

        })
    }

    public static resetTxtCover(svg: HTMLElement) {
        //remove all text covers
        Array.from(document.getElementsByClassName('txt-cover')).forEach((txtCover: HTMLElement) => {
            txtCover.remove();
        })
        Array.from(document.getElementsByClassName('fadeout-text')).forEach((txt: HTMLElement) => {
            txt.classList.remove('fadeout-text');
            txt.setAttributeNS(null, 'opacity', null);
        })
    }

    public static resetMarkSize(svg: HTMLElement, clsName: string, includeCls: boolean) {
        const targetMarks: Element[] = includeCls ? Array.from(svg.getElementsByClassName(clsName)) : Array.from(svg.querySelectorAll(`.mark:not(.${clsName})`));
        targetMarks.forEach((m: HTMLElement) => {
            if (typeof m.getAttributeNS(null, 'tmp-stroke-width') !== 'undefined') {
                m.setAttributeNS(null, 'stroke-width', m.getAttributeNS(null, 'tmp-stroke-width'));
            }
        })
    }

    public static calKfZoomLevel(): number {
        let currentZoomNum: number = state.zoomLevel;
        if (currentZoomNum === ViewWindow.MAX_ZOOM_LEVEL) {
            currentZoomNum -= 0.001;
        }
        return Math.floor((currentZoomNum - ViewWindow.MIN_ZOOM_LEVEL) / ((ViewWindow.MAX_ZOOM_LEVEL - ViewWindow.MIN_ZOOM_LEVEL) / state.chartThumbNailZoomLevels));
    }
}