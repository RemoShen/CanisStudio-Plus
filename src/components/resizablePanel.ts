import '../assets/style/resizablePanel.scss'
import Tool from '../util/tool';
import Reducer from '../app/reducer';
import * as action from '../app/action'

export interface IRPanel {
    wrapper: HTMLDivElement,
    panel1: HTMLDivElement,
    panel2: HTMLDivElement
}

export interface IResizeProps {
    p1?: number
    p2?: number
    verticle: boolean
}

export default class ResizablePanel {
    static panelNum: number = 0;

    /**
     * create two panels and one resizer
     */
    public static createRPanels(resizable: boolean, props: IResizeProps): IRPanel {
        const wrapper = this.createWrapper(resizable);
        const panel1 = this.createPanel(resizable, props.verticle, props.p1, !resizable);
        const panel2 = this.createPanel(resizable, props.verticle, props.p2);
        if (props.verticle) {
            panel2.style.marginTop = resizable ? '-3px' : '0px';
        } else {
            panel2.style.marginLeft = resizable ? '-3px' : '0px';
        }

        const resizer = this.createResizer(panel1.id, panel2.id, props.verticle, resizable);
        wrapper.appendChild(panel1);
        wrapper.appendChild(resizer);
        wrapper.appendChild(panel2);
        return {
            wrapper: wrapper,
            panel1: panel1,
            panel2: panel2
        };
    }

    public static createWrapper(resizable: boolean): HTMLDivElement {
        const wrapper: HTMLDivElement = document.createElement('div');
        wrapper.className = resizable ? 'panel-wrapper' : 'panel-wrapper flex-panel-wrapper';
        return wrapper;
    }

    /**
     * create one panel
     * @param percent: 0 - 10, size of the panel
     * @param verticle: default creating verticle panels
     */
    public static createPanel(resizable: boolean, verticle: boolean, size: number, fixed: boolean = false): HTMLDivElement {
        const panel: HTMLDivElement = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'panel' + this.panelNum;
        this.panelNum++;

        if (resizable && verticle) {
            panel.classList.add('v-panel');
            panel.style.height = 'calc(' + size * 10 + '% - 0.5px)';
        } else if (resizable && !verticle) {
            panel.classList.add('h-panel');
            panel.style.width = 'calc(' + size * 10 + '% - 0.5px)';
        } else if (!resizable && verticle) {
            fixed ? panel.classList.add('v-fix-panel') : panel.classList.add('v-flex-panel');
        } else if (!resizable && !verticle) {
            fixed ? panel.classList.add('h-fix-panel') : panel.classList.add('h-flex-panel');
        }
        return panel;
    }

    public static createResizer(panelId1: string, panelId2: string, verticle: boolean, dragable: boolean): HTMLDivElement {
        const resizer: HTMLDivElement = document.createElement('div');
        const resizeBar: HTMLDivElement = document.createElement('div');
        resizeBar.className = 'resize-bar';
        resizer.appendChild(resizeBar);

        if (dragable) {
            resizer.className = verticle ? 'v-resizer' : 'h-resizer';
            resizer.setAttribute('title', 'drag to resize');
            resizer.onmousedown = (downEvt) => {
                Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
                const wrapperBBox = {
                    width: resizer.parentElement.offsetWidth,
                    height: resizer.parentElement.offsetHeight
                }
                downEvt.preventDefault();
                let downPosi = {
                    x: downEvt.pageX,
                    y: downEvt.pageY
                }
                document.onmousemove = (moveEvt) => {
                    const movePosi = {
                        x: moveEvt.pageX,
                        y: moveEvt.pageY
                    }
                    const dis = {
                        xDiff: movePosi.x - downPosi.x,
                        yDiff: movePosi.y - downPosi.y
                    }
                    if (verticle) {
                        const disPercent = dis.yDiff / wrapperBBox.height * 100;
                        const height1 = parseFloat(document.getElementById(panelId1).style.height.split('%')[0].split('(')[1]);
                        const height2 = parseFloat(document.getElementById(panelId2).style.height.split('%')[0].split('(')[1]);
                        document.getElementById(panelId1).style.height = 'calc(' + (height1 + disPercent) + '% - 0.5px)';
                        document.getElementById(panelId2).style.height = 'calc(' + (height2 - disPercent) + '% - 0.5px)';
                    } else {
                        const disPercent = dis.xDiff / wrapperBBox.width * 100;
                        const width1 = parseFloat(document.getElementById(panelId1).style.width.split('%')[0].split('(')[1]);
                        const width2 = parseFloat(document.getElementById(panelId2).style.width.split('%')[0].split('(')[1]);
                        document.getElementById(panelId1).style.width = 'calc(' + (width1 + disPercent) + '% - 0.5px)';
                        document.getElementById(panelId2).style.width = 'calc(' + (width2 - disPercent) + '% - 0.5px)';
                    }
                    downPosi = movePosi;

                    //resize the svg in view-content
                    this.resizeViewContentSVG(panelId1, panelId2);
                }
                document.onmouseup = (upEvt) => {
                    document.onmouseup = null;
                    document.onmousemove = null;
                    Reducer.triger(action.UPDATE_MOUSE_MOVING, false);

                    //resize the svg in view-content
                    this.resizeViewContentSVG(panelId1, panelId2);
                }
            }
        } else {
            resizer.className = verticle ? 'non-dragable-v-resizerv-resizer' : 'non-dragable-h-resizer';
        }

        return resizer;
    }

    public static resizeViewContentSVG(panelId1: string, panelId2: string) {
        // [panelId1, panelId2].forEach((pId) => {
        //     Tool.resizeSvgContainer(pId);
        // })
        Tool.resizePlayerContainer();
    }

}