import '../assets/style/nav.scss'
import LogoImg from '../assets/img/logo.png'
import FloatingWindow from './floatingWindow'
import Reducer from '../app/reducer';
import * as action from '../app/action';
import { State, state } from '../app/state';
import { ViewContent } from './viewWindow';
import { Loading } from './widgets/loading';
import Tool from '../util/tool';
import { player } from './player';

export default class Nav {
    navContainer: HTMLDivElement;

    public createNav() {
        this.navContainer = document.createElement('div');
        this.navContainer.className = 'nav';

        // create logo contianer
        const logoContainer: HTMLSpanElement = document.createElement('span');
        logoContainer.className = 'logo-container';
        const logo: HTMLImageElement = new Image();
        logo.src = LogoImg;
        logoContainer.appendChild(logo);
        const logoText: HTMLSpanElement = document.createElement('span');
        logoText.textContent = 'CAST';
        logoText.className = 'title-text';
        logoContainer.appendChild(logoText);
        this.navContainer.appendChild(logoContainer);

        this.navContainer.appendChild(this.createSeparator());

        // create buttons
        // this.navContainer.appendChild(new NavBtn().createNavFileBtn({
        //     inputId: 'createNew',
        //     classNameStr: 'new',
        //     title: 'load chart',
        //     evtType: NavBtn.CREATE_NEW
        // }));
        this.navContainer.appendChild(new NavBtn().createNavBtn({
            classNameStr: 'open',
            title: 'open project',
            evtType: NavBtn.OPEN_PROJECT
        }));
        this.navContainer.appendChild(new NavBtn().createNavBtn({
            classNameStr: 'save',
            title: 'save project',
            evtType: NavBtn.SAVE_PROJECT
        }));
        this.navContainer.appendChild(new NavBtn().createNavBtn({
            classNameStr: 'export',
            title: 'export',
            evtType: NavBtn.EXPORT
        }));
        this.navContainer.appendChild(this.createSeparator());
        this.navContainer.appendChild(new NavBtn().createNavBtn({
            classNameStr: 'revert',
            title: 'revert',
            evtType: NavBtn.REVERT
        }));
        this.navContainer.appendChild(new NavBtn().createNavBtn({
            classNameStr: 'redo',
            title: 'redo',
            evtType: NavBtn.REDO
        }));
        this.navContainer.appendChild(this.createSeparator());
        this.navContainer.appendChild(new NavBtn().createNavBtn({
            classNameStr: 'reset',
            title: 'reset',
            evtType: NavBtn.RESET
        }));
        this.navContainer.appendChild(this.createSeparator());

        const testBtn: HTMLButtonElement = document.createElement('button');
        // testBtn.innerHTML = 'testSpec';
        testBtn.innerHTML = 'testGif';
        testBtn.onclick = () => {
            // NavBtn.testSpec();
            NavBtn.testGif();
        }
        // this.navContainer.appendChild(testBtn);
    }

    public createSeparator() {
        const sep: HTMLSpanElement = document.createElement('span');
        sep.className = 'separator';
        return sep;
    }
}

interface INavBtnProps {
    inputId?: string,
    classNameStr: string,
    title: string,
    evtType: string
}

class NavBtn {
    // static vars
    // static CREATE_NEW: string = 'createNew';
    static OPEN_PROJECT: string = 'openProject';
    static SAVE_PROJECT: string = 'saveProject';
    static LOAD_EXAMPLES: string = 'loadExamples';
    static EXPORT: string = 'export';
    static REVERT: string = 'revert';
    static REDO: string = 'redo';
    static RESET: string = 'reset';

    /**
     * create buttons whose event listeners are not file related
     * @param props 
     */
    createNavBtn(props: INavBtnProps): HTMLSpanElement {
        const btn: HTMLSpanElement = document.createElement('span');
        btn.className = 'nav-btn';
        btn.setAttribute('title', Tool.firstLetterUppercase(props.title));
        switch (props.evtType) {
            case NavBtn.OPEN_PROJECT:
                btn.onclick = () => this.openProject();
                break;
            case NavBtn.SAVE_PROJECT:
                btn.onclick = () => this.saveProject();
                break;
            case NavBtn.EXPORT:
                // btn.onclick = () => this.exportLottie();
                btn.onclick = () => {
                    this.createSubMenu(NavBtn.EXPORT, btn);
                }
                break;
            case NavBtn.REVERT:
                btn.onclick = () => this.revert();
                break;
            case NavBtn.REDO:
                btn.onclick = () => this.redo();
                break;
            case NavBtn.RESET:
                btn.onclick = () => this.reset();
                break;
        }

        const icon: HTMLElement = document.createElement('span');
        icon.className = props.classNameStr + '-icon';
        btn.appendChild(icon);

        return btn;
    }

