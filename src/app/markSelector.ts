import "../assets/style/selection.scss";
import { dragableCanvas } from "../components/widgets/dragableCanvas";
import { ICoord } from "../util/ds";
import Tool from "../util/tool";
import { chartManager, MARKID } from "./chartManager";
import { addSelection, extractAttributeConstrains, meetAttributeConstrains, meetMarkTypeConstrains } from "./kfTree";
import { MarkTableManager, markTableManager } from "./markTableManager";
import { Polygon } from "./polygon";

const SELECTION_MASK = "selectionMask";

export enum MarkSelectorMode {
    SINGLE_SELECT, LASSO_SELECT
}

enum MarkStatus {
    DISABLE, EXBAND, INTERNAL
}

export class MarkSelector {
    static selection: Set<string> = new Set();
    static mode: MarkSelectorMode = null;

    static selectableMarks: Set<string>;
    static disabledMarks: Set<string>;

    static attributeSelector: Map<string, string>;
    static expandOptions: Set<string>[];
    static selectOption: number;

    static panning: { x: number, y: number };
    static scale: number;
    static chartDimension: { width: number, height: number };
    static svg: Element = null;
    static selectionMask: Element = null;
    // static confirmButton: HTMLElement = null;

    static selectStartPoint: ICoord;
    static selectionRect: Element;
    // static selectStartPoint: ICoord;
    // static currentSelection: string[];

    // TODO: for test, remove it later
    static updateSelection(elements: string[]) {
        elements = elements.filter(i => MarkSelector.selectableMarks.has(i));
        let flag = 0;
        for (let id of elements) {
            const element = document.getElementById(id);
            const selectionSize = this.selection.size;
            if (flag != 1 && MarkSelector.selection.has(id)) {
                MarkSelector.unselectMark(id);
                if (!flag && this.selection.size != selectionSize) {
                    flag = 2;
                }
            } else if (flag != 2) {
                MarkSelector.selectMark(id);
                if (!flag && this.selection.size != selectionSize) {
                    flag = 1;
                }
            }

        }
        MarkSelector.complete();
    }

    static selectMark(id: string) {
        if (MarkSelector.selection.size == 0) {
            // this.confirmButton.removeAttribute("style");
            for (let i = 0; i < MarkSelector.expandOptions.length; i++) {
                const set = MarkSelector.expandOptions[i];
                if (set.has(id)) {
                    MarkSelector.selectOption = i;
                    for (id of set) {
                        MarkSelector.addSelect(id);
                    }
                    for (let id of MarkSelector.selectableMarks) {
                        if (!set.has(id)) {
                            MarkSelector.addHide(id);
                        }
                    }
                    return;
                }
            }
            MarkSelector.selectOption = -1;
            MarkSelector.addSelect(id);
            for (let set of MarkSelector.expandOptions) {
                for (let id of set) {
                    MarkSelector.addHide(id);
                }
            }
            return;
        }
        if (MarkSelector.selectOption != -1) {
            return;
        }
        for (let i = 0; i < MarkSelector.expandOptions.length; i++) {
            const set = MarkSelector.expandOptions[i];
            if (set.has(id)) {
                return;
            }
        }
        MarkSelector.addSelect(id);
    }

    static unselectMark(id: string) {
        if (MarkSelector.selectOption != -1) {
            for (let i of MarkSelector.selection) {
                MarkSelector.removeSelect(i);
            }
            const set = MarkSelector.expandOptions[MarkSelector.selectOption];
            for (let id of MarkSelector.selectableMarks) {
                if (!set.has(id)) {
                    MarkSelector.removeHide(id);
                }
            }
            MarkSelector.selectOption = -1;
        } else {
            const markType = chartManager.marks.get(id).get(MARKID);
            for (let i of MarkSelector.selection) {
                if (chartManager.marks.get(i).get(MARKID) == markType) {
                    MarkSelector.removeSelect(i);
                }
            }
            if (MarkSelector.selection.size == 0) {
                for (let set of MarkSelector.expandOptions) {
                    for (let id of set) {
                        MarkSelector.removeHide(id);
                    }
                }
            }
        }
        if (this.selection.size == 0) {
            // this.confirmButton.setAttribute("style", "display:none");
        }
    }

    static addSelect(id: string) {
        if (MarkSelector.selection.has(id)) {
            return;
        }
        MarkSelector.selection.add(id);
        MarkTableManager.selection.add(id);
        MarkSelector.addHighlight(id);
    }

    static removeSelect(id: string) {
        if (!MarkSelector.selection.has(id)) {
            return;
        }
        MarkSelector.selection.delete(id);
        MarkTableManager.selection.delete(id);
        MarkSelector.removeHighlight(id);


    }

