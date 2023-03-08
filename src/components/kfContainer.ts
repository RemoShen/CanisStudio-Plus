import '../assets/style/keyframeContainer.scss'
import Tool from '../util/tool';
import { IKfGroupSize } from '../app/core/ds';
import { ICoord, ISize } from '../util/ds';
import Reducer from '../app/reducer';
import * as action from '../app/action';
import { state } from '../app/state';
import KfTrack from './widgets/kfTrack';

export class KfContainer {
    static KF_CONTAINER: string = 'kfTracksContainer';
    static KF_SCALE_ID: string = 'kfScaleWrapper';
    static KF_LIST_ID: string = 'kfList';
    // static MASK: string = 'markContainer';
    static DURATION_GRADIENT: string = 'durationGradient';
    static SHADOW: string = 'hoverShadow';
    static KF_BG: string = 'kfBgG';
    static KF_FG: string = 'kfFgG';
    static KF_POPUP: string = 'kfPopupG';
    static KF_POPCOVER: string = 'kfPopCover';
    static KF_OMIT: string = 'kfOmits';
    static KF_HINT: string = 'kfHintG';
    static KF_MENU: string = 'kfMenuG';
    static SLIDER_W: number = 10;
    static WHEEL_STEP: number = 20;

    public kfWidgetContainer: HTMLDivElement;
    public kfTrackScaleContainer: SVGGElement;
    public kfTrackContainer: SVGGElement;
    public xSliderContainer: SVGElement;
    public xSliderBg: SVGRectElement;
    public xSlider: SVGRectElement;
    public xSliderContainerW: number = 1000;
    public xSliderPercent: number = 1.0;
    public ySliderContainer: SVGElement;
    public ySliderBg: SVGRectElement;
    public ySlider: SVGRectElement;
    public ySliderContainerH: number = 200;
    public ySliderPercent: number = 1.0;
    public transDistance: ISize = { w: 0, h: 0 };

    public static showPopCover() {
        document.getElementById(this.KF_POPCOVER).setAttribute('display', '');
    }

    public static hidePopCover() {
        document.getElementById(this.KF_POPCOVER).setAttribute('display', 'none');
    }

