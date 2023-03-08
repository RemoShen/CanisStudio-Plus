import '../../assets/style/slider.scss'
import Reducer from '../../app/reducer';
import * as action from '../../app/action';

export default class Slider {
    static SLIDER_HEIGHT = 26;
    static SLIDER_WIDTH = 100;
    static SLIDER_RADIUS = 5;
    static TRACK_WIDTH = 2;
    static MIN_WIDTH = 100;

    domain: number[];//value this slider covers
    currentValue: number;
    hideSlider: boolean;

    //properties of the slider
    containerHeight: number;
    _containerWidth: number;
    sliderRadius: number;
    sliderMargin: number;
    trackWidth: number;
    reverseScale: (a: number) => number;//return the data value which the slider currently encodes
    scale: (a: number) => number;//return position of the slider with the input data value
    created: boolean = false;//whether this slide bar is added
    callbackFunc: (v: number) => void;//function to call on mouse up

    //components in the slider
    sliderContainer: SVGSVGElement;
    slider: SVGCircleElement;
    trackBg: SVGLineElement;
    trackPassed: SVGLineElement;

    set containerWidth(cw: number) {
        this._containerWidth = cw >= Slider.MIN_WIDTH ? cw : Slider.MIN_WIDTH;
        if (this.created) {
            this.sliderContainer.setAttributeNS(null, 'width', (this._containerWidth + 2 * this.sliderMargin).toString());
            this.trackBg.setAttributeNS(null, 'x2', (this.containerWidth + this.sliderMargin).toString());
            this.slider.setAttributeNS(null, 'cx', this.scale(this.currentValue).toString());
            this.trackPassed.setAttributeNS(null, 'x2', this.scale(this.currentValue).toString());
        }
    }
    get containerWidth() {
        return this._containerWidth;
    }

    constructor(domain: number[], defaultValue: number = 0, hideSlider: boolean = false, sliderRadius: number = Slider.SLIDER_RADIUS, trackWidth: number = Slider.TRACK_WIDTH, sliderWidth: number = Slider.SLIDER_WIDTH, sliderHeight: number = Slider.SLIDER_HEIGHT) {
        this.domain = domain;
        this.currentValue = defaultValue;
        this.hideSlider = hideSlider;
        this.sliderRadius = sliderRadius;
        this.sliderMargin = this.sliderRadius + 2;
        this.trackWidth = trackWidth;
        this.containerHeight = sliderHeight;
        this.containerWidth = sliderWidth - 2 * this.sliderMargin;
        this.reverseScale = (a: number) => {
            return Math.floor(100 * (((a - this.sliderMargin) / this.containerWidth) * (this.domain[1] - this.domain[0]) + this.domain[0])) / 100;
        }
        this.scale = (a: number) => {
            if (this.domain[1] !== this.domain[0]) {
                return Math.floor(100 * (this.containerWidth * (a - this.domain[0]) / (this.domain[1] - this.domain[0]) + this.sliderMargin)) / 100;
            }
            return this.sliderMargin;
        }
    }

    public createSlider(): void {
        this.sliderContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.sliderContainer.setAttributeNS(null, 'class', 'slider-container');
        this.sliderContainer.setAttributeNS(null, 'width', (this.containerWidth + 2 * this.sliderMargin).toString());
        this.sliderContainer.setAttributeNS(null, 'height', this.containerHeight.toString());
        //create track background
        this.trackBg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.trackBg.setAttributeNS(null, 'x1', this.sliderMargin.toString());
        this.trackBg.setAttributeNS(null, 'y1', (this.containerHeight / 2).toString());
        this.trackBg.setAttributeNS(null, 'x2', (this.containerWidth + this.sliderMargin).toString());
        this.trackBg.setAttributeNS(null, 'y2', (this.containerHeight / 2).toString());
        this.trackBg.setAttributeNS(null, 'stroke', '#c2c2c2');
        this.trackBg.setAttributeNS(null, 'stroke-width', this.trackWidth.toString());
        this.sliderContainer.appendChild(this.trackBg);

        //create track for the passed time
        this.trackPassed = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.trackPassed.setAttributeNS(null, 'class', 'track-passed');
        this.trackPassed.setAttributeNS(null, 'x1', this.sliderMargin.toString());
        this.trackPassed.setAttributeNS(null, 'y1', (this.containerHeight / 2).toString());
        this.trackPassed.setAttributeNS(null, 'x2', this.scale(this.currentValue).toString());
        this.trackPassed.setAttributeNS(null, 'y2', (this.containerHeight / 2).toString());
        this.trackPassed.setAttributeNS(null, 'stroke-width', this.trackWidth.toString());
        this.sliderContainer.appendChild(this.trackPassed);

        //create slider
        this.slider = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.slider.setAttributeNS(null, 'class', 'slider ' + (this.hideSlider ? 'hidden-slider' : ''));
        this.slider.setAttributeNS(null, 'r', this.sliderRadius.toString());
        this.slider.setAttributeNS(null, 'cx', this.scale(this.currentValue).toString());
        this.slider.setAttributeNS(null, 'cy', (this.containerHeight / 2).toString());

        //bind dragging event to the slider
        this.slider.onmousedown = (downEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
            let preX: number = downEvt.pageX;
            document.onmousemove = (moveEvt) => {
                const currentX: number = moveEvt.pageX;
                const diffX: number = currentX - preX;
                const currentSliderX: number = parseFloat(this.slider.getAttributeNS(null, 'cx'));
                if (currentSliderX + diffX <= this.containerWidth + this.sliderMargin && currentSliderX + diffX >= this.sliderMargin) {
                    this.slider.setAttributeNS(null, 'cx', (currentSliderX + diffX).toString());
                    this.trackPassed.setAttributeNS(null, 'x2', (currentSliderX + diffX).toString());
                    preX = currentX;
                }
                if (this.callbackFunc && typeof this.callbackFunc !== 'undefined') {
                    this.callbackFunc(this.reverseScale(currentSliderX));
                }
            }
            document.onmouseup = () => {
                Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                const currentSliderX: number = parseFloat(this.slider.getAttributeNS(null, 'cx'));
                this.currentValue = this.reverseScale(currentSliderX);
                if (this.callbackFunc && typeof this.callbackFunc !== 'undefined') {
                    this.callbackFunc(this.currentValue);
                }
                document.onmousemove = null;
                document.onmouseup = null;
            }
        }
        this.sliderContainer.appendChild(this.slider);
        this.created = true;
        // return sliderContainer;
    }

    public moveSlider(value: number): void {
        this.currentValue = value;
        this.slider.setAttributeNS(null, 'cx', this.scale(value).toString());
        this.trackPassed.setAttributeNS(null, 'x2', this.scale(value).toString());
        if (this.callbackFunc && typeof this.callbackFunc !== 'undefined') {
            this.callbackFunc(value);
        }
    }

    /**
     * 
     * @param cw new container width
     */
    public updateSlider(cw: number) {
        this.containerWidth = cw;
    }

    public updateDomain(domain: [number, number]) {
        this.domain = domain;
    }
}