    static selectBySelectors(markTypeSelectors: Set<string>, attributeSelectors: Map<string, string>) {
        const result: Set<string> = new Set();
        for (let id of MarkSelector.selectableMarks) {
            if (meetAttributeConstrains(id, attributeSelectors) && meetMarkTypeConstrains(id, markTypeSelectors)) {
                result.add(id);
            }
        }
        return result;
    }

    static complete() {
        const markTypeSelectors: Set<string> = new Set();
        const attributeSelectors: Map<string, string> = extractAttributeConstrains(MarkSelector.selection);

        for (let id of MarkSelector.selection) {
            const markType = chartManager.marks.get(id).get(MARKID);
            markTypeSelectors.add(markType);
        }

        const newSelection = MarkSelector.selectBySelectors(markTypeSelectors, attributeSelectors);
        for (let id of newSelection) {
            MarkSelector.addSelect(id);
        }
    }

    static setCompleteData(disabledMarks: Set<string>, attributeSelectors: Map<string, string>, expandOptions: Set<string>[]) {
        MarkSelector.disabledMarks = new Set();
        MarkSelector.attributeSelector = attributeSelectors;
        MarkSelector.expandOptions = expandOptions;
        MarkSelector.selectableMarks = new Set();
        for (let id of chartManager.marks.keys()) {
            if (!disabledMarks.has(id)) {
                let disable = true;
                if (meetAttributeConstrains(id, MarkSelector.attributeSelector)) {
                    disable = false;
                }
                for (let set of MarkSelector.expandOptions) {
                    if (set.has(id)) {
                        disable = false;
                        break;
                    }
                }
                if (disable) {
                    MarkSelector.addHide(id);
                } else {
                    MarkSelector.selectableMarks.add(id);
                }
            } else {
                MarkSelector.addDisable(id);
            }
        }
        MarkSelector.selectOption = -1;
        // this.confirmButton.setAttribute("style", "display:none");
    }

    static addHide(id: string) {
        MarkTableManager.disabledMarks.add(id);
        const element: HTMLElement = document.getElementById(id)
        // element.setAttribute("display", "none");
        let opacity = 1;
        const opacityAttr = element.getAttribute("opacity");
        if (opacityAttr && opacityAttr.length != 0) {
            opacity = Number(opacityAttr);
        }
        element.setAttribute("opacity", String(opacity * 0.1));
        // dataTable
        markTableManager.notOptional(id);

    }

    static removeHide(id: string) {
        MarkTableManager.disabledMarks.delete(id);
        const element: HTMLElement = document.getElementById(id);
        let opacity = 1;
        const opacityAttr = element.getAttribute("opacity");
        if (opacityAttr && opacityAttr.length != 0) {
            opacity = Number(opacityAttr);
        }
        element.setAttribute("opacity", String(opacity / 0.1));
        markTableManager.removeNotOptional(id);
    }

    static addHighlight(id: string) {
        const element: HTMLElement = document.getElementById(id);
        MarkSelector.addDisable(id);
        let maskElement: Element;
        if (element.tagName == "text") {
            maskElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            const boundingRect = element.getBoundingClientRect();
            const p1 = Tool.screenToSvgCoords(MarkSelector.svg, boundingRect.left, boundingRect.top);
            const p2 = Tool.screenToSvgCoords(MarkSelector.svg, boundingRect.right, boundingRect.bottom);
            maskElement.setAttribute("x", String((p1.x - MarkSelector.panning.x) / MarkSelector.scale));
            maskElement.setAttribute("y", String((p1.y - MarkSelector.panning.y) / MarkSelector.scale));
            maskElement.setAttribute("width", String((p2.x - p1.x) / MarkSelector.scale));
            maskElement.setAttribute("height", String((p2.y - p1.y) / MarkSelector.scale));
        } else {
            maskElement = element.cloneNode() as Element;
            maskElement.classList.remove("mark");
            maskElement.removeAttribute("opacity");
            maskElement.removeAttribute("stroke-width");
            maskElement.setAttribute("transform", new Polygon().getTransformFromChartContent(element).toString());
        }
        maskElement.setAttribute("fill", "none");
        maskElement.setAttribute("stroke", "black");
        maskElement.id = "__" + element.id;
        maskElement.setAttribute("stroke-dasharray", "3, 3");

        // const animation = document.createElementNS("http://www.w3.org/2000/svg", "animate");
        // animation.setAttribute("attributeName", "stroke-dashoffset");
        // animation.setAttribute("from", "0");
        // animation.setAttribute("to", "6");
        // animation.setAttribute("dur", "0.5");
        // animation.setAttribute("repeatCount", "indefinite");
        // maskElement.appendChild(animation);

        const animation2 = document.createElementNS("http://www.w3.org/2000/svg", "animate");
        animation2.setAttribute("attributeName", "stroke");
        animation2.setAttribute("keyTimes", "0; 0.5; 1");
        animation2.setAttribute("values", "black; white; black");
        animation2.setAttribute("dur", "0.6");
        animation2.setAttribute("repeatCount", "indefinite");
        maskElement.appendChild(animation2);

        MarkSelector.selectionMask.appendChild(maskElement);
        //update dataTableSelection
        markTableManager.addHighLightRow(id);
    }