    public createKfContainer() {
        this.kfWidgetContainer = document.createElement('div');
        this.kfWidgetContainer.setAttribute('class', 'kf-widget-container');

        //create kf container
        const keyframeTrackSVG: SVGElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        keyframeTrackSVG.setAttributeNS(null, 'id', KfContainer.KF_CONTAINER);
        keyframeTrackSVG.setAttributeNS(null, 'class', 'kf-tracks-container');

        //add gradient 
        const defs: SVGDefsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const linearGradient: SVGLinearGradientElement = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        linearGradient.id = KfContainer.DURATION_GRADIENT;
        const stop1: SVGStopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttributeNS(null, 'offset', '0%');
        stop1.setAttributeNS(null, 'stop-color', 'rgba(119, 168, 214, 0)');
        linearGradient.appendChild(stop1);
        const stop2: SVGStopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttributeNS(null, 'offset', '100%');
        stop2.setAttributeNS(null, 'stop-color', 'rgba(119, 168, 214, 255)');
        linearGradient.appendChild(stop2);
        defs.appendChild(linearGradient);
        //add shadow 
        const shadowFilter: SVGFilterElement = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        shadowFilter.id = KfContainer.SHADOW;
        const feGaussianBlur: SVGFEGaussianBlurElement = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        feGaussianBlur.setAttributeNS(null, 'in', 'SourceAlpha');
        feGaussianBlur.setAttributeNS(null, 'stdDeviation', '3');
        shadowFilter.appendChild(feGaussianBlur);
        const feOffset: SVGFEOffsetElement = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
        feOffset.setAttributeNS(null, 'dx', '0.5');
        feOffset.setAttributeNS(null, 'dy', '2');
        shadowFilter.appendChild(feOffset);
        const feComponentTransfer: SVGFEComponentTransferElement = document.createElementNS('http://www.w3.org/2000/svg', 'feComponentTransfer');
        const feFuncA: SVGFEFuncAElement = document.createElementNS('http://www.w3.org/2000/svg', 'feFuncA');
        feFuncA.setAttributeNS(null, 'type', 'linear');
        feFuncA.setAttributeNS(null, 'slope', '0.3');
        feComponentTransfer.appendChild(feFuncA);
        shadowFilter.appendChild(feComponentTransfer);
        const feMerge: SVGFEMergeElement = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode: SVGFEMergeNodeElement = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMerge.appendChild(feMergeNode);
        const feMergeNode2: SVGFEMergeNodeElement = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode2.setAttributeNS(null, 'in', 'SourceGraphic');
        feMerge.appendChild(feMergeNode2);
        shadowFilter.appendChild(feMerge);
        defs.appendChild(shadowFilter);
        keyframeTrackSVG.appendChild(defs);

        this.kfTrackScaleContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.kfTrackScaleContainer.id = KfContainer.KF_SCALE_ID;
        this.kfTrackScaleContainer.setAttributeNS(null, 'transform', `scale(${state.zoomLevel}, ${state.zoomLevel})`);

        this.kfTrackContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.kfTrackContainer.id = KfContainer.KF_LIST_ID;
        this.kfTrackContainer.setAttributeNS(null, 'class', 'kf-tracks-inner-container');

        const kfBgG: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        kfBgG.setAttributeNS(null, 'id', KfContainer.KF_BG);
        this.kfTrackContainer.appendChild(kfBgG);

        const kfFgG: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        kfFgG.setAttributeNS(null, 'id', KfContainer.KF_FG);
        const placeHolder: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        placeHolder.setAttributeNS(null, 'width', '1');
        placeHolder.setAttributeNS(null, 'height', '18');
        placeHolder.setAttributeNS(null, 'fill', '#00000000');
        kfFgG.appendChild(placeHolder);
        this.kfTrackContainer.appendChild(kfFgG);

        const kfOmitG: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        kfOmitG.setAttributeNS(null, 'id', KfContainer.KF_OMIT);
        this.kfTrackContainer.appendChild(kfOmitG);

        const kfPopCoverG: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        kfPopCoverG.setAttributeNS(null, 'id', KfContainer.KF_POPCOVER);
        const coverRect: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        coverRect.setAttributeNS(null, 'x', '0');
        coverRect.setAttributeNS(null, 'y', '0');
        coverRect.setAttributeNS(null, 'fill', 'rgba(0,0,0,0)');
        coverRect.setAttributeNS(null, 'width', `${KfTrack.TRACK_WIDTH}`);
        coverRect.setAttributeNS(null, 'height', `${KfTrack.TRACK_HEIGHT * 20}`);
        kfPopCoverG.appendChild(coverRect);
        kfPopCoverG.setAttributeNS(null, 'display', 'none');
        this.kfTrackContainer.appendChild(kfPopCoverG);

        const kfPopupG: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        kfPopupG.setAttributeNS(null, 'id', KfContainer.KF_POPUP);
        this.kfTrackContainer.appendChild(kfPopupG);

        const hintG: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        hintG.setAttributeNS(null, 'id', KfContainer.KF_HINT);
        this.kfTrackContainer.appendChild(hintG);

        const menuG: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        menuG.setAttributeNS(null, 'id', KfContainer.KF_MENU);
        this.kfTrackContainer.appendChild(menuG);

        this.kfTrackScaleContainer.appendChild(this.kfTrackContainer);
        keyframeTrackSVG.appendChild(this.kfTrackScaleContainer);
        this.kfWidgetContainer.appendChild(keyframeTrackSVG);
        //create y slider
        this.createYSlider();
        //create x slider
        this.createXSlider();

        this.kfWidgetContainer.onmouseenter = (enterEvt) => {
            enterEvt.stopPropagation();
            if (!state.mousemoving) {
                this.updateKfSlider({});
                if (parseFloat(this.xSlider.getAttributeNS(null, 'width')) < parseFloat(this.xSliderBg.getAttributeNS(null, 'width'))) {
                    this.xSliderContainer.setAttribute('style', `height:${KfContainer.SLIDER_W + 4}px; margin-top:${-KfContainer.SLIDER_W}px`);
                }
                if (parseFloat(this.ySlider.getAttributeNS(null, 'height')) < parseFloat(this.ySliderBg.getAttributeNS(null, 'height'))) {
                    this.ySliderContainer.setAttribute('style', `width:${KfContainer.SLIDER_W + 4}px; margin-top:${-this.ySliderContainerH}px;`);
                }
            }
        }
        this.kfWidgetContainer.onmouseleave = (leaveEvt) => {
            leaveEvt.stopPropagation();
            this.xSliderContainer.setAttribute('style', `height:${KfContainer.SLIDER_W + 4}px; margin-top:3px;`);
            this.ySliderContainer.setAttribute('style', `width:${KfContainer.SLIDER_W + 4}px; margin-top:${-this.ySliderContainerH}px; margin-right:${-KfContainer.SLIDER_W - 7}`)
        }
        this.kfWidgetContainer.onwheel = (wheelEvt) => {
            if (parseFloat(this.ySlider.getAttributeNS(null, 'height')) < parseFloat(this.ySliderBg.getAttributeNS(null, 'height'))) {
                let diffY: number = wheelEvt.deltaY < 0 ? -KfContainer.WHEEL_STEP : KfContainer.WHEEL_STEP;
                const currentSliderY: number = parseFloat(this.ySlider.getAttributeNS(null, 'y'));
                const currentSliderH: number = parseFloat(this.ySlider.getAttributeNS(null, 'height'));
                if (0 - currentSliderY > diffY && diffY < 0) {
                    diffY = 0 - currentSliderY;
                }
                if (this.ySliderContainerH - currentSliderY - currentSliderH < diffY && diffY > 0) {
                    diffY = this.ySliderContainerH - currentSliderY - currentSliderH;
                }
                if (currentSliderY + diffY >= 0 && currentSliderY + diffY + currentSliderH <= this.ySliderContainerH) {
                    this.ySlider.setAttributeNS(null, 'y', `${currentSliderY + diffY}`);

                    //update translate of keyframe
                    if (this.kfTrackContainer.getAttributeNS(null, 'transform')) {
                        let oriTrans: ICoord = Tool.extractTransNums(this.kfTrackContainer.getAttributeNS(null, 'transform'));
                        this.transDistance.h = oriTrans.y - diffY * this.ySliderPercent;
                        this.kfTrackContainer.setAttributeNS(null, 'transform', `translate(${oriTrans.x}, ${oriTrans.y - diffY * this.ySliderPercent})`);
                    }
                }
            }
        }
    }

