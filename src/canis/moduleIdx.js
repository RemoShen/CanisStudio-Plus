import TimingSpec from './TimingSpec';
import Animation from './AnimationSpec';
import ActionSpec from './ActionSpec';
import CanisSpec from './CanisSpec';
import ChartSpec from './ChartSpec';

export default class Canis {
    constructor() {
        this.canisObj = {};
        this.frameRate = TimingSpec.FRAME_RATE;
    }

    duration() {
        return Animation.wholeEndTime;
    }
    renderSpecPreview(spec, callback) {
        if (Object.keys(this.canisObj).length === 0) {
            this.canisObj = new CanisSpec();
        }
        //
        this.canisObj.initPreview(spec);
        return this.canisObj.render(callback);
        // return this.canisObj.init(spec).then(() => {
        //     return this.canisObj.render(callback);
        // })
    }
    renderSpec(spec, callback) {
        if (Object.keys(this.canisObj).length === 0) {
            this.canisObj = new CanisSpec();
        }
        //
        this.canisObj.init(spec);
        return this.canisObj.render(callback);
        // return this.canisObj.init(spec).then(() => {
        //     return this.canisObj.render(callback);
        // })
    }

    reset() {
        Animation.resetAll();
    }

    exportJSON() {
        return CanisSpec.lottieJSON;
    }

    test() {
        console.log('this is a test! ');
    }
}

export { ActionSpec, TimingSpec, ChartSpec, Animation}