    static removeHighlight(id: string) {
        const element: HTMLElement = document.getElementById(id);
        MarkSelector.removeDisable(id);
        MarkSelector.selectionMask.removeChild(document.getElementById("__" + element.id));
        markTableManager.removeHighLightRow(id);
    }

    static addDisable(id: string) {
        MarkTableManager.disabledMarks.add(id);
        const element: HTMLElement = document.getElementById(id)
        let opacity = 1;
        const opacityAttr = element.getAttribute("opacity");
        if (opacityAttr && opacityAttr.length != 0) {
            opacity = Number(opacityAttr);
        }
        element.setAttribute("opacity", String(opacity * 0.3));
        markTableManager.removeHighLightRow(id);
        markTableManager.notOptional(id);

    }

    static removeDisable(id: string) {
        MarkTableManager.disabledMarks.delete(id);
        const element: HTMLElement = document.getElementById(id)
        let opacity = 1;
        const opacityAttr = element.getAttribute("opacity");
        if (opacityAttr && opacityAttr.length != 0) {
            opacity = Number(opacityAttr);
        }
        element.setAttribute("opacity", String(opacity / 0.3));
        markTableManager.removeNotOptional(id);
    }

    static init() {
        MarkSelector.setSingleSelect();
        const chartContainter = document.getElementById("chartContainer");
        chartContainter.onmousedown = MarkSelector.onMouseDown;
        chartContainter.addEventListener("wheel", MarkSelector.onMouseWheel);
        // MarkSelector.confirmButton = document.getElementById("confirmButton");
        // MarkSelector.confirmButton.onclick = MarkSelector.emitSelection;
        // this.confirmButton.setAttribute("style", "display:none");
    }

    static reset(disabledMarks: Set<string>, attributeSelectors: Map<string, string>, expandOptions: Set<string>[]) {
        MarkSelector.selection.clear();
        // MarkTableManager.selection.clear();
        markTableManager.reset();
        markTableManager.render();
        MarkSelector.scale = 1;
        MarkSelector.panning = { x: 0, y: 0 };
        const svg = document.getElementById("visChart");
        if (!svg) {
            return;
        }
        MarkSelector.svg = svg;

        const selectionMask = document.createElementNS("http://www.w3.org/2000/svg", "g");
        MarkSelector.selectionMask = selectionMask;
        selectionMask.id = SELECTION_MASK;

        document.getElementById("chartContent").appendChild(selectionMask);

        MarkSelector.chartDimension = {
            width: Number(MarkSelector.svg.getAttribute("width")),
            height: Number(MarkSelector.svg.getAttribute("height")),
        }
        //update dataTable
        MarkSelector.setCompleteData(disabledMarks, attributeSelectors, expandOptions);
    }

    static limitTranslate() {
        MarkSelector.panning.x = Math.min(0, MarkSelector.panning.x);
        MarkSelector.panning.x = Math.max(MarkSelector.chartDimension.width * (1 - MarkSelector.scale), MarkSelector.panning.x);
        MarkSelector.panning.y = Math.min(0, MarkSelector.panning.y);
        MarkSelector.panning.y = Math.max(MarkSelector.chartDimension.height * (1 - MarkSelector.scale), MarkSelector.panning.y);
    }

    static onMouseWheel(wheelEvent: WheelEvent) {
        // console.log(wheelEvent);
        if (MarkSelector.svg == null) {
            return;
        }
        let scaleFactor = Math.pow(1.001, -wheelEvent.deltaY);

        scaleFactor = Math.max(1 / MarkSelector.scale, scaleFactor);
        scaleFactor = Math.min(10 / MarkSelector.scale, scaleFactor);

        const center = Tool.screenToSvgCoords(MarkSelector.svg, wheelEvent.pageX, wheelEvent.pageY);

        MarkSelector.panning.x = (MarkSelector.panning.x - center.x) * scaleFactor + center.x;
        MarkSelector.panning.y = (MarkSelector.panning.y - center.y) * scaleFactor + center.y;
        MarkSelector.scale *= scaleFactor;

        MarkSelector.limitTranslate();

        document.getElementById("chartContent").setAttribute(
            "transform",
            `matrix(${MarkSelector.scale},0,0,${MarkSelector.scale},${MarkSelector.panning.x},${MarkSelector.panning.y})`
        );
    }