    /**
     * return whether the kfcontainer is translated
     * @param diffX 
     */
    public kfContainerTransX(diffX: number): boolean {
        let translated: boolean = false;
        const currentSliderX: number = parseFloat(this.xSlider.getAttributeNS(null, 'x'));
        const currentSliderW: number = parseFloat(this.xSlider.getAttributeNS(null, 'width'));
        if (currentSliderX + diffX >= 0 && currentSliderX + diffX + currentSliderW <= this.xSliderContainerW) {
            this.xSlider.setAttributeNS(null, 'x', `${currentSliderX + diffX}`);

            //update viewBox of keyframe
            if (this.kfTrackContainer.getAttributeNS(null, 'transform')) {
                let oriTrans: ICoord = Tool.extractTransNums(this.kfTrackContainer.getAttributeNS(null, 'transform'));
                this.transDistance.w = oriTrans.x - diffX * this.xSliderPercent;
                this.kfTrackContainer.setAttributeNS(null, 'transform', `translate(${oriTrans.x - diffX * this.xSliderPercent}, ${oriTrans.y})`);
            }
            translated = true;
        }
        return translated;
    }

    public kfContainerTransXStep(downEvtX: number) {
        const clickX: number = downEvtX - this.xSliderContainer.getBoundingClientRect().x;
        const currentSliderX: number = parseFloat(this.xSlider.getAttributeNS(null, 'x'));
        const currentSliderW: number = parseFloat(this.xSlider.getAttributeNS(null, 'width'));
        let transDist: number = 0;
        if (clickX > currentSliderX) {
            const diffX: number = clickX - currentSliderX - currentSliderW;
            transDist = diffX > KfContainer.WHEEL_STEP ? KfContainer.WHEEL_STEP : diffX;
        } else {
            const diffX: number = clickX - currentSliderX;
            transDist = diffX < -KfContainer.WHEEL_STEP ? -KfContainer.WHEEL_STEP : diffX;
        }
        this.kfContainerTransX(transDist);
    }