    createSubMenu(evtType: string, parentBtn: HTMLSpanElement) {
        switch (evtType) {
            case NavBtn.EXPORT:
                parentBtn.classList.add('active-btn');
                const menuContainer: HTMLDivElement = document.createElement('div');
                const parentBBox: DOMRect = parentBtn.getBoundingClientRect();
                menuContainer.className = 'sub-menu-container';
                menuContainer.style.top = `${parentBBox.bottom}px`;
                menuContainer.style.left = `${parentBBox.left}px`;
                const ul: HTMLUListElement = document.createElement('ul');
                ul.appendChild(this.createSubMenuItem('Export as Lottie', this.exportLottie));
                ul.appendChild(this.createSubMenuItem('Export as mp4', this.exportVideo));
                menuContainer.appendChild(ul);
                document.body.appendChild(menuContainer);

                menuContainer.onmouseleave = (leaveEvt) => {
                    menuContainer.remove();
                    parentBtn.classList.remove('active-btn');
                }
                break;
        }
    }

    createSubMenuItem(content: string, func: any): HTMLLIElement {
        const item: HTMLLIElement = document.createElement('li');
        item.innerHTML = content;
        item.onclick = () => {
            func();
        }
        return item;
    }

    /**
     * create buttons whose event listeners are file related
     * @param props
     */
    createNavFileBtn(props: INavBtnProps) {
        const btn: HTMLSpanElement = document.createElement('span');
        btn.className = 'nav-btn';
        btn.setAttribute('title', Tool.firstLetterUppercase(props.title));
        btn.onclick = () => {
            document.getElementById(props.inputId).click();
        }

        const input: HTMLInputElement = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.id = props.inputId;
        input.style.display = 'none';
        btn.appendChild(input);

        const icon: HTMLSpanElement = document.createElement('span');
        icon.className = props.classNameStr + '-icon';
        btn.appendChild(icon);

        return btn;
    }

    // btn listeners
    public openProject() {
        const floatingWindow: FloatingWindow = new FloatingWindow();
        floatingWindow.createFloatingWindow(FloatingWindow.TYPE_EXAMPLE);
        document.getElementById('appWrapper').appendChild(floatingWindow.floatingWindow);
    }

    public saveProject() {
        const outputObj = {
            spec: state.spec
        }

        const file = new Blob([JSON.stringify(outputObj, null, 2)], { type: 'application/json' });
        const fileName = 'cast_project.cpro';
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, fileName);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    public exportLottie() {
        const file = new Blob([JSON.stringify(state.lottieSpec, null, 2)], { type: 'application/json' });
        const fileName = 'animatedChart.json';
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, fileName);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    public exportVideo() {
        const targetSVG: any = document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID).querySelector('svg');
        if (typeof targetSVG !== 'undefined' && targetSVG) {
            Reducer.triger(action.UPDATE_LOADING_STATUS, { il: true, srcDom: document.body, content: Loading.EXPORTING });
            setTimeout(() => {
                const canvas: any = document.createElement('canvas');
                const cWidth: number = canvas.width = parseFloat(targetSVG.getAttribute('width'));
                const cHeight: number = canvas.height = parseFloat(targetSVG.getAttribute('height'));
                const context = canvas.getContext('2d');
                context.fillStyle = '#fff';
                context.fillRect(0, 0, cWidth, cHeight);

                const stream = canvas.captureStream();
                const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
                const data: any[] = [];
                recorder.ondataavailable = function (event) {
                    if (event.data && event.data.size) {
                        data.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    var url = URL.createObjectURL(new Blob(data, { type: "video/webm" }));
                    var a = document.createElement("a");
                    a.href = url;
                    a.download = 'animatedChart.mp4';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function () {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        Reducer.triger(action.UPDATE_LOADING_STATUS, { il: false });
                    }, 0);
                };

                recorder.start();
                for (let i = 0, p = Promise.resolve(), len = state.lottieAni.getDuration() * 1000; i < len; i += 60) {
                    p = p.then(() => new Promise(resolve =>
                        setTimeout(function () {
                            state.lottieAni.goToAndStop(Math.ceil(i / (1000 / player.frameRate)), true)
                            const img = new Image(),
                                serialized = new XMLSerializer().serializeToString(targetSVG),
                                url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml" }));
                            img.onload = function () {
                                context.drawImage(img, 0, 0);
                            };
                            img.src = url;
                            resolve();
                            if (i + 60 > len) {
                                recorder.stop();
                            }
                        }, 60)
                    ))
                }
            }, 1);
        }
    }

    public revert(): void {
        Reducer.triger(action.UPDATE_LOADING_STATUS, { il: true, srcDom: document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID), content: Loading.LOADING })
        setTimeout(() => {
            State.revertHistory();
            Loading.removeLoading();
        }, 1);
    }

    public redo(): void {
        Reducer.triger(action.UPDATE_LOADING_STATUS, { il: true, srcDom: document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID), content: Loading.LOADING })
        setTimeout(() => {
            State.redoHistory();
            Loading.removeLoading();
        }, 1);
    }

    public reset(): void {
        Reducer.triger(action.RESET_STATE, {});
    }

    // public static testSpec(): void {
    //     const floatingWindow: FloatingWindow = new FloatingWindow();
    //     floatingWindow.createFloatingWindow(FloatingWindow.TYPE_SPEC);
    //     document.getElementById('appWrapper').appendChild(floatingWindow.floatingWindow);
    // }

    public static async testGif() {
        console.log(state.lottieSpec);
        // // const gif = new LottieRenderer();
        // await LottieRenderer({
        //     animationData: state.lottieSpec,
        //     // path: 'fixtures/bodymovin.json',
        //     output: 'example.gif',
        //     width: 640
        // })
    }
}