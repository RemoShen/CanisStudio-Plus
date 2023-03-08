import '../../assets/style/hint.scss'
import { ICoord } from "../../util/ds";
import { KfContainer } from "../kfContainer";
import Tool from "../../util/tool";
import Reducer from '../../app/reducer';
import * as action from '../../app/action';
import { State, state } from '../../app/state';

export class Hint {
    static CHAR_LEN: number = 9;
    static HINT_HEIGHT: number = 12;
    static PADDING: number = 2;
    static FILL_COLOR: string = '#fff';
    static STROKE_COLOR: string = '#000';
    static TIMING_FILL_COLOR: string = '#efefef';
    static TIMING_BORDER_COLOR: string = '#383838';
    static TIMING_HINT_HEIGHT: number = 21;
    static TIMING_HINT_ID: string = 'timingHint';

    public hintContent: string = '';
    public container: SVGGElement;
    public hintBg: SVGRectElement;
    public textWrapper: SVGForeignObjectElement;
    public contentText: SVGTextContentElement;
    public contentInput: HTMLInputElement;
    public pointer: SVGPathElement;
    public content: string = '';

    public createHint(mousePosi: ICoord, content: string, w: number = -1): void {
        this.removeHint();
        this.removeTimingHint();
        this.content = content;
        const svgHintLayer: HTMLElement = document.getElementById(KfContainer.KF_HINT);
        const hintLayerBBox: DOMRect = svgHintLayer.getBoundingClientRect();//fixed
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.setAttributeNS(null, 'transform', `translate(${(mousePosi.x - hintLayerBBox.left) / state.zoomLevel + 4}, ${(mousePosi.y - hintLayerBBox.top) / state.zoomLevel + 2})`);
        this.hintBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.hintBg.setAttributeNS(null, 'width', `${w === -1 ? Hint.CHAR_LEN * this.content.length : w}`);
        this.hintBg.setAttributeNS(null, 'height', `${Hint.HINT_HEIGHT + 2 * Hint.PADDING}`);
        this.hintBg.setAttributeNS(null, 'fill', `${Hint.FILL_COLOR}`);
        this.hintBg.setAttributeNS(null, 'stroke', `${Hint.STROKE_COLOR}`);
        this.container.appendChild(this.hintBg);
        this.contentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.contentText.setAttributeNS(null, 'x', `${Hint.PADDING}`);
        this.contentText.setAttributeNS(null, 'y', `${Hint.HINT_HEIGHT}`);
        // this.contentText.setAttributeNS(null, 'font-size', '9pt');
        this.contentText.classList.add('monospace-font', 'small-font');
        this.contentText.innerHTML = this.content;
        this.container.appendChild(this.contentText);
        svgHintLayer.appendChild(this.container);

        document.onmousemove = (moveEvt) => {
            this.container.setAttributeNS(null, 'transform', `translate(${(moveEvt.pageX - hintLayerBBox.left) / state.zoomLevel + 4}, ${(moveEvt.pageY - hintLayerBBox.top) / state.zoomLevel + 2})`);
        }
    }

    public removeHint() {
        const svgHintLayer: HTMLElement = document.getElementById(KfContainer.KF_HINT);
        if (svgHintLayer.contains(this.container)) {
            svgHintLayer.removeChild(this.container);
        }
        document.onmousemove = null;
    }