    /**
     * return whether the kfcontainer is translated
     * @param diffY
     */
    public kfContainerTransY(diffY: number): boolean {
        let translated: boolean = false;
        const currentSliderY: number = parseFloat(this.ySlider.getAttributeNS(null, 'y'));
        const currentSliderH: number = parseFloat(this.ySlider.getAttributeNS(null, 'height'));
        if (currentSliderY + diffY >= 0 && currentSliderY + diffY + currentSliderH <= this.ySliderContainerH) {
            this.ySlider.setAttributeNS(null, 'y', `${currentSliderY + diffY}`);

            //update translate of keyframe tracks
            if (this.kfTrackContainer.getAttributeNS(null, 'transform')) {
                let oriTrans: ICoord = Tool.extractTransNums(this.kfTrackContainer.getAttributeNS(null, 'transform'));
                this.transDistance.h = oriTrans.y - diffY * this.ySliderPercent;
                this.kfTrackContainer.setAttributeNS(null, 'transform', `translate(${oriTrans.x}, ${this.transDistance.h})`);
            }
            translated = true;
        }
        return translated;
    }

    public kfContainerTransYStep(downEvtY: number) {
        const clickY: number = downEvtY - this.ySliderContainer.getBoundingClientRect().y;
        const currentSliderY: number = parseFloat(this.xSlider.getAttributeNS(null, 'y'));
        const currentSliderH: number = parseFloat(this.xSlider.getAttributeNS(null, 'height'));
        let transDist: number = 0;
        if (clickY > currentSliderY) {
            const diffY: number = clickY - currentSliderY - currentSliderH;
            transDist = diffY > KfContainer.WHEEL_STEP ? KfContainer.WHEEL_STEP : diffY;
        } else {
            const diffY: number = clickY - currentSliderY;
            transDist = diffY < -KfContainer.WHEEL_STEP ? -KfContainer.WHEEL_STEP : diffY;
        }
        this.kfContainerTransY(transDist);
    }

    public createYSlider() {
        this.ySliderContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.ySliderContainer.setAttributeNS(null, 'class', 'kf-y-slider-container');
        this.ySliderContainer.setAttribute('style', `width:${KfContainer.SLIDER_W + 4}px; margin-top:${-this.ySliderContainerH}px; margin-right:${-KfContainer.SLIDER_W - 7}`)
        this.ySliderBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.ySliderBg.classList.add('sliderContainerBg');
        this.ySliderBg.setAttributeNS(null, 'x', '0');
        this.ySliderBg.setAttributeNS(null, 'y', '0');
        this.ySliderBg.setAttributeNS(null, 'width', `${KfContainer.SLIDER_W + 4}`);
        this.ySliderBg.setAttributeNS(null, 'height', '200');
        this.ySliderBg.setAttributeNS(null, 'fill', '#cdcdcd');
        this.ySliderContainer.appendChild(this.ySliderBg);
        this.ySlider = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.ySlider.setAttributeNS(null, 'class', 'kf-slider');
        this.ySlider.setAttributeNS(null, 'x', '0');
        this.ySlider.setAttributeNS(null, 'y', '0');
        this.ySlider.setAttributeNS(null, 'width', `${KfContainer.SLIDER_W + 4}`);
        this.ySlider.setAttributeNS(null, 'height', '10000');
        this.ySlider.setAttributeNS(null, 'rx', `${KfContainer.SLIDER_W / 2}`);
        this.ySlider.setAttributeNS(null, 'fill', '#f2f2f2');
        this.ySlider.onmousedown = (downEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
            let preY: number = downEvt.pageY;
            document.onmousemove = (moveEvt) => {
                const currentY: number = moveEvt.pageY;
                const diffY: number = currentY - preY;
                if (this.kfContainerTransY(diffY)) {
                    preY = currentY;
                }
            }
            document.onmouseup = (upEvt) => {
                document.onmousemove = null;
                document.onmouseup = null;
                Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
            }
        }
        this.ySliderContainer.appendChild(this.ySlider);
        let yTransInterval: NodeJS.Timeout;
        this.ySliderContainer.onmousedown = (downEvt) => {
            if ((<SVGElement>downEvt.target).classList.contains('sliderContainerBg')) {
                this.kfContainerTransYStep(downEvt.pageY);
                yTransInterval = setInterval(() => {
                    this.kfContainerTransYStep(downEvt.pageY);
                }, 200)
            }
        }
        this.ySliderContainer.onmouseup = (upEvt) => {
            if (typeof yTransInterval !== 'undefined') {
                clearInterval(yTransInterval);
            }
        }
        this.kfWidgetContainer.appendChild(this.ySliderContainer);
    }

