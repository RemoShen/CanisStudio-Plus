import '../../assets/style/dragableCanvas.scss'
import { ICoord } from '../../util/ds';
import KfItem from './kfItem';
import PlusBtn from './plusBtn';
import { state, State } from '../../app/state';
import { Animation } from 'canis_toolkit';
import Tool from '../../util/tool';
import Reducer from '../../app/reducer';
import * as action from '../../app/action';

export default class DragableCanvas {
    /**
     * create a canvas when grabing the selected marks from the chart
     * @param targetSVG : svg chart being selected
     * @param downCoord : mouse down position
     */
    public createCanvas(targetSVG: HTMLElement, downCoord: ICoord) {
        targetSVG.classList.toggle('chart-when-dragging');
        document.getElementById('highlightSelectionFrame').style.display = 'none';
        Array.from(document.getElementsByClassName('non-framed-mark')).forEach((m: HTMLElement) => m.style.display = 'none');
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.className = 'drag-drop-canvas grab-selection';
        canvas.id = 'dragDropCanvas';
        const ctx = canvas.getContext('2d');
        document.body.appendChild(canvas);

        const svgW: number = targetSVG.getBoundingClientRect().width, svgH: number = targetSVG.getBoundingClientRect().height;//fixed
        canvas.width = KfItem.KF_WIDTH;
        canvas.height = KfItem.KF_HEIGHT;
        ctx.fillStyle = '#eaeaea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvas.style.left = `${downCoord.x - canvas.width / 2}px`;
        canvas.style.top = `${downCoord.y - canvas.height / 2}px`;
        let img = new Image();
        img.onload = () => {
            //shrink the svg size to the same size as kf
            let dx: number = 0, dy: number = 0, scaleWidth: number = canvas.width, scaleHeight: number = canvas.width * (svgH / svgW);
            if (scaleHeight <= canvas.height) {
                dy = (canvas.height - scaleHeight) / 2;
            } else {
                scaleHeight = canvas.height;
                scaleWidth = canvas.height * (svgW / svgH);
                dx = (canvas.width - scaleWidth) / 2;
            }
            ctx.drawImage(img, dx, dy, scaleWidth, scaleHeight);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa((new XMLSerializer()).serializeToString(targetSVG));

        document.getElementById('highlightSelectionFrame').style.display = 'block';
        Array.from(document.getElementsByClassName('non-framed-mark')).forEach((m: HTMLElement) => m.style.display = 'block');

        const selectedCls: string[] = state.selection.map((mId: string) => Animation.markClass.get(mId));//find the classes of selected marks
        PlusBtn.highlightPlusBtns([...new Set(selectedCls)]);//highlight kfs which can be dropped on
        document.onmousemove = (moveEvt) => {
            canvas.style.left = `${moveEvt.pageX - canvas.width / 2}px`;
            canvas.style.top = `${moveEvt.pageY - canvas.height / 2}px`;
            const dragOverItem: PlusBtn | KfItem = Tool.judgeDragOver({ x: moveEvt.pageX, y: moveEvt.pageY });
            if (typeof dragOverItem !== 'undefined') {
                dragOverItem.dragSelOver();
            } else {
                if (typeof PlusBtn.dragoverBtn !== 'undefined') {
                    PlusBtn.dragoverBtn.dragSelOut();
                } else if (typeof KfItem.dragoverKf !== 'undefined') {
                    KfItem.dragoverKf.dragSelOut();
                }
            }
        }
        document.onmouseup = (upEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
            canvas.remove();
            //update kf if drop on plus button or kf
            if (typeof PlusBtn.dragoverBtn !== 'undefined') {
                const selectedMarks: string[] = state.selection;
                Reducer.triger(action.UPDATE_SELECTION, []);//reset state selection

                State.tmpStateBusket.push({
                    historyAction: { actionType: action.ACTIVATE_PLUS_BTN, actionVal: { aniId: '', selection: [], renderedUniqueIdx: -10 } },
                    currentAction: { actionType: action.ACTIVATE_PLUS_BTN, actionVal: { aniId: PlusBtn.dragoverBtn.aniId, selection: selectedMarks, renderedUniqueIdx: -1 } }
                })
                State.saveHistory();
                Reducer.triger(action.ACTIVATE_PLUS_BTN, { aniId: PlusBtn.dragoverBtn.aniId, selection: selectedMarks, renderedUniqueIdx: -1 });

            } else if (typeof KfItem.dragoverKf !== 'undefined') {
                // KfItem.dragoverKf.dropSelOn();
            }

            PlusBtn.cancelHighlightPlusBtns();
            // KfItem.cancelHighlightKfs();
            PlusBtn.dragoverBtn = undefined;
            KfItem.dragoverKf = undefined;
            targetSVG.classList.toggle('chart-when-dragging');
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
}

export const dragableCanvas = new DragableCanvas();