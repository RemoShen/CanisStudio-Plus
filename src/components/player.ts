import '../assets/style/player.scss'

import Slider from './widgets/slider'
import { state } from '../app/state';

interface IPlayerProps {
    frameRate: number
    currentTime: number
    totalTime: number
}

export class Player {
    static PLAY_BTN_ID: string = 'playBtn';
    static TOTAL_TIME_SPAN_ID: string = 'totalTime';
    static CURRENT_TIME_SPAN_ID: string = 'currentTime';

    //lottieJSON:any
    widget: HTMLDivElement;
    playing: boolean;
    frameRate: number;
    _currentTime: number;
    _totalTime: number;
    animationInterval: any;

    //component
    slider: Slider;

    constructor() {
        this._currentTime = 0;
        this._totalTime = 0;
        this.frameRate = 10;
        this.playing = false;
        this.createPlayer();
    }

    set currentTime(time: number) {
        this._currentTime = time;
        this.renderCurrentTime();
    }
    get currentTime(): number {
        return this._currentTime;
    }
    set totalTime(time: number) {
        this._totalTime = time;
        this.renderTotalTime()
    }
    get totalTime(): number {
        return this._totalTime;
    }

    public createPlayer(): void {
        this.widget = document.createElement('div');
        // this.widget.style.minWidth = (0.98 * window.innerWidth / 2).toString() + 'px';
        const playBtnWrapper: HTMLDivElement = document.createElement('div');
        playBtnWrapper.id = 'playBtnWrapper';
        playBtnWrapper.className = 'play-btn-wrapper';
        playBtnWrapper.title = 'Play';
        const playCheck: HTMLInputElement = document.createElement('input');
        playCheck.type = 'checkbox';
        playCheck.value = 'None';
        playCheck.id = Player.PLAY_BTN_ID;
        playCheck.name = 'check';
        playCheck.checked = true;
        playBtnWrapper.appendChild(playCheck);
        const playLabel: HTMLLabelElement = document.createElement('label');
        playLabel.setAttribute('for', 'playBtn');
        playLabel.setAttribute('tabindex', '1');
        playBtnWrapper.appendChild(playLabel);
        playCheck.onclick = (e) => {
            if (this.playing) {
                this.pauseAnimation();
            } else {
                this.playAnimation();
            }
        }
        this.widget.appendChild(playBtnWrapper);

        this.slider = new Slider([0, 1], 0, true, 5, 2, Slider.MIN_WIDTH);
        this.slider.createSlider();
        this.slider.callbackFunc = this.renderFrame;
        this.widget.appendChild(this.slider.sliderContainer);

        const timeWrapper: HTMLDivElement = document.createElement('div');
        timeWrapper.className = 'time-span-wrapper';
        const currentTimeSpan: HTMLSpanElement = document.createElement('span');
        currentTimeSpan.id = Player.CURRENT_TIME_SPAN_ID;
        currentTimeSpan.innerText = this.formatTime(this.currentTime);
        const splitSpan: HTMLSpanElement = document.createElement('span');
        splitSpan.innerText = '/';
        const totalTimeSpan: HTMLSpanElement = document.createElement('span');
        totalTimeSpan.id = Player.TOTAL_TIME_SPAN_ID;
        totalTimeSpan.innerText = this.formatTime(this.totalTime);
        timeWrapper.appendChild(currentTimeSpan);
        timeWrapper.appendChild(splitSpan);
        timeWrapper.appendChild(totalTimeSpan);
        this.widget.appendChild(timeWrapper);
    }

    /**
     * 00:00.00
     * @param time : time in ms
     */
    public formatTime(time: number): string {
        const minNum: number = Math.floor(time / 60000);
        const secNum: number = Math.floor((time - minNum * 60000) / 1000);
        const msNum: number = Math.floor((time - minNum * 60000 - secNum * 1000) / 10);
        const minStr: string = minNum < 10 ? '0' + minNum.toString() : minNum.toString();
        const secStr: string = secNum < 10 ? '0' + secNum.toString() : secNum.toString();
        const msStr: string = msNum < 10 ? '0' + msNum.toString() : msNum.toString();
        return minStr + ':' + secStr + '.' + msStr;
    }

    public renderTotalTime() {
        document.getElementById(Player.TOTAL_TIME_SPAN_ID).innerHTML = (this.formatTime(this.totalTime));
    }

    public renderCurrentTime() {
        document.getElementById(Player.CURRENT_TIME_SPAN_ID).innerHTML = (this.formatTime(this.currentTime));
    }

    public resizePlayer(cw: number): void {
        this.slider.containerWidth = cw;
    }

    public updateTimeDomain() {
        this.slider.updateDomain([0, this.totalTime]);
    }

    public resetPlayer(props: IPlayerProps) {
        this.frameRate = props.frameRate;
        this.currentTime = props.currentTime;
        this.totalTime = props.totalTime;
        this.updateTimeDomain();
    }

    public renderFrame(time: number) {
        player.currentTime = time;
        state.lottieAni.goToAndStop(Math.ceil(time / (1000 / player.frameRate)), true);
    }

    public playAnimation() {
        if (this.currentTime === this.totalTime) {
            this.currentTime = 0;
            if (state.lottieAni) {
                state.lottieAni.stop();
            }
        } else {
            this.currentTime = Math.floor(this.currentTime / (1000 / this.frameRate)) * (1000 / this.frameRate);
        }
        this.playing = true;
        if (state.lottieAni) {
            state.lottieAni.play();
        }
        if (document.getElementById('playBtnWrapper')) {
            document.getElementById('playBtnWrapper').title = 'Stop';
        }
        this.animationInterval = setInterval(() => {
            this.slider.moveSlider(this.currentTime);
            const nextTimePoint: number = this.currentTime + (1000 / this.frameRate);
            if (nextTimePoint > this.totalTime) {
                this.pauseAnimation();
                (<HTMLInputElement>document.getElementById(Player.PLAY_BTN_ID)).checked = true;
            } else {
                this.currentTime = nextTimePoint;
            }
        }, 1000 / this.frameRate)
    }

    public pauseAnimation() {
        this.playing = false;
        if (state.lottieAni) {
            state.lottieAni.pause();
        }
        if (document.getElementById('playBtnWrapper')) {
            document.getElementById('playBtnWrapper').title = 'Play';
        }
        clearInterval(this.animationInterval);
        this.animationInterval = 'undefined';
    }
}

export let player = new Player();