    public createXSlider() {
        this.xSliderContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.xSliderContainer.setAttributeNS(null, 'class', 'kf-x-slider-container');
        this.xSliderContainer.setAttribute('style', `height:${KfContainer.SLIDER_W + 4}px; margin-top:3px;`)
        this.xSliderBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.xSliderBg.classList.add('sliderContainerBg');
        this.xSliderBg.setAttributeNS(null, 'x', '0');
        this.xSliderBg.setAttributeNS(null, 'y', '0');
        this.xSliderBg.setAttributeNS(null, 'width', '10000');
        this.xSliderBg.setAttributeNS(null, 'height', `${KfContainer.SLIDER_W}`);
        this.xSliderBg.setAttributeNS(null, 'fill', '#cdcdcd');
        this.xSliderContainer.appendChild(this.xSliderBg);
        this.xSlider = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.xSlider.setAttributeNS(null, 'class', 'kf-slider');
        this.xSlider.setAttributeNS(null, 'x', '0');
        this.xSlider.setAttributeNS(null, 'y', '0');
        this.xSlider.setAttributeNS(null, 'width', '10100');
        this.xSlider.setAttributeNS(null, 'height', `${KfContainer.SLIDER_W}`);
        this.xSlider.setAttributeNS(null, 'rx', `${KfContainer.SLIDER_W / 2}`);
        this.xSlider.setAttributeNS(null, 'fill', '#f2f2f2');
        this.xSlider.onmousedown = (downEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
            let preX: number = downEvt.pageX;
            document.onmousemove = (moveEvt) => {
                moveEvt.stopPropagation();
                const currentX: number = moveEvt.pageX;
                const diffX: number = currentX - preX;
                if (this.kfContainerTransX(diffX)) {
                    preX = currentX;
                }
            }
            document.onmouseup = (upEvt) => {
                document.onmousemove = null;
                document.onmouseup = null;
                Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
            }
        }
        this.xSliderContainer.appendChild(this.xSlider);

        let xTransInterval: NodeJS.Timeout;
        this.xSliderContainer.onmousedown = (downEvt) => {
            if ((<SVGElement>downEvt.target).classList.contains('sliderContainerBg')) {
                this.kfContainerTransXStep(downEvt.pageX);
                xTransInterval = setInterval(() => {
                    this.kfContainerTransXStep(downEvt.pageX);
                }, 200)
            }
        }
        this.xSliderContainer.onmouseup = (upEvt) => {
            if (typeof xTransInterval !== 'undefined') {
                clearInterval(xTransInterval);
            }
        }

        this.kfWidgetContainer.appendChild(this.xSliderContainer);
    }

    public resetContainerTrans(): void {
        this.kfTrackContainer.setAttributeNS(null, 'transform', 'translate(0, 0)');
        this.transDistance = { w: 0, h: 0 };
        this.ySlider.setAttributeNS(null, 'y', '0');
        this.xSlider.setAttributeNS(null, 'x', '0');
    }

    public updateKfSlider(kfGroupSize: IKfGroupSize) {
        //update xslider and xslider track width
        this.xSliderContainerW = this.kfWidgetContainer.clientWidth;
        this.xSliderBg.setAttributeNS(null, 'width', `${this.xSliderContainerW}`);
        if (typeof kfGroupSize.width !== 'undefined') {
            const widthWithExtra: number = this.xSliderContainerW - 100;
            this.xSliderPercent = (kfGroupSize.width) / widthWithExtra;
            this.xSlider.setAttributeNS(null, 'width', `${widthWithExtra * (widthWithExtra / kfGroupSize.width)}`);
        }

        //update yslider and yslider track height
        this.ySliderContainerH = this.kfWidgetContainer.clientHeight;
        this.ySliderContainer.setAttribute('style', `width:${KfContainer.SLIDER_W + 4}px; margin-top:${-this.ySliderContainerH}px; margin-right:${-KfContainer.SLIDER_W - 7}`)
        this.ySliderBg.setAttributeNS(null, 'height', `${this.ySliderContainerH}`);
        if (typeof kfGroupSize.height !== 'undefined') {
            const heightWithExtra: number = this.ySliderContainerH - 60;
            this.ySliderPercent = (kfGroupSize.height) / heightWithExtra;
            this.ySlider.setAttributeNS(null, 'height', `${heightWithExtra * (heightWithExtra / kfGroupSize.height)}`);
        }
    }
}

export let kfContainer: KfContainer = new KfContainer();