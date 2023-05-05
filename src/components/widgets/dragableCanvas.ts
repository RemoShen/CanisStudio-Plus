import '../../assets/style/dragableCanvas.scss'
import { ICoord } from '../../util/ds';
import KfItem from './kfItem';
import PlusBtn from './plusBtn';
import { state, State } from '../../app_backup/state';
import Tool from '../../util/tool';
import Reducer from '../../app_backup/reducer';
import * as action from '../../app_backup/action';
import { ChartSpec, Animation } from '../../canis/moduleIdx'
import { chartManager } from '../../app/chartManager';
import { MarkSelector } from '../../app/markSelector';
import { AddPanel } from '../../app/addPanel';
import { kfTrack } from '../../app/kfTrack';

export default class DragableCanvas {
    /**
     * create a canvas when grabing the selected marks from the chart
     * @param targetSVG : svg chart being selected
     * @param downCoord : mouse down position
     */
    public createCanvas(targetSVG: HTMLElement, downCoord: ICoord) {
        targetSVG.classList.toggle('chart-when-dragging');
        document.getElementById('selectionMask').style.display = 'none';
        chartManager.marks.forEach((mark: Map<string, string>, id: string) => {
            if (!MarkSelector.selection.has(id)) {
                document.getElementById(id).style.display = 'none';
            }
        });
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
        document.getElementById('selectionMask').style.display = 'block';
        chartManager.marks.forEach((mark: Map<string, string>, id: string) => {
            if (!MarkSelector.selection.has(id)) {
                document.getElementById(id).style.display = 'block';
            }
        });

        document.onmousemove = (moveEvt) => {
            canvas.style.left = `${moveEvt.pageX - canvas.width / 2}px`;
            canvas.style.top = `${moveEvt.pageY - canvas.height / 2}px`;

            const deltaL = AddPanel.show()
            if (deltaL) {
                kfTrack.lastGroup.translate(deltaL, 0);
            }

            const addPanel: HTMLElement = document.getElementById('addPanel');
            const addPanelRect: ClientRect = addPanel.getBoundingClientRect();
            if (moveEvt.pageX >= addPanelRect.left && moveEvt.pageX <= addPanelRect.right && moveEvt.pageY >= addPanelRect.top && moveEvt.pageY <= addPanelRect.bottom) {
                AddPanel.addHighlight();
            }
            else {
                AddPanel.removeHighlight();
            }
        }
        document.onmouseup = (upEvt) => {
            canvas.remove();


            // const kfContainer: HTMLElement = document.getElementById('kfContainer');
            // const kfContainerRect: ClientRect = kfContainer.getBoundingClientRect();
            const addPanel: HTMLElement = document.getElementById('addPanel');
            const addPanelRect: ClientRect = addPanel.getBoundingClientRect();

            const deltaL = AddPanel.fold();
            kfTrack.lastGroup.translate(deltaL, 0);

            if (upEvt.pageX >= addPanelRect.left && upEvt.pageX <= addPanelRect.right && upEvt.pageY >= addPanelRect.top && upEvt.pageY <= addPanelRect.bottom) {
                MarkSelector.emitSelection();
            }

            targetSVG.classList.toggle('chart-when-dragging');
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
}

export const dragableCanvas = new DragableCanvas();