    static updateTranslate(moveEvent: MouseEvent) {
        MarkSelector.panning.x += moveEvent.movementX;
        MarkSelector.panning.y += moveEvent.movementY;

        MarkSelector.limitTranslate();

        document.getElementById("chartContent").setAttribute(
            "transform",
            `matrix(${MarkSelector.scale},0,0,${MarkSelector.scale},${MarkSelector.panning.x},${MarkSelector.panning.y})`
        );
    }

    static finishTranslate(upEvent: MouseEvent) {
        document.onmousemove = null;
        document.onmouseup = null;
    }

    static emitSelection() {
        if (MarkSelector.selection.size == 0) {
            return;
        }
        addSelection([...MarkSelector.selection]);
        // MarkSelector.updateSelection([...MarkSelector.selection]);
    }

    static onMouseDown(downEvent: MouseEvent) {

        if (downEvent.button == 1) {
            MarkSelector.emitSelection();
            return;
        }
        else if (downEvent.button == 2) {
            document.onmousemove = MarkSelector.updateTranslate;
            document.onmouseup = MarkSelector.finishTranslate;
            return;
        }
        // console.log("startSelection", downEvent);
        if (!MarkSelector.svg) {
            return;
        }
        // MarkSelector.selectStartPoint = Tool.screenToSvgCoords(svg, downEvent.pageX, downEvent.pageY);
        // if (MarkSelector.mode == markSelectorMode.LASSO_SELECT) {
        //     document.onmousemove = MarkSelector.updateLassoSelection;
        //     document.onmouseup = MarkSelector.finishLassoSelection;
        // } else {


        const downEvtTarget: HTMLElement = <HTMLElement>downEvent.target;
        const targetId: string = downEvtTarget.id.replace('__', '')

        if ([...MarkSelector.selection].includes(targetId)) {
            // document.onmouseup = MarkSelector.finishRectSelection;
            // if mouse move over 3px, then start drag

            let lastMouseX = downEvent.pageX, lastMouseY = downEvent.pageY;
            const mouseMoveThsh: number = 3;

            document.onmousemove = (moveEvt) => {
                if (Tool.pointDist(lastMouseX, moveEvt.pageX, lastMouseY, moveEvt.pageY) > mouseMoveThsh) {
                    dragableCanvas.createCanvas(document.querySelector('#chartContainer > svg:first-of-type'), { x: downEvent.pageX, y: downEvent.pageY });
                }
            }
            document.onmouseup = (upEvt) => {
                if (Tool.pointDist(lastMouseX, upEvt.pageX, lastMouseY, upEvt.pageY) < mouseMoveThsh) {
                    MarkSelector.finishRectSelection(upEvt);
                }
                document.onmousemove = null;
                document.onmouseup = null;
            }

        } else {
            document.onmousemove = MarkSelector.updateRectSelection;
            document.onmouseup = MarkSelector.finishRectSelection;
        }

        // }

        MarkSelector.selectStartPoint = Tool.screenToSvgCoords(MarkSelector.svg, downEvent.clientX, downEvent.clientY);
        const selectionRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        selectionRect.classList.add("selection-rect");
        // selectionRect.setAttribute("x")
        MarkSelector.selectionRect = selectionRect;
        MarkSelector.selectionMask.appendChild(selectionRect);
    }

    static updateLassoSelection(moveEvent: MouseEvent) {
        // console.log("u lasso", moveEvent);
    }

    static updateRectSelection(moveEvent: MouseEvent) {
        // console.log("u rect", moveEvent);
        const startPoint = MarkSelector.selectStartPoint;
        const endPoint = Tool.screenToSvgCoords(MarkSelector.svg, moveEvent.clientX, moveEvent.clientY);
        const selectionRect = MarkSelector.selectionRect;
        const scale = MarkSelector.scale;
        const panningX = MarkSelector.panning.x;
        const panningY = MarkSelector.panning.y;
        selectionRect.setAttribute("x", String((Math.min(endPoint.x, startPoint.x) - panningX) / scale));
        selectionRect.setAttribute("y", String((Math.min(endPoint.y, startPoint.y) - panningY) / scale));
        selectionRect.setAttribute("width", String(Math.abs(endPoint.x - startPoint.x) / scale));
        selectionRect.setAttribute("height", String(Math.abs(endPoint.y - startPoint.y) / scale));
    }