    public createTimingHint(pointingPosi: ICoord, content: string, actionType: string, actionInfo: any = {}): void {
        this.removeHint();
        this.removeTimingHint();
        this.content = content;
        const textBlocks: string[] = this.content.split(':');

        const svgHintLayer: HTMLElement = document.getElementById(KfContainer.KF_HINT);
        const hintLayerBBox: DOMRect = svgHintLayer.getBoundingClientRect();//fixed
        // const hintWidth: number = Hint.CHAR_LEN * this.content.length + 2 * Hint.PADDING;
        const hintWidth: number = textBlocks[0] === 'duration' ? 138 : 116;
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.id = Hint.TIMING_HINT_ID;
        this.container.setAttributeNS(null, 'transform', `translate(${(pointingPosi.x - hintLayerBBox.left) / state.zoomLevel - hintWidth / 2}, ${(pointingPosi.y - hintLayerBBox.top) / state.zoomLevel - Hint.TIMING_HINT_HEIGHT})`);
        this.container.onmouseleave = () => {
            this.removeTimingHint();
        }

        const fakeBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        fakeBg.setAttributeNS(null, 'width', `${hintWidth}`);
        fakeBg.setAttributeNS(null, 'height', `${Hint.HINT_HEIGHT * 2}`);
        fakeBg.setAttributeNS(null, 'fill', '#00000000');
        this.container.appendChild(fakeBg);

        this.hintBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.hintBg.classList.add('drop-shadow-ele');
        this.hintBg.setAttributeNS(null, 'width', `${hintWidth}`);
        this.hintBg.setAttributeNS(null, 'height', `${Hint.HINT_HEIGHT + 2 * Hint.PADDING}`);
        this.hintBg.setAttributeNS(null, 'fill', `${Hint.TIMING_FILL_COLOR}`);
        this.hintBg.setAttributeNS(null, 'stroke', `${Hint.TIMING_BORDER_COLOR}`);
        this.container.appendChild(this.hintBg);

        //append text
        this.contentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.contentText.setAttributeNS(null, 'x', `${Hint.PADDING}`);
        this.contentText.setAttributeNS(null, 'y', `${Hint.HINT_HEIGHT}`);
        this.contentText.setAttributeNS(null, 'fill', `${Hint.TIMING_BORDER_COLOR}`);
        this.contentText.innerHTML = `${textBlocks[0]}:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ms`;
        this.container.appendChild(this.contentText);
        this.textWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        this.textWrapper.setAttributeNS(null, 'x', `${(textBlocks[0].length + 1) * 8}`);
        this.textWrapper.setAttributeNS(null, 'width', `${hintWidth - (textBlocks[0].length + 4) * 8}`);
        this.textWrapper.setAttributeNS(null, 'height', `${Hint.HINT_HEIGHT + 2 * Hint.PADDING}`);
        this.contentInput = document.createElement('input');
        this.contentInput.classList.add('monospace-font', 'small-font', 'hint-input');
        this.contentInput.value = textBlocks[1].substring(0, textBlocks[1].length - 2);
        this.contentInput.onfocus = () => {
            this.container.onmouseleave = null;
        }
        this.contentInput.onblur = () => {
            const timingValue: number = parseFloat(this.contentInput.value);
            switch (actionType) {
                case action.UPDATE_DURATION:
                    actionInfo.duration = timingValue;
                    break;
                case action.UPDATE_ANI_OFFSET:
                    actionInfo.offset = timingValue;
                    break;
                case action.UPDATE_DELAY_BETWEEN_GROUP:
                case action.UPDATE_DELAY_BETWEEN_KF:
                    actionInfo.delay = timingValue;
                    break;
            }
            this.removeTimingHint();
            State.tmpStateBusket.push({
                historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                currentAction: { actionType: actionType, actionVal: actionInfo }
            })
            State.saveHistory();
            Reducer.triger(actionType, actionInfo);
        }
        this.textWrapper.appendChild(this.contentInput);
        this.container.appendChild(this.textWrapper);
        this.pointer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.pointer.classList.add('drop-shadow-ele');
        this.pointer.setAttributeNS(null, 'd', `M0,0 H6 L3,${Hint.TIMING_HINT_HEIGHT - Hint.HINT_HEIGHT - 2 * Hint.PADDING} Z`);
        this.pointer.setAttributeNS(null, 'transform', `translate(${hintWidth / 2 - 6}, ${Hint.HINT_HEIGHT + 2 * Hint.PADDING})`);
        this.pointer.setAttributeNS(null, 'fill', `${Hint.TIMING_BORDER_COLOR}`);
        this.container.appendChild(this.pointer);
        svgHintLayer.appendChild(this.container);
    }

    public updateTimingHint(diffX: number, content: string) {
        this.content = content;
        const textBlocks: string[] = this.content.split(':');
        this.contentInput.value = textBlocks[1].substring(0, textBlocks[1].length - 2);
        const containerTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
        const newW: number = Hint.CHAR_LEN * this.content.length + 2 * Hint.PADDING;
        const oriW: number = parseFloat(this.hintBg.getAttributeNS(null, 'width'));
        const diffW: number = newW - oriW;
        // this.hintBg.setAttributeNS(null, 'width', `${newW}`);
        this.container.setAttributeNS(null, 'transform', `translate(${containerTrans.x + diffX}, ${containerTrans.y})`);
        // this.pointer.setAttributeNS(null, 'transform', `translate(${newW / 2 - 6}, ${Hint.HINT_HEIGHT + 2 * Hint.PADDING})`);
    }

    public removeTimingHint() {
        const svgHintLayer: HTMLElement = document.getElementById(KfContainer.KF_HINT);
        if (svgHintLayer.contains(this.container)) {
            svgHintLayer.removeChild(this.container);
            this.contentInput.onfocus = null;
            this.contentInput.onblur = null;
        }
    }
}

export let hintTag: Hint = new Hint();