    static finishLassoSelection(upEvent: MouseEvent) {
        // console.log("f lasso", upEvent);
        document.onmousemove = null;
        document.onmouseup = null;
    }

    static finishRectSelection(upEvent: MouseEvent) {
        MarkSelector.selectionMask.removeChild(MarkSelector.selectionRect);
        document.onmousemove = null;
        document.onmouseup = null;
        const startPoint = MarkSelector.selectStartPoint;
        const endPoint = Tool.screenToSvgCoords(MarkSelector.svg, upEvent.clientX, upEvent.clientY);
        if (endPoint.x == startPoint.x && endPoint.y == startPoint.y) {
            const elementsUnderMouse = Array.from(document.elementsFromPoint(upEvent.pageX, upEvent.pageY));
            for (let element of elementsUnderMouse) {
                if (!MarkSelector.selectableMarks.has(element.id)) {
                    continue;
                }
                MarkSelector.updateSelection([element.id]);
                return;
            }
            return;
        }

        const selection: string[] = [];
        const yBegin = Math.min(startPoint.y, endPoint.y);
        const yEnd = Math.max(startPoint.y, endPoint.y);
        const xBegin = Math.min(startPoint.x, endPoint.x);
        const xEnd = Math.max(startPoint.x, endPoint.x);
        const numberSteps = 50;
        const yStep = (yEnd - yBegin) / (numberSteps - 1);
        for (let id of MarkSelector.selectableMarks) {
            // const rect = document.getElementById(id).getBoundingClientRect();
            const polygon = new Polygon();
            polygon.fromElement(document.getElementById(id));
            if (xBegin <= polygon.xMin && xEnd >= polygon.xMax && yBegin <= polygon.yMin && yEnd >= polygon.yMax) {
                selection.push(id);
            }

            // let y = yBegin;
            // let flag = false;

            // if (polygon.closed) {
            //     for (let i = 0; i < numberSteps; i++) {
            //         const intersections = polygon.lineIntersect(y).map(i => [i, 0]).concat([[xBegin, 1], [xEnd, 1]]);
            //         intersections.sort();
            //         let inPolygon = false;
            //         let inRect = false;
            //         for (let [x, f] of intersections) {
            //             if (f == 0) {
            //                 inPolygon = !inPolygon;
            //             } else {
            //                 inRect = !inRect;
            //             }
            //             if (inPolygon && inRect) {
            //                 flag = true;
            //                 break;
            //             }
            //         }
            //         if (flag) {
            //             break;
            //         }

            //         y += yStep;
            //     }
            // } else {
            //     for (let i = 0; i < numberSteps; i++) {
            //         const intersections = polygon.lineIntersect(y);
            //         for (let j of intersections) {
            //             if (j >= xBegin && j <= xEnd) {
            //                 flag = true;
            //                 break;
            //             }
            //         }
            //         y += yStep;
            //     }
            // }

            // if (flag) {
            //     selection.push(id);
            // }

            // MarkSelector.svg.appendChild(polygon.display());
        }
        MarkSelector.updateSelection(selection);
    }

    static removeSelectedTool() {
        const selectedTool = document.getElementsByClassName("selected-tool");
        if (selectedTool.length == 0) {
            return;
        }
        selectedTool[0].classList.remove("selected-tool");
    }

    static setLassoSelect() {
        if (MarkSelector.mode == MarkSelectorMode.LASSO_SELECT) {
            return;
        }
        MarkSelector.mode = MarkSelectorMode.LASSO_SELECT;
        const chartContainer = document.getElementById("chartContainer");
        chartContainer.classList.remove("single-select");
        chartContainer.classList.add("lasso-select");
        MarkSelector.removeSelectedTool();
        // document.getElementsByClassName('lasso-icon')[0].classList.add('selected-tool');
    }

    static setSingleSelect() {
        if (MarkSelector.mode == MarkSelectorMode.SINGLE_SELECT) {
            return;
        }
        MarkSelector.mode = MarkSelectorMode.SINGLE_SELECT;
        const chartContainer = document.getElementById("chartContainer");
        chartContainer.classList.remove("lasso-select");
        chartContainer.classList.add("single-select");
        MarkSelector.removeSelectedTool();
        // document.getElementsByClassName('arrow-icon')[0].classList.add('selected-tool');
    }


}

// export const markSelector = new MarkSelector();