import { bin } from 'd3';
import '../assets/style/keyframeTrack.scss'
import { AddPanel } from './addPanel';
import { KfTreeGroup, KfTreeNode, calcNonSelectedMarks, calcSelectedMarks, getSuggestFrames, kfTrees } from './kfTree';
import { MarkSelector } from './markSelector';
import { SuggestPanel, suggestPanel } from './suggestPanel';
import Tool from '../util/tool';
import { kfContainer } from '../components/kfContainer';

const LABEL_HEIGHT = 20;
const LABEL_CORNER_RADIUS = 3;
const ITEM_GAP = 3;
const TEXT_OFFSET = 6;
const FONT_SIZE = 12;
const THUMBNAIL_HEIGHT = 120;
// const LABEL_COLORS = [
//     // 255,
//     // 255,
//     // 160,
//     // 165,
//     185,
//     200,
//     220,
//     200,
//     220,
// ].map(i => `rgb(${i}, ${i}, ${i})`);
const LABEL_COLORS = [
    "#FFFFFF",
    "#D6D6D6",
    "#C5C5C5",
    "#BCBCBC",
    "#B6B6B6",
]
const TEXT_COLORS = [
    "#black",
    "#777",
    "#777",
    "#777",
    "#777",
];

const OMIT_COLOR = "#777";
const LABEL_BORDER_COLOR = "#ffffff";
const LABEL_BORDER_OPACITY = "0.5";

const ITEM_LENGTH = 150;

const DURATION_TO_LENGTH_K = 0.125;
const DURATION_TO_LENGTH_B = ITEM_LENGTH - 2 * ITEM_GAP;
// const DURATION_TO_LENGTH_K = 0.25;
// const DURATION_TO_LENGTH_B = 125;
const MIN_DURATION = 100;
const MAX_DURATION = 20000;


const lengthToDuration = (length: number) => {
    return (length - DURATION_TO_LENGTH_B) / DURATION_TO_LENGTH_K;
}

const durationToLength = (duration: number) => {
    return duration * DURATION_TO_LENGTH_K + DURATION_TO_LENGTH_B;
}

const MIN_LENGTH = durationToLength(MIN_DURATION);
const MAX_LENGTH = durationToLength(MAX_DURATION);

const DELAY_TO_LENGTH_K = 0.125;
const DELAY_TO_LENGTH_B = 0;
const MIN_DELAY = 0;
const MAX_DELAY = 20000;


const lengthToDelay = (length: number) => {
    return (length - DELAY_TO_LENGTH_B) / DELAY_TO_LENGTH_K;
}

const delayToLength = (delay: number) => {
    return delay * DELAY_TO_LENGTH_K + DELAY_TO_LENGTH_B;
}

const MIN_DELAY_LENGTH = delayToLength(MIN_DELAY);
const MAX_DELAY_LENGTH = delayToLength(MAX_DELAY);

const EFFECT_FADE: string = 'fade';
const EFFECT_FADE_OUT: string = 'fade out';
const EFFECT_WIPE_LEFT: string = 'wipe left';
const EFFECT_WIPE_RIGHT: string = 'wipe right';
const EFFECT_WIPE_TOP: string = 'wipe top';
const EFFECT_WIPE_BOTTOM: string = 'wipe bottom';
const EFFECT_WHEEL: string = 'wheel';
const EFFECT_CIRCLE: string = 'circle';
const EFFECT_GROW: string = 'grow';
const EFFECT_TRANSITION: string = 'custom';
const EASING_LINEAR: string = 'easeLinear';
const EASING_IN_QUAD: string = 'easeInQuad';
const EASING_OUT_QUAD: string = 'easeOutQuad';
const EASING_INOUT_QUAD: string = 'easeInOutQuad';
const EASING_IN_CUBIC: string = 'easeInCubic';
const EASING_OUT_CUBIC: string = 'easeOutCubic';
const EASING_INOUT_CUBIC: string = 'easeInOutCubic';
const EASING_OUT_BOUNCE: string = 'easeOutBounce';
const DURATION: string = 'duration';

const EFFECTS = [EFFECT_FADE, EFFECT_FADE_OUT, EFFECT_WIPE_LEFT, EFFECT_WIPE_RIGHT, EFFECT_WIPE_TOP, EFFECT_WIPE_BOTTOM, EFFECT_WHEEL, EFFECT_CIRCLE, EFFECT_GROW];
const EASINGS = [EASING_LINEAR, EASING_IN_QUAD, EASING_OUT_QUAD, EASING_OUT_QUAD, EASING_IN_CUBIC, EASING_OUT_CUBIC, EASING_INOUT_CUBIC];

const snap = (value: number, size: number, size2: number = size) => {
    if (value >= 0) {
        return Math.round(value / size) * size;
    } else {
        return Math.round(value / size2) * size2;
    }
}

const createLabelBackgroundShape = (width: number, height: number, radius: number) => {
    const result: string[] = [];
    result.push(`M0,${height}`);
    result.push(`L${width},${height}`);
    result.push(`L${width},${radius}`);
    result.push(`A${radius} ${radius} 0 0 0 ${width - radius},0`);
    result.push(`L${radius},0`);
    result.push(`A${radius} ${radius} 0 0 0 0,${radius}`);
    result.push("Z");
    return result.join("");
}

export class KfItem {
    static idCounter = 0;
    children: any;
    static resetCounter() {
        this.idCounter = 0;
    }

    levelFromLeaves: number = 0;
    container: Element;
    mainContainer: Element;
    id: number;
    parent: KfGroup;

    length: number;
    height: number;
    x: number = 0;
    y: number = 0;

    leftDragBarCallback: Function = null;
    leftDragBar: Element;
    hideLeftDragBar: boolean = false;

    delayLength: number = 0;
    delayWidget: KfDelay;

    updateDelayLength() {
        const deltaL = this.delayWidget.length - this.delayLength;
        this.delayLength = this.delayWidget.length;
        this.mainContainer.setAttribute("transform", `translate(${this.delayLength},${0})`);
        if (this.parent) {
            this.parent.resize(this, deltaL);
        } else {
            kfTrack.resize(this, deltaL);
        }
    }

    renderDelay(height: number, allowNegtiveDelay = false) {
        if (!this.delayWidget.originalNode || isNaN(this.delayWidget.delay)) {
            return;
        }
        this.delayWidget.render(height, allowNegtiveDelay);
        this.delayLength = this.delayWidget.length;
        this.mainContainer.setAttribute("transform", `translate(${this.delayLength},${0})`);
    }

    translate(x: number, y: number) {
        this.x += x;
        this.y += y;
        this.container.setAttribute("transform", `translate(${this.x},${this.y})`);
    }

    getX() {
        let parent = this.parent;
        let result = this.x;
        while (parent) {
            result += parent.x;
            parent = parent.parent;
        }
        return result;
    }

    getY() {
        let parent = this.parent;
        let result = this.y;
        while (parent) {
            result += parent.y;
            parent = parent.parent;
        }
        return result;
    }

    renderLeftBar() {
        if (this.leftDragBarCallback == null) {
            return;
        }
        const leftDragBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.leftDragBar = leftDragBar;
        // leftDragBar.setAttribute("x", String(-ITEM_GAP));
        leftDragBar.setAttribute("height", String(this.height));
        leftDragBar.setAttribute("width", String(2 * ITEM_GAP));
        leftDragBar.classList.add("kf-drag-bar-left");
        leftDragBar.onmousedown = (downEvent: MouseEvent) => {
            this.leftDragBarCallback(downEvent);
        }

        this.mainContainer.appendChild(leftDragBar);

        if (this.hideLeftDragBar) {
            leftDragBar.setAttribute("display", "none");
        }
    }

    findRightMostLength() {
        return this.length;
    }

    constructor(parent: KfGroup, delay: number, originalDelayNode: KfTreeGroup | KfTreeNode, previousNode: KfItem = null) {
        this.container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.id = KfItem.idCounter++;
        this.container.id = `kfContainer${this.id}`;
        this.parent = parent;

        if (this.id == kfTrack.activeNodeId) {
            kfTrack.activeNode = this;
        }
        this.mainContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.container.appendChild(this.mainContainer);

        this.delayWidget = new KfDelay(delay, this, originalDelayNode, previousNode);
        this.container.appendChild(this.delayWidget.container);
    }

    getOriginalHeight() {
        return this.levelFromLeaves * (LABEL_HEIGHT) + THUMBNAIL_HEIGHT;
    }

    hideRightDragBar() {

    }

    calcLevelFromLeaves() {
        this.levelFromLeaves = 0;
    }

    render(height: number) {
        return 0;
        // return { element: this.container, length: 0 };
    }
}

export class KfGroup extends KfItem {
    children: KfItem[] = [];
    resize(chiactiveChildld: KfItem, deltaL: number) { }
}

export class KfColume extends KfGroup {
    right: number[] = [];

    constructor(parent: KfGroup, delay: number, originalDelayNode: KfTreeNode | KfTreeGroup) {
        super(parent, delay, originalDelayNode);
    }

    resize(activeChild: KfItem, deltaL: number) {
        const index = this.children.indexOf(activeChild);
        this.right[index] += deltaL;
        const newLength = Math.max(...this.right);
        if (newLength != this.length) {
            this.parent.resize(this, newLength - this.length);
            this.length = newLength;
        }
    }

    calcLevelFromLeaves() {
        let levelFromLeaves = 0;
        for (let i of this.children) {
            i.calcLevelFromLeaves();
            levelFromLeaves = Math.max(i.levelFromLeaves, levelFromLeaves);
        }
        this.levelFromLeaves = levelFromLeaves;
    }

    render(height: number) {
        const container = this.mainContainer;
        let length = 0;
        let y = 0;

        // const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        // this.container.appendChild(background);
        // background.setAttribute("fill", "#f7f7f7")
        let x = 0;
        for (let child of this.children) {
            child.render(height);
            container.appendChild(child.container);
            child.translate(x, y);

            length = Math.max(length, x + child.length + child.delayLength);
            this.right.push(child.length + child.delayLength);

            x += ITEM_GAP;
            y += child.height + 20;
        }
        y -= 20;
        this.height = y;
        this.length = length;

        // background.setAttribute("width", String(length));
        // background.setAttribute("height", String(y));
        this.renderDelay(this.height);
        this.renderLeftBar();

        return length;
        // return { element: this.container, length };
    }
}

export class KfRow extends KfGroup {
    label: string;
    sortable: boolean;
    binding: {
        duration: {
            binding: string,
            node: KfTreeNode
        },
        startTime: {
            binding: string,
            group: KfTreeGroup
        },
        options: string[],
    } = null;
    vertical: boolean = false;
    sortAttributes: string[];
    originalGrouping: KfTreeNode;
    originalNode: KfTreeNode | KfTreeGroup;

    labelContainer: Element;
    labelBackground: Element;
    background: Element;
    labelText: Element;

    constructor(label: string, parent: KfGroup, delay: number, originalNode: KfTreeNode | KfTreeGroup, sortable = false, sortAttrtibutes: string[] = [], originalGrouping: KfTreeNode = null) {
        super(parent, delay, originalNode);
        this.label = label;
        this.originalNode = originalNode;
        this.sortable = sortable;
        this.sortAttributes = sortAttrtibutes;
        this.originalGrouping = originalGrouping;
    }

    findRightMostLength() {
        return this.children[this.children.length - 1].findRightMostLength();
    }

    hideRightDragBar() {
        this.children[this.children.length - 1].hideRightDragBar();
    }

    resize(activeChild: KfItem, deltaL: number) {
        this.length += deltaL;
        this.labelBackground.setAttribute("width", String(this.length));
        this.background.setAttribute("width", String(this.length));
        if (this.parent) {
            this.parent.resize(this, deltaL);
        } else {
            kfTrack.resize(this, deltaL);
        }
        this.labelText.setAttribute("x", String(this.length / 2));
        let flag: Boolean = false;
        for (let child of this.children) {
            if (flag) {
                child.translate(deltaL, 0);
            }
            if (child == activeChild) {
                flag = true;
            }
        }
    }

    calcLevelFromLeaves() {
        let levelFromLeaves = 0;
        for (let i of this.children) {
            i.calcLevelFromLeaves();
            levelFromLeaves = Math.max(i.levelFromLeaves, levelFromLeaves);
        }
        if (this.label.length > 0) {
            levelFromLeaves++;
        }
        this.levelFromLeaves = levelFromLeaves;
    }

    getOriginalHeight() {
        if (this.label.length == 0) {
            return (this.levelFromLeaves - 1) * LABEL_HEIGHT + THUMBNAIL_HEIGHT;
        } else {
            return super.getOriginalHeight();
        }
    }

    createOrderBtn(order: string) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.classList.add("kf-order-button")

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        g.appendChild(rect);
        rect.setAttribute("height", "20");
        rect.setAttribute("width", "20");
        rect.setAttribute("rx", "3");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        g.appendChild(path);
        if (order == "asc") {
            path.setAttribute("d", "M 3.461 0.162 l -3.34 3.78 c -0.274 0.31 -0.054 0.799 0.36 0.799 h 1.961 v 11.932 c 0 0.265 0.215 0.481 0.481 0.481 h 1.798 c 0.265 0 0.481 -0.215 0.481 -0.481 V 4.742 h 1.961 c 0.414 0 0.634 -0.489 0.36 -0.799 L 4.182 0.162 C 3.99 -0.054 3.653 -0.054 3.461 0.162 z M 6.581 6.817 v 1.791 c 0 0.267 0.217 0.484 0.484 0.484 h 9.748 c 0.267 0 0.484 -0.217 0.484 -0.484 V 6.817 c 0 -0.267 -0.217 -0.484 -0.484 -0.484 H 7.065 C 6.797 6.333 6.581 6.549 6.581 6.817 z M 7.029 13.124 h 7.904 c 0.248 0 0.449 -0.201 0.449 -0.449 v -1.861 c 0 -0.248 -0.201 -0.449 -0.449 -0.449 H 7.029 c -0.248 0 -0.449 0.201 -0.449 0.449 v 1.861 C 6.581 12.923 6.782 13.124 7.029 13.124 z M 7.024 17.155 h 5.916 c 0.245 0 0.443 -0.198 0.443 -0.443 v -1.873 c 0 -0.245 -0.198 -0.443 -0.443 -0.443 H 7.024 c -0.245 0 -0.443 0.198 -0.443 0.443 v 1.873 C 6.581 16.956 6.779 17.155 7.024 17.155 z");
        } else {
            path.setAttribute("d", "M 3.461 16.988 l -3.34 -3.78 c -0.274 -0.31 -0.054 -0.799 0.36 -0.799 h 1.961 v -11.932 c 0 -0.265 0.215 -0.481 0.481 -0.481 h 1.798 c 0.265 0 0.481 0.215 0.481 0.481 v 11.931 h 1.961 c 0.414 0 0.634 0.489 0.36 0.799 l -3.341 3.781 c -0.192 0.216 -0.529 0.216 -0.721 0 z m 3.12 -6.655 v -1.791 c 0 -0.267 0.217 -0.484 0.484 -0.484 h 9.748 c 0.267 0 0.484 0.217 0.484 0.484 v 1.791 c 0 0.267 -0.217 0.484 -0.484 0.484 h -9.748 c -0.268 0 -0.484 -0.216 -0.484 -0.484 z m 0.448 -6.307 h 7.904 c 0.248 0 0.449 0.201 0.449 0.449 v 1.861 c 0 0.248 -0.201 0.449 -0.449 0.449 h -7.904 c -0.248 0 -0.449 -0.201 -0.449 -0.449 v -1.861 c 0.001 -0.248 0.202 -0.449 0.449 -0.449 z m -0.005 -4.031 h 5.916 c 0.245 0 0.443 0.198 0.443 0.443 v 1.873 c 0 0.245 -0.198 0.443 -0.443 0.443 h -5.916 c -0.245 0 -0.443 -0.198 -0.443 -0.443 v -1.873 c 0 -0.244 0.198 -0.443 0.443 -0.443 z");
        }
        path.setAttribute("transform", "scale(0.8)translate(4,4)");
        // path.setAttribute("style", "fill: #676767");

        return g;
    }

    createSortList(sortBtnContainer: Element) {

        const sortListContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        kfTrack.innerContainer.appendChild(sortListContainer);
        sortListContainer.setAttribute("transform", `translate(${this.getX() + this.delayLength + this.length - 5},${this.getY() + 2}), scale(${1 / kfTrack.scale})`);
        // sortListContainer.setAttribute("transform", `translate(${this.getX() + this.delayLength + 30},${this.getY() + 2}), scale(${1 / kfTrack.scale})`);
        const itemWidth = 120;
        const itemHeight = 20;
        let index = 0;
        console.log(this.sortAttributes);

        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background.setAttribute("width", "25");
        background.setAttribute("height", "16");
        background.setAttribute("transform", `scale(${kfTrack.scale}), translate(${-25}, 0)`);
        background.setAttribute("opacity", "0");
        sortListContainer.appendChild(background);
        const sortChannel = this.originalGrouping.grouping.sort.channel;
        const sortOrder = this.originalGrouping.grouping.sort.order;

        for (let attributeName of this.sortAttributes) {
            // for (let order of ["asc", "dsc"]) {


            const itemBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            itemBackground.setAttribute("width", String(itemWidth));
            itemBackground.setAttribute("height", String(itemHeight));
            itemBackground.setAttribute("fill", "#676767");
            itemBackground.setAttribute("stroke", "#AAA");
            itemBackground.setAttribute("y", String(index * (itemHeight)));
            sortListContainer.appendChild(itemBackground);

            const itemContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
            // itemContainer.classList.add("kf-button");
            itemContainer.setAttribute("transform", `translate(${0},${index * (itemHeight)})`);
            sortListContainer.appendChild(itemContainer);
            // itemContainer.onclick = () => {

            // }

            // const icon = this.createOrderIcon(order);
            // icon.setAttribute("transform", "scale(0.8)translate(5,5)");
            // itemContainer.appendChild(icon);

            // const itemMask = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            // itemMask.setAttribute("width", String(itemWidth));
            // itemMask.setAttribute("height", String(itemHeight));
            // itemMask.setAttribute("opacity", "0");
            // itemContainer.appendChild(itemMask);
            const ascBtn = this.createOrderBtn("asc");
            ascBtn.setAttribute("transform", "translate(5, 0)")
            itemContainer.appendChild(ascBtn);
            ascBtn.onclick = () => {
                this.originalGrouping.updateSort(attributeName, "asc");
            }

            const dscBtn = this.createOrderBtn("dsc");
            dscBtn.setAttribute("transform", `translate(${itemWidth - 16 - 9}, 0)`)
            itemContainer.appendChild(dscBtn);
            dscBtn.onclick = () => {
                this.originalGrouping.updateSort(attributeName, "dsc");
            }

            if (sortChannel == attributeName) {
                if (sortOrder == "asc") {
                    ascBtn.classList.add("kf-active-order-button");
                } else {
                    dscBtn.classList.add("kf-active-order-button");
                }
            }

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.innerHTML = attributeName;
            text.setAttribute("font-size", "12");
            text.setAttribute("x", String(itemWidth / 2));
            text.setAttribute("y", String(itemHeight / 2 + 4));
            text.setAttribute("fill", "rgb(163, 163, 163)");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-weight", "600");
            itemContainer.appendChild(text);

            index++
            // }
        }
        {
            const itemBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            itemBackground.setAttribute("width", String(itemWidth));
            itemBackground.setAttribute("height", String(itemHeight));
            itemBackground.setAttribute("fill", "#676767");
            itemBackground.setAttribute("stroke", "#AAA");
            itemBackground.setAttribute("y", String(index * (itemHeight)));
            sortListContainer.appendChild(itemBackground);

            const itemContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
            // itemContainer.classList.add("kf-button");
            itemContainer.setAttribute("transform", `translate(${0},${index * (itemHeight)})`);
            sortListContainer.appendChild(itemContainer);

            const buttonContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
            itemContainer.appendChild(buttonContainer);
            buttonContainer.setAttribute("transform", `translate(${itemWidth / 2},${2})`);
            buttonContainer.classList.add("kf-order-button");

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            buttonContainer.appendChild(rect);
            rect.setAttribute("height", "16");
            rect.setAttribute("width", "50");
            rect.setAttribute("rx", "3");
            rect.setAttribute("x", String(-50 / 2));

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.innerHTML = "Default";
            text.setAttribute("text-anchor", "middle")
            text.setAttribute("font-size", "12");
            text.setAttribute("font-weight", "600");
            text.setAttribute("y", "12");
            buttonContainer.appendChild(text);

            buttonContainer.onclick = () => {
                this.originalGrouping.updateSort(null, null);
            }

            if (!sortChannel) {
                buttonContainer.classList.add("kf-active-order-button");
            }

        }
        sortListContainer.onmouseleave = () => {
            sortBtnContainer.removeAttribute("style");
            kfTrack.innerContainer.removeChild(sortListContainer);
        }
    }

    createBindList(bindBtnContainer: Element) {
        const bindListContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        kfTrack.innerContainer.appendChild(bindListContainer);
        bindListContainer.setAttribute("transform", `translate(${this.getX() + this.delayLength + 30},${this.getY() + 2}), scale(${1 / kfTrack.scale})`);
        // bindListContainer.setAttribute("transform", `translate(${this.getX() + this.delayLength + this.length - 5},${this.getY() + 2}), scale(${1 / kfTrack.scale})`);
        const itemWidth = 80;
        const itemHeight = 20;

        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background.setAttribute("width", "25");
        background.setAttribute("height", "16");
        background.setAttribute("transform", `scale(${kfTrack.scale}), translate(${-25}, 0)`);
        background.setAttribute("opacity", "0");
        bindListContainer.appendChild(background);

        const binding = this.binding;

        const options = binding.options.concat([null]);

        const createList = (title: string, highlighted: string, callback: Function) => {
            const listContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
            let index = 0;
            {
                const itemBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                itemBackground.setAttribute("width", String(itemWidth));
                itemBackground.setAttribute("height", String(itemHeight));
                itemBackground.setAttribute("fill", "#676767");
                itemBackground.setAttribute("stroke", "#AAA");
                itemBackground.setAttribute("y", String(index * (itemHeight)));
                listContainer.appendChild(itemBackground);

                const itemContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
                // itemContainer.classList.add("kf-button");
                itemContainer.setAttribute("transform", `translate(${0},${index * (itemHeight)})`);
                listContainer.appendChild(itemContainer);

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.innerHTML = title;
                text.setAttribute("text-anchor", "middle")
                text.setAttribute("font-size", "12");
                text.setAttribute("font-weight", "600");
                text.setAttribute("y", "14");
                text.setAttribute("x", String(itemWidth / 2));
                text.setAttribute("fill", "white");
                itemContainer.appendChild(text);

                index++;
            }
            for (let option of options) {
                const itemBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                itemBackground.setAttribute("width", String(itemWidth));
                itemBackground.setAttribute("height", String(itemHeight));
                itemBackground.setAttribute("fill", "#676767");
                itemBackground.setAttribute("stroke", "#AAA");
                itemBackground.setAttribute("y", String(index * (itemHeight)));
                listContainer.appendChild(itemBackground);

                const itemContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
                // itemContainer.classList.add("kf-button");
                itemContainer.setAttribute("transform", `translate(${0},${index * (itemHeight)})`);
                listContainer.appendChild(itemContainer);

                const buttonContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
                itemContainer.appendChild(buttonContainer);
                buttonContainer.setAttribute("transform", `translate(${itemWidth / 2},${2})`);
                buttonContainer.classList.add("kf-order-button");

                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                buttonContainer.appendChild(rect);
                rect.setAttribute("height", "16");
                rect.setAttribute("width", "50");
                rect.setAttribute("rx", "3");
                rect.setAttribute("x", String(-50 / 2));

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.innerHTML = option ? option : "Default";
                text.setAttribute("text-anchor", "middle")
                text.setAttribute("font-size", "12");
                text.setAttribute("font-weight", "600");
                text.setAttribute("y", "12");
                buttonContainer.appendChild(text);

                buttonContainer.onclick = () => {
                    callback(option);
                }

                if (option == highlighted) {
                    buttonContainer.classList.add("kf-active-order-button");
                }
                index++;
            }
            return listContainer;
        }

        let x = 0;
        if (binding.startTime) {
            const l1 = createList("Start Time", binding.startTime.binding, (startTime: string) => {
                binding.startTime.group.updateStartTimeBinding(startTime);
            });
            bindListContainer.appendChild(l1);
            x += itemWidth;
        }

        if (binding.duration) {

            const l2 = createList("Duration", binding.duration.binding, (duration: string) => {
                binding.duration.node.updateDurationBinding(duration);
            });
            bindListContainer.appendChild(l2);
            l2.setAttribute("transform", `translate(${x},0)`);
            x += itemWidth;
        }

        bindListContainer.onmouseleave = () => {
            bindBtnContainer.removeAttribute("style");
            kfTrack.innerContainer.removeChild(bindListContainer);
        }
    }

    render(height: number) {
        this.height = height;
        const container = this.mainContainer;
        // let length = ITEM_GAP;
        let length = 0;

        const labelContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.labelContainer = labelContainer;
        labelContainer.classList.add("kf-label-container");
        container.appendChild(labelContainer);

        const labelBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        labelContainer.appendChild(labelBackground);
        this.labelBackground = labelBackground;
        const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        labelContainer.appendChild(labelText);
        this.labelText = labelText;

        if (this.binding) {
            const bindBtnContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
            labelContainer.appendChild(bindBtnContainer);
            bindBtnContainer.classList.add("kf-label-btn-container");
            // bindBtnContainer.setAttribute("transform", `translate(${length - 35},0)`)

            const bindBtnBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bindBtnContainer.appendChild(bindBtnBackground);
            bindBtnBackground.classList.add("kf-label-btn-background");
            bindBtnBackground.setAttribute("x", "5");
            bindBtnBackground.setAttribute("y", "2");

            const bindBtnIcon = document.createElementNS("http://www.w3.org/2000/svg", "path");
            bindBtnContainer.appendChild(bindBtnIcon);
            bindBtnIcon.setAttribute("d", "M 20.44 8.013 L 6 8 L 6 9 L 20.425 8.976 L 15.33 13.348 L 16 14 L 22 9 L 22 8 L 16 3 L 15.283 3.759 Z M 5 14 L 5 3 L 4 3 L 4 14 Z");
            // bindBtnIcon.setAttribute('points', '10.1,0 10.1,4.1 5.6,0.1 4.3,1.5 8.3,5.1 0,5.1 0,6.9 8.3,6.9 4.3,10.5 5.6,11.9 10.1,7.9 10.1,12 12,12 12,0 ');

            bindBtnIcon.setAttribute("transform", `translate(5, 2)`);
            bindBtnIcon.classList.add("kf-button");

            bindBtnContainer.onclick = () => {
                bindBtnContainer.setAttribute("style", "opacity: 1");
                this.createBindList(bindBtnContainer);
            }
        }
        labelBackground.onmousedown = () => {
            if (kfTrack.timingLock || this.label == "__graph") {
                return;
            }
            if (this.originalNode) {

                let virtualMovementX = 0;
                let actualMovementX = 0;
                let virtualMovementY = 0;
                let actualMovementY = 0;
                let moveX = 0;
                let moveY = 0;
                let moveDirection: string = 'Left'
                for (let i = 0; i < this.parent.children.length; i++) {
                    if (this.parent.children[i].id == this.id) {
                        if (i > 0) {
                            if (this.parent.children[i - 1] instanceof KfOmit) {
                                if (Tool.diffLessThan(this.parent.children[i - 1].x, this.x, 5)) {
                                    moveX = this.parent.children[i - 2].length;
                                    moveY = this.parent.children[i - 2].height + this.parent.children[i - 1].height;
                                    moveDirection = 'Right';
                                } else if (Tool.diffLessThan(this.parent.children[i - 1].y, this.y, 1)) {
                                    moveX = this.parent.children[i - 2].length + this.parent.children[i - 1].length;
                                    moveY = this.parent.children[i - 2].height;
                                    moveDirection = 'Left';
                                }
                            } else {
                                moveDirection = 'none';
                                moveX = this.parent.children[i - 1].length
                                moveY = this.parent.children[i - 1].height
                            }
                        } else {
                            moveDirection = 'none';
                            moveX = 3000
                            moveY = 3000
                        }
                        break;
                    }
                }
                let x = this.getX();
                let y = this.getY();
                this.container.parentNode.removeChild(this.container);
                this.container.setAttribute("transform", `translate(${x},${y})`);
                kfTrack.innerContainer.appendChild(this.container);

                document.onmousemove = (event: MouseEvent) => {
                    virtualMovementX += event.movementX;
                    virtualMovementY += event.movementY;
                    let newactualMovementX, newactualMovementY;
                    if (moveDirection == 'Left') {
                        newactualMovementX = Math.max(-moveX, Math.min(0, virtualMovementX));
                        newactualMovementY = Math.max(0, Math.min(moveY, virtualMovementY));
                    } else if (moveDirection == 'Right') {
                        newactualMovementX = Math.max(0, Math.min(moveX, virtualMovementX));
                        newactualMovementY = Math.min(0, Math.max(-moveY, virtualMovementY));
                    } else {
                        newactualMovementX = Math.max(-moveX, Math.min(moveX, virtualMovementX));
                        newactualMovementY = Math.max(-moveY, Math.min(moveY, virtualMovementY));
                    }
                    // this.translate(newactualMovementX - actualMovementX, newactualMovementY - actualMovementY);
                    x += newactualMovementX - actualMovementX;
                    y += newactualMovementY - actualMovementY;
                    this.container.setAttribute("transform", `translate(${x},${y})`);
                    actualMovementX = newactualMovementX;
                    actualMovementY = newactualMovementY;
                    if (moveX != 0) {
                        if (Tool.diffLessThan(Math.abs(actualMovementX), Math.abs(moveX), 7)) {
                            if (this.leftDragBar) {
                                this.leftDragBar.setAttribute("style", "opacity: 1");
                            }
                        } else {
                            if (this.leftDragBar) {
                                this.leftDragBar.removeAttribute("style");
                            }
                        }
                    }
                }
                document.onmouseup = (event: MouseEvent) => {
                    document.onmousemove = null;
                    document.onmouseup = null;

                    if (actualMovementX <= -100) {
                        this.originalNode.moveForward();
                    } else if (actualMovementX >= 100) {
                        this.originalNode.moveBackward();
                    } else {
                        this.container.parentNode.removeChild(this.container);
                        this.parent.container.appendChild(this.container);
                        this.translate(0, 0)
                        // this.translate(-actualMovementX, -actualMovementY);
                    }
                }
            }
        }

        // const childrenOffsetY = this.label.length != 0 ? 0 : ITEM_GAP - LABEL_HEIGHT;
        const childrenOffsetY = this.label.length != 0 ? LABEL_HEIGHT : 0;

        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.background = background;
        container.appendChild(background);
        background.setAttribute("fill", "#f7f7f7");
        background.setAttribute("y", String(childrenOffsetY));

        for (let child of this.children) {
            child.render(height - childrenOffsetY);

            child.translate(length, childrenOffsetY);
            container.appendChild(child.container);
            length += child.length + child.delayLength// + ITEM_GAP;
            length += (this.levelFromLeaves - 1) * 2;
            this.height = Math.max(this.height, child.height + childrenOffsetY);
        }
        // length -= ITEM_GAP;
        length -= (this.levelFromLeaves - 1) * 2;
        this.length = length;
        if (this.sortable) {
            const sortBtnContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
            labelContainer.appendChild(sortBtnContainer);
            sortBtnContainer.classList.add("kf-label-btn-container")
            sortBtnContainer.setAttribute("transform", `translate(${length - 35},0)`)

            const sortBtnBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            sortBtnContainer.appendChild(sortBtnBackground);
            sortBtnBackground.classList.add("kf-label-btn-background");
            sortBtnBackground.setAttribute("x", "5");
            sortBtnBackground.setAttribute("y", "2");

            const sortBtnIcon = document.createElementNS("http://www.w3.org/2000/svg", "path");
            sortBtnContainer.appendChild(sortBtnIcon);
            sortBtnIcon.setAttribute("d", "M 3 13 H 9 V 12 H 3 Z M 3 4 V 4 H 21 V 3 H 3 Z M 3 10 H 13 V 9 H 3 Z M 3 6 L 17 6 L 17 7 L 3 7 Z");
            sortBtnIcon.setAttribute("transform", `translate(5, 2)`);
            sortBtnIcon.classList.add("kf-button");

            sortBtnContainer.onclick = () => {
                sortBtnContainer.setAttribute("style", "opacity: 1");
                this.createSortList(sortBtnContainer);
            }
        }


        // labelBackground.setAttribute("d", createLabelBackgroundShape(length, this.levelFromLeaves * (LABEL_HEIGHT + ITEM_SPACE) + THUMBNAIL_HEIGHT, LABEL_CORNER_RADIUS));
        labelBackground.setAttribute("width", String(length));
        // labelBackground.setAttribute("x", String(ITEM_GAP));
        if (this.label.length == 0) {
            // labelBackground.setAttribute("height", String(this.levelFromLeaves * (LABEL_HEIGHT + ITEM_GAP) - LABEL_HEIGHT + ITEM_GAP + THUMBNAIL_HEIGHT));
            this.labelBackground.setAttribute("height", "0");
        } else {
            this.labelBackground.setAttribute("height", String(LABEL_HEIGHT));
            // labelBackground.setAttribute("height", String(this.levelFromLeaves * (LABEL_HEIGHT + ITEM_GAP) + THUMBNAIL_HEIGHT));
        }
        labelBackground.setAttribute("rx", String(LABEL_CORNER_RADIUS));
        labelBackground.setAttribute("fill", LABEL_COLORS[this.levelFromLeaves % 5]);
        labelBackground.setAttribute("stroke", LABEL_BORDER_COLOR);
        // labelBackground.setAttribute("stroke-width", String(this.levelFromLeaves));
        labelBackground.setAttribute("stroke-opacity", LABEL_BORDER_OPACITY);

        background.setAttribute("width", String(length));
        background.setAttribute("height", String(this.height - childrenOffsetY));

        labelText.setAttribute("fill", TEXT_COLORS[this.levelFromLeaves % 5]);
        labelText.setAttribute("text-anchor", "middle");
        labelText.setAttribute("x", String(length / 2));
        labelText.setAttribute("y", String(LABEL_HEIGHT - TEXT_OFFSET));
        labelText.setAttribute("font-size", String(FONT_SIZE));
        labelText.setAttribute("font-weight", "600");
        const maxStrLen = Math.floor(length / 8);
        labelText.innerHTML = this.label == "__graph" ? "graph" : this.label.length <= maxStrLen ? this.label : this.label.substring(0, maxStrLen - 3) + "...";

        this.renderDelay(this.height, (this.binding != null) && !this.vertical);
        this.renderLeftBar();

        if (this.label == "__graph") {
            this.container.id = "__graph";
        }
        return length;
    }
}

export class KfOmit extends KfItem {
    numberOmitted: number;
    lastNode: KfItem;
    constructor(numberOmitted: number, parent: KfGroup, delay: number, originalDelayNode: KfTreeGroup | KfTreeNode, lastNode: KfItem) {
        super(parent, delay, originalDelayNode);
        this.numberOmitted = numberOmitted;
        this.lastNode = lastNode;
    }

    render(height: number) {
        if (this.lastNode) {
            height = this.lastNode.height;
        } else {
            height = 10;
        }
        this.renderDelay(height);
        this.height = height;
        const container = this.mainContainer;
        const length = 50;
        this.length = length;
        if (this.numberOmitted > 0) {
            for (let i = 0; i < 3; i++) {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", String(i * 10 + 15));
                circle.setAttribute("cy", String(height / 2));
                circle.setAttribute("r", "3");
                circle.setAttribute("fill", OMIT_COLOR);
                container.appendChild(circle);
            }
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");;
            text.innerHTML = `x${this.numberOmitted}`;
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", OMIT_COLOR);
            text.setAttribute("x", String(length / 2));
            text.setAttribute("y", String(height / 2 + 16));
            text.setAttribute("font-size", String(FONT_SIZE));
            text.setAttribute("font-weight", "600");
            container.appendChild(text);
        }
        this.renderLeftBar();

        return length;
    }
}

export class KfDelay {
    container: Element;
    parent: KfItem;

    length: number;
    delay: number;

    virtualLength: number;
    height: number;

    background: Element;
    iconPolygon: Element;
    dragBar: Element;
    lengthGuideBackground: Element;
    lengthGuide: Element;
    // hoverArea: Element;

    originalNode: KfTreeNode | KfTreeGroup;

    previousNode: KfItem;

    parentLength: number;

    constructor(delayTime: number, parent: KfItem, originalNode: KfTreeGroup | KfTreeNode, previousNode: KfItem) {
        this.container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.parent = parent;

        this.delay = delayTime;

        this.originalNode = originalNode;

        this.previousNode = previousNode;
    }

    controlOn() {
        this.background.removeAttribute("display");
        this.iconPolygon.removeAttribute("display");
    }

    controlOff() {
        this.background.setAttribute("display", "none");
        this.iconPolygon.setAttribute("display", "none");
    }

    updateElements() {
        if (this.length < 0) {
            this.controlOn();

            if (this.length > -12) {
                this.iconPolygon.setAttribute("display", "none");
            }

            this.dragBar.setAttribute("x", String(this.length));

            this.background.setAttribute("x", String(this.length));
            this.background.setAttribute("y", String(this.height));
            this.background.setAttribute("width", String(-this.length));
            this.background.setAttribute("height", String(LABEL_HEIGHT));
            this.iconPolygon.setAttribute("transform", `rotate(180) translate(${- this.length / 2 - 6},${- this.height - LABEL_HEIGHT / 2 - 6})`);
        } else if (this.length == 0) {
            this.controlOff();
        } else {
            this.controlOn();

            this.background.setAttribute("x", "0");
            this.background.setAttribute("height", String(this.height));
            this.background.setAttribute("y", String(0));
            this.background.setAttribute("width", String(this.length));
            this.iconPolygon.setAttribute("transform", `translate(${this.length / 2 - 6},${this.height / 2 - 6})`);
        }
    }

    updateWidth(moveEvent: MouseEvent) {
        this.virtualLength += moveEvent.movementX;
        let deltaL = -this.length;
        this.length = Math.min(this.virtualLength, MAX_DELAY_LENGTH);

        this.length = Math.max(-this.parentLength, this.length);
        this.length = this.timeToLength(snap(this.lengthToTime(this.length), 50, 10));

        if (this.length < 0) {
            this.dragBar.removeAttribute("display");
            this.parent.leftDragBar.setAttribute("display", "none");
        } else {
            this.dragBar.setAttribute("display", "none");
            this.parent.leftDragBar.removeAttribute("display");
        }

        this.updateElements();
        this.updateLengthGuide(Math.max(0, this.length), this.lengthToTime(this.length));

        if (this.length < 0) {
            this.length = 0;
        }

        deltaL += this.length;

        this.parent.updateDelayLength();
    }

    getOriginalHeight() {
        return Math.min(this.previousNode.getOriginalHeight(), this.parent.getOriginalHeight());;
    }

    finishUpdateWidth(upEvent: MouseEvent) {
        document.onmousemove = null;
        document.onmouseup = null;
        kfTrack.panningLock = false;

        this.originalNode.updateDelay(snap(this.lengthToTime(Math.max(-this.parentLength, Math.min(MAX_DELAY_LENGTH, this.virtualLength))), 50, 10));
    }

    updateLengthGuide(position: number, delay: number) {
        if (delay < 0) {
            this.lengthGuide.innerHTML = `forward: ${Math.round(-delay)} ms`;
        } else if (delay == 0) {
            this.lengthGuide.innerHTML = "no delay";
        } else {
            this.lengthGuide.innerHTML = `delay: ${delay} ms`;
        }
        const textWidth = this.lengthGuide.getBoundingClientRect().width;
        this.lengthGuideBackground.setAttribute("width", String((textWidth + ITEM_GAP * 2) / kfTrack.scale));
        this.lengthGuideBackground.setAttribute("x", String(position + (ITEM_GAP * 4) / kfTrack.scale));
        this.lengthGuide.setAttribute("x", String(position + ITEM_GAP * 5 / kfTrack.scale));
    }

    lengthToTime(length: number) {
        if (length >= 0) {
            return lengthToDelay(length);
        }
        return length / this.parentLength * lengthToDuration(this.parentLength);
    }

    timeToLength(time: number) {
        if (time >= 0) {
            return delayToLength(time);
        }
        return time / lengthToDuration(this.parentLength) * this.parentLength;
    }

    render(height: number, allowNegtiveDelay: boolean = false) {
        this.height = height;
        if (allowNegtiveDelay) {
            this.parentLength = this.parent.length;
        } else {
            this.parentLength = 0;
        }
        this.length = this.timeToLength(this.delay);
        // this.length = Math.max(-this.lastNodeLength, this.length);
        this.virtualLength = this.length;


        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.container.appendChild(background);
        this.background = background;
        background.setAttribute("rx", String(ITEM_GAP))
        background.setAttribute("fill", "#FFBD89");

        const iconPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        this.container.appendChild(iconPolygon);
        this.iconPolygon = iconPolygon;
        iconPolygon.setAttribute("transform", `translate(${this.length / 2 - 6},${height / 2 - 6})`);
        iconPolygon.setAttributeNS(null, 'fill', '#fff');
        iconPolygon.setAttributeNS(null, 'points', '10.1,0 10.1,4.1 5.6,0.1 4.3,1.5 8.3,5.1 0,5.1 0,6.9 8.3,6.9 4.3,10.5 5.6,11.9 10.1,7.9 10.1,12 12,12 12,0 ');

        const dragBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.container.appendChild(dragBar);
        this.dragBar = dragBar;
        dragBar.classList.add("kf-drag-bar-left");
        dragBar.setAttribute("height", String(LABEL_HEIGHT));
        dragBar.setAttribute("y", String(height));
        dragBar.setAttribute("width", String(2 * ITEM_GAP));
        if (this.originalNode instanceof KfTreeGroup && this.originalNode.startTimeBinding) {
        } else {
            dragBar.onmousedown = this.parent.leftDragBarCallback = (downEvent: MouseEvent) => {
                if (downEvent.button != 0) {
                    return;
                }
                // this.previousNode.hideRightDragBar();
                this.parent.leftDragBar.setAttribute("style", "opacity:1");
                this.dragBar.setAttribute("style", "opacity:1");
                kfTrack.panningLock = true;
                // rightDragBar.setAttribute("style", "opacity:1");

                kfTrack.setActiveNode(this.parent);

                const lengthGuideBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                this.container.appendChild(lengthGuideBackground);
                this.lengthGuideBackground = lengthGuideBackground;
                lengthGuideBackground.classList.add("kf-length-guide-bg");
                lengthGuideBackground.setAttribute("y", String((6 - ITEM_GAP) / kfTrack.scale));
                lengthGuideBackground.setAttribute("height", String((20) / kfTrack.scale));

                const lengthGuide = document.createElementNS("http://www.w3.org/2000/svg", "text");
                this.container.appendChild(lengthGuide);
                this.lengthGuide = lengthGuide;
                lengthGuide.setAttribute("x", String(this.length));
                lengthGuide.setAttribute("y", String(18 / kfTrack.scale));
                lengthGuide.setAttribute("font-size", String(12 / kfTrack.scale) + "px");
                lengthGuide.classList.add("kf-delay-length-guide");
                this.updateLengthGuide(Math.max(0, this.virtualLength), this.lengthToTime(this.virtualLength));
                document.onmousemove = (event: MouseEvent) => {
                    this.updateWidth(event)
                };
                document.onmouseup = (event: MouseEvent) => {
                    this.finishUpdateWidth(event)
                };
            };
        }
        this.updateElements();

        if (this.length < 0) {
            this.parent.hideLeftDragBar = true;
        } else {
            this.dragBar.setAttribute("display", "none");
        }

        this.length = Math.max(this.length, 0);


        if (this.length == 0) {
            return { element: this.container, length: 0 };
        } else {
            return { element: this.container, length: this.length };
        }
    }
}

export class KfNode extends KfItem {
    thumbnailUrl: string;
    effectType: string;
    easing: string;

    durationRatio: number = 1;

    virtualLength: number;
    background: Element;
    iconPolygon: Element;
    thumbnail: Element;
    thumbnailBackground: Element;
    rightDragBar: Element;
    lengthGuideBackground: Element;
    lengthGuide: Element;

    menuContainer: Element;

    originalNode: KfTreeNode;

    constructor(duration: number, effectType: string, easing: string, thumbnailUrl: string, parent: KfGroup, originalNode: KfTreeNode) {
        super(parent, 0, null);
        this.effectType = effectType;
        this.easing = easing;
        this.length = durationToLength(duration);
        this.thumbnailUrl = thumbnailUrl;
        this.originalNode = originalNode;
    }

    hideRightDragBar() {
        this.rightDragBar.setAttribute("display", "none");
    }

    updateLengthGuide() {
        const duration = snap(lengthToDuration(this.length), 10);

        this.lengthGuide.innerHTML = `duration: ${duration} ms`;
        const textWidth = this.lengthGuide.getBoundingClientRect().width;
        this.lengthGuideBackground.setAttribute("width", String((textWidth + ITEM_GAP * 2) / kfTrack.scale));
        this.lengthGuideBackground.setAttribute("x", String(this.length - (ITEM_GAP * 4 + textWidth) / kfTrack.scale));
        this.lengthGuide.setAttribute("x", String(this.length - ITEM_GAP * 3 / kfTrack.scale));
    }
    controlOn() {
        this.background.removeAttribute("display");
        this.iconPolygon.removeAttribute("display");
    }

    controlOff() {
        this.background.setAttribute("display", "none");
        this.iconPolygon.setAttribute("display", "none");
    }
    updateDurationBar() {
        if (this.length < 0) {
            this.controlOn();

            if (this.length > -12) {
                this.iconPolygon.setAttribute("display", "none");
            }

            // this.rightBar.setAttribute("x", String(this.length));

            this.background.setAttribute("x", String(this.length));
            this.background.setAttribute("y", String(this.height));
            this.background.setAttribute("width", String(-this.length));
            this.background.setAttribute("height", String(LABEL_HEIGHT));
            this.iconPolygon.setAttribute("transform", `rotate(180) translate(${- this.length / 2 - 6},${- this.height - LABEL_HEIGHT / 2 - 6})`);
        } else if (this.length == 0) {
            this.controlOff();
        } else {
            this.controlOn();

            this.background.setAttribute("x", String(ITEM_LENGTH - 2 * ITEM_GAP));
            this.background.setAttribute("height", String(this.height));
            this.background.setAttribute("y", String(0));
            this.background.setAttribute("width", String(this.length - ITEM_LENGTH + 2 * ITEM_GAP));
            this.iconPolygon.setAttribute("transform", `translate(${ITEM_LENGTH - 2 * ITEM_GAP + (this.length - ITEM_LENGTH) / 2},${this.height / 2 - 6})`);
        }
    }
    updateWidth(moveEvent: MouseEvent) {
        this.virtualLength += moveEvent.movementX;
        let deltaL = -this.length;
        // this.length = this.virtualLength;
        this.length = Math.min(Math.max(this.virtualLength, durationToLength(MIN_DURATION * this.durationRatio)), durationToLength(MAX_DURATION * this.durationRatio));
        // console.log(this.durationRatio);
        deltaL += this.length;
        this.thumbnail.setAttribute("width", String(ITEM_LENGTH - 2 * ITEM_GAP));
        this.thumbnailBackground.setAttribute("width", String(ITEM_LENGTH - 2 * ITEM_GAP));
        this.rightDragBar.setAttribute("x", String(this.length - 2 * ITEM_GAP));
        // this.menuContainer.setAttribute("transform", `translate(${this.length / 2},${0})`);

        this.updateDurationBar();
        this.updateLengthGuide();

        this.parent.resize(this, deltaL);
    }

    finishUpdateWidth(upEvent: MouseEvent) {
        document.onmousemove = null;
        document.onmouseup = null;
        // this.virtualLength = this.length;
        // this.container.removeChild(this.lengthGuideBackground);
        // this.container.removeChild(this.lengthGuide);
        kfTrack.panningLock = false;
        this.originalNode.updateDuration(lengthToDuration(this.length) / this.durationRatio);
    }

    createBtnIcon(btnType: string) {
        const icon: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        switch (btnType) {
            case EFFECT_FADE:
            case EFFECT_FADE_OUT:
                icon.setAttributeNS(null, 'd', 'M7.37,0.29C7.09,0.31,6.82,0.35,6.55,0.41v15.19c0.27,0.05,0.54,0.09,0.82,0.12V0.29z M3.45,14.18c0.26,0.2,0.53,0.38,0.82,0.54V1.27C3.98,1.44,3.71,1.62,3.45,1.82V14.18z M5.82,0.59C5.54,0.68,5.26,0.79,5,0.9v14.2c0.27,0.12,0.54,0.22,0.82,0.31V0.59z M1.17,4.56C0.65,5.6,0.35,6.76,0.35,8s0.3,2.4,0.82,3.44V4.56z M8.1,0.25C8.1,0.25,8.1,0.25,8.1,0.25l0,15.5c0,0,0,0,0,0c4.27,0,7.75-3.48,7.75-7.75S12.37,0.25,8.1,0.25z M2.72,2.44c-0.3,0.29-0.57,0.6-0.82,0.93v9.26c0.25,0.33,0.52,0.65,0.82,0.93V2.44z');
                break;
            case EFFECT_WIPE_LEFT:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8c0,4.27,3.48,7.75,7.75,7.75c4.27,0,7.75-3.48,7.75-7.75C15.75,3.73,12.27,0.25,8,0.25z M8,15c-1.01,0-1.97-0.22-2.84-0.61V8.38c0,0,0,0,0,0h5.44l-2.58,2.39l0.56,0.6L12.21,8L8.58,4.63l-0.56,0.6l2.58,2.39H5.16c0,0,0,0,0,0V1.61C6.03,1.22,6.99,1,8,1c3.86,0,7,3.14,7,7S11.86,15,8,15z');
                break;
            case EFFECT_WIPE_RIGHT:
                icon.setAttributeNS(null, 'd', 'M0.25,8c0,4.27,3.48,7.75,7.75,7.75s7.75-3.48,7.75-7.75S12.27,0.25,8,0.25S0.25,3.73,0.25,8z M1,8 c0-3.86,3.14-7,7-7c1.01,0,1.97,0.22,2.84,0.61v6.01l0,0H5.4l2.58-2.39l-0.56-0.6L3.79,8l3.63,3.37l0.56-0.6L5.4,8.38h5.44l0,0v6.01 C9.97,14.78,9.01,15,8,15C4.14,15,1,11.86,1,8z');
                break;
            case EFFECT_WIPE_TOP:
                icon.setAttributeNS(null, 'd', 'M8,15.75c4.27,0,7.75-3.48,7.75-7.75S12.27,0.25,8,0.25S0.25,3.73,0.25,8S3.73,15.75,8,15.75z M8,15 c-3.86,0-7-3.14-7-7c0-1.01,0.22-1.97,0.61-2.84h6.01l0,0v5.44L5.23,8.02l-0.6,0.56L8,12.21l3.37-3.63l-0.6-0.56L8.38,10.6V5.16l0,0 h6.01C14.78,6.03,15,6.99,15,8C15,11.86,11.86,15,8,15z');
                break;
            case EFFECT_WIPE_BOTTOM:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8S3.73,15.75,8,15.75s7.75-3.48,7.75-7.75S12.27,0.25,8,0.25z M8,1 c3.86,0,7,3.14,7,7c0,1.01-0.22,1.97-0.61,2.84H8.38l0,0V5.4l2.39,2.58l0.6-0.56L8,3.79L4.63,7.42l0.6,0.56L7.62,5.4v5.44l0,0H1.61 C1.22,9.97,1,9.01,1,8C1,4.14,4.14,1,8,1z');
                break;
            case EFFECT_GROW:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8c0,4.27,3.48,7.75,7.75,7.75c4.27,0,7.75-3.48,7.75-7.75C15.75,3.73,12.27,0.25,8,0.25z M8,15c-3.86,0-7-3.14-7-7s3.14-7,7-7s7,3.14,7,7S11.86,15,8,15z M13.99,7.91c0-0.13-0.12-0.24-0.25-0.24H8.17c-0.14,0-0.25,0.11-0.25,0.25V9.9c0,0.14,0.11,0.25,0.25,0.25h2.79c-0.25,0.43-0.56,0.75-0.93,0.97C9.58,11.41,9,11.55,8.32,11.55c-1.06,0-1.93-0.34-2.65-1.04C5.1,9.95,4.78,9.31,4.66,8.57l0.8,0.65l0.17-0.21L4.57,8.14C4.54,8.1,4.5,8.07,4.46,8.05l-0.1-0.08L4.3,8.04c-0.11,0.03-0.2,0.13-0.19,0.25c0,0.01,0,0.01,0,0.02L3.41,9.32l0.23,0.16l0.55-0.78c0.14,0.82,0.52,1.56,1.14,2.17c0.81,0.79,1.82,1.18,3,1.18c0.77,0,1.44-0.17,1.97-0.5c0.54-0.33,0.98-0.85,1.31-1.54c0.04-0.08,0.03-0.17-0.02-0.24s-0.13-0.12-0.21-0.12H8.42V8.17h5.08l0.01,0.22c0,0.92-0.24,1.8-0.72,2.63c-0.48,0.82-1.1,1.46-1.86,1.9c-0.76,0.43-1.66,0.65-2.68,0.65c-1.1,0-2.09-0.24-2.95-0.72c-0.86-0.47-1.54-1.16-2.04-2.04C2.75,9.93,2.5,8.96,2.5,7.94c0-1.4,0.47-2.63,1.39-3.66c1.09-1.23,2.54-1.85,4.3-1.85c0.92,0,1.8,0.17,2.6,0.51c0.61,0.26,1.23,0.7,1.83,1.32l-1.13,1.12C10.54,4.46,9.43,4,8.2,4C8.06,4,7.95,4.11,7.95,4.25S8.06,4.5,8.2,4.5c1.19,0,2.2,0.46,3.1,1.41c0.05,0.05,0.11,0.08,0.18,0.08c0.09,0,0.13-0.02,0.18-0.07l1.48-1.47c0.1-0.09,0.1-0.25,0.01-0.35c-0.7-0.76-1.43-1.3-2.16-1.61c-0.87-0.37-1.81-0.55-2.8-0.55c-1.91,0-3.48,0.68-4.67,2.02C2.51,5.08,2,6.42,2,7.94c0,1.11,0.28,2.16,0.82,3.11c0.54,0.96,1.3,1.71,2.23,2.23c0.93,0.52,2.01,0.78,3.2,0.78c1.11,0,2.1-0.24,2.93-0.72c0.83-0.48,1.52-1.18,2.04-2.08C13.74,10.36,14,9.4,14,8.38L13.99,7.91z');
                break;
            case EFFECT_CIRCLE:
                icon.setAttributeNS(null, 'd', 'M8.08,0.29c-4.27,0-7.73,3.46-7.73,7.73s3.47,7.73,7.73,7.73s7.73-3.46,7.73-7.73S12.35,0.29,8.08,0.29z M8.08,13.79c-3.18,0-5.77-2.58-5.77-5.77S4.9,2.25,8.08,2.25s5.77,2.58,5.77,5.77S11.27,13.79,8.08,13.79z M8.08,3.14 c-2.7,0-4.88,2.19-4.88,4.88s2.19,4.88,4.88,4.88c2.7,0,4.88-2.19,4.88-4.88S10.78,3.14,8.08,3.14z M8.08,11.66 c-2.01,0-3.64-1.63-3.64-3.64s1.63-3.64,3.64-3.64S11.73,6,11.73,8.02S10.1,11.66,8.08,11.66z M8.08,5.18 c-1.56,0-2.83,1.27-2.83,2.83s1.27,2.83,2.83,2.83s2.83-1.27,2.83-2.83S9.65,5.18,8.08,5.18z M8.08,10.13 c-1.17,0-2.11-0.94-2.11-2.11S6.91,5.9,8.08,5.9s2.11,0.94,2.11,2.11S9.25,10.13,8.08,10.13z')
                break;
            case EFFECT_WHEEL:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8c0,4.27,3.48,7.75,7.75,7.75c4.27,0,7.75-3.48,7.75-7.75C15.75,3.73,12.27,0.25,8,0.25z M8,1c0,2.33,0,4.67,0,7c-1.91,1.33-3.83,2.66-5.74,4C1.47,10.86,1,9.49,1,8C1,4.14,4.14,1,8,1z M4.04,10.45c0.04,0,0.08-0.01,0.12-0.03c0.12-0.07,0.16-0.22,0.1-0.34C3.9,9.44,3.71,8.72,3.71,8c0-1.87,1.25-3.52,3.01-4.08L5.98,5.21L6.29,5.4L7.4,3.5L7.16,3.39C7.14,3.37,7.12,3.36,7.09,3.35L5.43,2.54L5.27,2.87L6.5,3.47C4.58,4.11,3.21,5.94,3.21,8c0,0.81,0.21,1.61,0.6,2.32C3.87,10.4,3.95,10.45,4.04,10.45z');
                break;
            case EFFECT_TRANSITION:
                icon.setAttributeNS(null, 'd', 'M11.71,7.98L8.9,5.17L8.9,7.21L5,7.21L5,8.69L8.9,8.69L8.9,10.79z M8.88,0.27v4.22l3.49,3.49l-3.49,3.49v4.22c3.92-0.39,6.98-3.69,6.98-7.71C15.85,3.96,12.79,0.66,8.88,0.27z M7.71,9.38H4.22V6.59h3.49V0.25c-4.1,0.2-7.36,3.58-7.36,7.73c0,4.15,3.26,7.53,7.36,7.73V9.38z');
                break;
            case EASING_LINEAR:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.09,0-0.19-0.04-0.26-0.11c-0.15-0.14-0.15-0.38-0.01-0.53l8.18-8.38c0.15-0.15,0.38-0.15,0.53-0.01c0.15,0.14,0.15,0.38,0.01,0.53l-8.18,8.38C4.22,12.89,4.12,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case EASING_IN_QUAD:
                icon.setAttributeNS(null, 'd', 'M12.21,3.79c0.03,0,0.06,0,0.08,0.01c0.2,0.05,0.33,0.25,0.28,0.45c-0.32,1.4-1.68,6.13-5.89,7.98 c-0.82,0.36-1.7,0.59-2.62,0.69c-0.22,0.02-0.39-0.13-0.41-0.33s0.13-0.39,0.33-0.41c0.84-0.09,1.65-0.3,2.4-0.63 c3.89-1.71,5.16-6.14,5.46-7.46C11.88,3.9,12.04,3.79,12.21,3.79z M11.93,0.92H4.29c-1.74,0-3.15,1.41-3.15,3.15v7.65c0,1.73,1.41,3.15,3.15,3.15h7.64 c1.74,0,3.16-1.41,3.15-3.16V4.07C15.08,2.33,13.67,0.92,11.93,0.92z M14.33,11.71c0,1.32-1.07,2.4-2.4,2.4H4.29 c-1.32,0-2.4-1.07-2.4-2.4V4.07c0-1.32,1.07-2.4,2.4-2.4h7.64c1.32,0,2.4,1.07,2.4,2.4V11.71z');
                break;
            case EASING_OUT_QUAD:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.03,0-0.06,0-0.08-0.01c-0.2-0.05-0.33-0.25-0.28-0.45c0.32-1.4,1.68-6.13,5.89-7.98c0.82-0.36,1.7-0.59,2.62-0.69c0.22-0.02,0.39,0.13,0.41,0.33s-0.13,0.39-0.33,0.41c-0.84,0.09-1.65,0.3-2.4,0.63c-3.89,1.71-5.16,6.14-5.46,7.46C4.35,12.81,4.19,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case EASING_INOUT_QUAD:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.18,0-0.35-0.14-0.37-0.32c-0.03-0.21,0.12-0.39,0.32-0.42c1.02-0.14,1.84-0.5,2.46-1.08c0.93-0.87,1.17-2.06,1.4-3.2c0.25-1.25,0.51-2.53,1.64-3.37C10.18,4,11.1,3.76,12.22,3.79c0.21,0.01,0.37,0.18,0.36,0.39c-0.01,0.21-0.2,0.36-0.39,0.36c-0.96-0.03-1.71,0.16-2.27,0.58C9.02,5.8,8.81,6.84,8.56,8.05c-0.24,1.21-0.52,2.57-1.63,3.6c-0.73,0.68-1.69,1.11-2.87,1.27C4.05,12.92,4.04,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case EASING_IN_CUBIC:
                icon.setAttributeNS(null, 'd', 'M12.21,3.79c0.03,0,0.06,0,0.08,0.01c0.2,0.05,0.33,0.25,0.28,0.45c-0.32,1.4-1.68,6.13-5.89,7.98 c-0.82,0.36-1.7,0.59-2.62,0.69c-0.22,0.02-0.39-0.13-0.41-0.33s0.13-0.39,0.33-0.41c0.84-0.09,1.65-0.3,2.4-0.63 c3.89-1.71,5.16-6.14,5.46-7.46C11.88,3.9,12.04,3.79,12.21,3.79z M11.93,0.92H4.29c-1.74,0-3.15,1.41-3.15,3.15v7.65c0,1.73,1.41,3.15,3.15,3.15h7.64 c1.74,0,3.16-1.41,3.15-3.16V4.07C15.08,2.33,13.67,0.92,11.93,0.92z M14.33,11.71c0,1.32-1.07,2.4-2.4,2.4H4.29 c-1.32,0-2.4-1.07-2.4-2.4V4.07c0-1.32,1.07-2.4,2.4-2.4h7.64c1.32,0,2.4,1.07,2.4,2.4V11.71z');
                break;
            case EASING_OUT_CUBIC:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.03,0-0.06,0-0.08-0.01c-0.2-0.05-0.33-0.25-0.28-0.45c0.32-1.4,1.68-6.13,5.89-7.98c0.82-0.36,1.7-0.59,2.62-0.69c0.22-0.02,0.39,0.13,0.41,0.33s-0.13,0.39-0.33,0.41c-0.84,0.09-1.65,0.3-2.4,0.63c-3.89,1.71-5.16,6.14-5.46,7.46C4.35,12.81,4.19,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case EASING_INOUT_CUBIC:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.18,0-0.35-0.14-0.37-0.32c-0.03-0.21,0.12-0.39,0.32-0.42c1.02-0.14,1.84-0.5,2.46-1.08c0.93-0.87,1.17-2.06,1.4-3.2c0.25-1.25,0.51-2.53,1.64-3.37C10.18,4,11.1,3.76,12.22,3.79c0.21,0.01,0.37,0.18,0.36,0.39c-0.01,0.21-0.2,0.36-0.39,0.36c-0.96-0.03-1.71,0.16-2.27,0.58C9.02,5.8,8.81,6.84,8.56,8.05c-0.24,1.21-0.52,2.57-1.63,3.6c-0.73,0.68-1.69,1.11-2.87,1.27C4.05,12.92,4.04,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case DURATION:
                icon.setAttributeNS(null, 'd', 'M8.26,0.68C8.17,0.67,8.09,0.65,8,0.65c-4.12,0-7.46,3.34-7.46,7.46c0,4.12,3.34,7.46,7.46,7.46c2.54,0,4.78-1.28,6.12-3.22c0.84-1.2,1.33-2.66,1.33-4.24C15.46,4.08,12.26,0.82,8.26,0.68z M8,14.81c-3.7,0-6.71-3.01-6.71-6.71c0-3.53,2.75-6.44,6.22-6.69v6.7V8.5l0.31,0.22l1.41,1.02l3.82,2.76C11.79,13.96,9.95,14.81,8,14.81z M13.32,11.8c-0.07,0.1-0.19,0.16-0.3,0.16c-0.08,0-0.15-0.02-0.22-0.07L7.84,8.31V2.03c0-0.21,0.17-0.38,0.38-0.38s0.38,0.17,0.38,0.38v5.9l4.64,3.35C13.4,11.39,13.44,11.63,13.32,11.8z');
                break;
            default:
        }
        return icon;
    }

    createBtn(btnType: string) {
        const container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("width", "16");
        rect.setAttribute("height", "16");
        rect.setAttribute("opacity", "0");
        container.appendChild(rect);
        container.appendChild(this.createBtnIcon(btnType));
        container.classList.add("kf-button");
        return container;
    }

    createDropDownList(items: string[], x: number, y: number, callback: Function) {
        this.menuContainer.setAttribute("style", "opacity: 1");
        const itemWidth = 120;
        const itemHeight = 20;
        let cx = this.getX();
        // x += cx;
        y += this.getY();

        const container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        kfTrack.innerContainer.appendChild(container);
        container.setAttribute("transform", `translate(${(this.length - itemWidth) / 2 + cx},${y})scale(${1 / kfTrack.scale})`);

        const background1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background1.setAttribute("opacity", "0");
        background1.setAttribute("y", String(-25 * kfTrack.scale));
        background1.setAttribute("x", String((itemWidth / 2 + x) * kfTrack.scale));
        background1.setAttribute("width", String(25 * kfTrack.scale));
        background1.setAttribute("height", String(25 * kfTrack.scale));
        container.appendChild(background1);

        let index = 0;
        for (let item of items) {
            const itemBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            itemBackground.setAttribute("width", String(itemWidth));
            itemBackground.setAttribute("height", String(itemHeight));
            itemBackground.setAttribute("fill", "#676767");
            itemBackground.setAttribute("stroke", "#AAA");
            itemBackground.setAttribute("y", String(index * (itemHeight)))
            container.appendChild(itemBackground);

            const itemContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
            itemContainer.classList.add("kf-button")
            itemContainer.setAttribute("transform", `translate(${0},${index * (itemHeight)})`);
            container.appendChild(itemContainer);
            itemContainer.onclick = () => {
                callback(item);
            }

            const itemMask = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            itemMask.setAttribute("width", String(itemWidth));
            itemMask.setAttribute("height", String(itemHeight));
            itemMask.setAttribute("opacity", "0");
            itemContainer.appendChild(itemMask);

            const buttonIcon = this.createBtnIcon(item);
            itemContainer.appendChild(buttonIcon);
            buttonIcon.setAttribute("transform", `translate(${itemHeight / 2 - 8},${itemHeight / 2 - 8})`)

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.innerHTML = item;
            text.setAttribute("font-size", "12");
            text.setAttribute("x", "25");
            text.setAttribute("y", String(itemHeight / 2 + 4));
            text.setAttribute("font-weight", "600");
            itemContainer.appendChild(text);

            index++
        }

        container.onmouseleave = () => {
            kfTrack.innerContainer.removeChild(container);
            this.menuContainer.removeAttribute("style");
        }
    }

    createMenu() {
        const menuContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.menuContainer = menuContainer;
        this.mainContainer.appendChild(menuContainer);
        menuContainer.classList.add("kf-item-menu");

        const menuWidth = 50;
        const menuRoundCorner = 10;
        const menuBackgroundColor = "#676767"

        // menuContainer.setAttribute("transform", `translate(${this.length / 2},${0})`);
        menuContainer.setAttribute("transform", `translate(${ITEM_LENGTH / 2},${0})`);

        const menuBackground1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        menuContainer.appendChild(menuBackground1);
        menuBackground1.setAttribute("width", String(menuWidth));
        menuBackground1.setAttribute("height", String(menuWidth / 2));
        menuBackground1.setAttribute("x", String(- menuWidth / 2));
        menuBackground1.setAttribute("rx", String(menuRoundCorner));
        menuBackground1.setAttribute("fill", menuBackgroundColor);

        const menuBackground2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        menuContainer.appendChild(menuBackground2);
        menuBackground2.setAttribute("width", String(menuWidth));
        menuBackground2.setAttribute("height", String(menuWidth / 2 - menuRoundCorner));
        menuBackground2.setAttribute("x", String(- menuWidth / 2));
        menuBackground2.setAttribute("fill", menuBackgroundColor);


        const effectBtn = this.createBtn(this.effectType);
        menuContainer.appendChild(effectBtn);
        effectBtn.setAttribute("transform", `translate(${-25 / 2 - 8},${25 / 2 - 8})`);

        const easingBtn = this.createBtn(this.easing);
        menuContainer.appendChild(easingBtn);
        easingBtn.setAttribute("transform", `translate(${25 / 2 - 8},${25 / 2 - 8})`);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("y1", "5");
        line.setAttribute("y2", "20");
        line.setAttribute("stroke", "rgb(163, 163, 163)");
        menuContainer.appendChild(line);

        effectBtn.onclick = () => {
            this.createDropDownList(EFFECTS, -25, 25, (effectType: string) => {
                kfTrack.setActiveNode(this);
                this.originalNode.updateEffectType(effectType);
            });
        }

        easingBtn.onclick = () => {
            this.createDropDownList(EASINGS, 0, 25, (easing: string) => {
                kfTrack.setActiveNode(this);
                this.originalNode.updateEasing(easing);
            })
        }

    }

    render(height: number) {
        this.height = height;
        const container = this.mainContainer;
        const length = this.length;
        this.virtualLength = length;
        container.classList.add("kf-item-container");


        const thumbnailBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        container.appendChild(thumbnailBackground);
        this.thumbnailBackground = thumbnailBackground;
        // thumbnailBackground.setAttribute("stroke", LABEL_COLORS[0]);
        thumbnailBackground.setAttribute("fill", "white");
        thumbnailBackground.setAttribute("stroke", "#CCC");
        thumbnailBackground.setAttribute("width", String(ITEM_LENGTH - 2 * ITEM_GAP));
        thumbnailBackground.setAttribute("height", String(height));
        // thumbnailBackground.setAttribute("y", String(LABEL_HEIGHT));

        const thumbnail = document.createElementNS("http://www.w3.org/2000/svg", "image");
        container.appendChild(thumbnail);
        this.thumbnail = thumbnail;
        thumbnail.setAttribute("href", this.thumbnailUrl);
        thumbnail.setAttribute("width", String(ITEM_LENGTH - 2 * ITEM_GAP));
        thumbnail.setAttribute("height", String(height));
        // thumbnail.setAttribute("y", String(LABEL_HEIGHT));

        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        container.appendChild(background);
        this.background = background;
        background.setAttribute("rx", String(ITEM_GAP))
        background.setAttribute("fill", "#71b1ed");


        const iconPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        container.appendChild(iconPolygon);
        this.iconPolygon = iconPolygon;
        iconPolygon.setAttribute("transform", `translate(${(this.length + ITEM_LENGTH - 2 * ITEM_GAP) / 2 - 2 * ITEM_GAP},${height / 2 - 6})`);
        iconPolygon.setAttributeNS(null, 'fill', '#fff');
        iconPolygon.setAttributeNS(null, 'points', '10.1,0 10.1,4.1 5.6,0.1 4.3,1.5 8.3,5.1 0,5.1 0,6.9 8.3,6.9 4.3,10.5 5.6,11.9 10.1,7.9 10.1,12 12,12 12,0 ');

        const rightDragBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        container.appendChild(rightDragBar);
        this.rightDragBar = rightDragBar;
        rightDragBar.setAttribute("x", String(length - 2 * ITEM_GAP));
        rightDragBar.setAttribute("y", String(0));
        rightDragBar.setAttribute("width", String(ITEM_GAP * 2));
        rightDragBar.setAttribute("height", String(height));
        rightDragBar.classList.add("kf-drag-bar-right");

        rightDragBar.onmousedown = (downEvent: MouseEvent) => {
            if (downEvent.button != 0) {
                return;
            }
            kfTrack.panningLock = true;
            rightDragBar.setAttribute("style", "opacity:1");

            kfTrack.setActiveNode(this);

            const lengthGuideBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            this.container.appendChild(lengthGuideBackground);
            this.lengthGuideBackground = lengthGuideBackground;
            lengthGuideBackground.classList.add("kf-length-guide-bg");
            lengthGuideBackground.setAttribute("y", String((6 - ITEM_GAP) / kfTrack.scale));
            lengthGuideBackground.setAttribute("height", String(20 / kfTrack.scale));

            const lengthGuide = document.createElementNS("http://www.w3.org/2000/svg", "text");
            this.container.appendChild(lengthGuide);
            this.lengthGuide = lengthGuide;
            lengthGuide.setAttribute("x", String(this.length));
            lengthGuide.setAttribute("y", String(18 / kfTrack.scale));
            lengthGuide.setAttribute("font-size", String(12 / kfTrack.scale));
            lengthGuide.classList.add("kf-length-guide");

            this.updateLengthGuide();

            document.onmousemove = (event: MouseEvent) => { this.updateWidth(event) };
            document.onmouseup = (event: MouseEvent) => { this.finishUpdateWidth(event) };
        }

        this.updateDurationBar();
        this.renderLeftBar();
        this.createMenu();
        return length;
    }
}

class KfTrack {
    groups: KfItem[];
    lastGroup: KfItem;
    length: number;
    panningX: number;
    panningY: number;
    scale: number = 1;

    aniX: number;
    aniY: number;
    aniScale: number = 1;

    container: Element;
    innerContainer: Element;
    panningLock: boolean = false;
    timingLock: boolean = false;

    activeNodeX: number;
    activeNodeId: number;
    activeNode: KfItem;

    updateKfTrack(groups: KfItem[]) {
        // console.log(groups);
        this.groups = groups;
        this.lastGroup = groups.pop();
        this.render();
    }

    resize(activeChild: KfItem, deltaL: number) {
        let flag = false;
        for (let group of this.groups) {
            if (flag) {
                group.translate(deltaL, 0);
            }
            if (group == activeChild) {
                flag = true;
            }
        }
    }

    resetActiveNode() {
        this.activeNodeId = -1;
    }

    setActiveNode(node: KfItem) {
        this.activeNodeId = node.id;
        this.activeNodeX = node.getX() - this.panningX;
    }

    render() {
        const container = document.getElementById("kfTracksContainer");
        this.container = container;
        container.innerHTML = "";

        let maxHeight = THUMBNAIL_HEIGHT;
        let maxLevel = 0;
        for (let i of this.groups) {
            i.calcLevelFromLeaves();
            maxHeight = Math.max(maxHeight, i.getOriginalHeight());
            maxLevel = Math.max(maxLevel, i.levelFromLeaves);
        }

        const innerContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.innerContainer = innerContainer;
        innerContainer.id = "kfTracksInnerContainer";
        container.appendChild(innerContainer);

        const trackBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        innerContainer.appendChild(trackBackground);
        // trackBackground.setAttribute("fill", "#dfdfdf");
        trackBackground.setAttribute("fill", "#f7f7f7");
        trackBackground.setAttribute("y", "20");
        trackBackground.setAttribute("width", "10000");
        trackBackground.setAttribute("height", String(maxHeight));

        let x = 0;
        for (let i of this.groups) {
            const length = i.render(maxHeight);
            i.translate(x, 20);

            x += length + i.delayLength;
            x += (maxLevel - 2) * 2;
            innerContainer.append(i.container);
        }
        // x += 20;
        x -= (maxLevel - 2) * 2;
        // x -= ITEM_GAP;
        const nonSelectedMarks = calcNonSelectedMarks();

        const suggestFrames = getSuggestFrames([]);
        if (nonSelectedMarks.size) {
            AddPanel.createAddPanel(maxHeight, suggestFrames.length > 0);
            const addPanelContainer = AddPanel.container;
            innerContainer.appendChild(addPanelContainer);
            addPanelContainer.setAttribute("transform", `translate(${x}, 20)`);
            x += AddPanel.width
        }
        // suggestPanel.removeSuggestPanel();
        const recommendList: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
        recommendList.setAttribute("transform", `translate(${x}, 20)`);
        recommendList.setAttribute("id", "recommendList");
        innerContainer.appendChild(recommendList);
        suggestPanel.createSuggestPanel(suggestFrames, maxHeight, [...calcSelectedMarks()]);

        if (suggestFrames.length > 0) {
            this.timingLock = true;
            x += 320;
        } else {
            this.timingLock = false;
        }
        if (nonSelectedMarks.size) {
            this.lastGroup.calcLevelFromLeaves();
            const length = this.lastGroup.render(maxHeight);
            this.lastGroup.translate(x, 20);

            x += length + this.lastGroup.delayLength;
            innerContainer.append(this.lastGroup.container);
        }

        this.length = x;
        if (this.activeNodeId == -1) {
            this.updatePanning(x, 0);
            kfContainer.kfContainerTransX(x);
        } else {
            this.updatePanning(this.activeNode.getX() - this.activeNodeX, 0);
            kfContainer.kfContainerTransX(this.activeNode.getX() - this.activeNodeX);
        }

        container.addEventListener("wheel", (event: WheelEvent) => {
            const factorX = 0.06;
            const factorY = 0.02;
            if (event.shiftKey) {
                // this.updateScale(this.scale * Math.pow(1.0001, -event.deltaY));
            } else if (event.altKey) {
                this.updatePanning(this.panningX, this.panningY + event.deltaY * factorY);

            } else {
                this.updatePanning(this.panningX + event.deltaY * factorX, this.panningY);
                kfContainer.kfContainerTransX(this.panningX + event.deltaY * factorX);
            }
        })
    }
    updateScale(scale: number) {
        scale = Math.max(0.5, Math.min(1, scale));
        let scaleFactor = scale / this.scale
        this.scale = scale;
        this.updatePanning(this.panningX, this.panningY);
    }

    updatePanning(x: number, y: number) {
        if (this.panningLock) {
            return;
        }
        const rect = this.container.getBoundingClientRect();
        if (this.length * this.scale - x * this.scale < rect.width) {
            x = this.length - rect.width / this.scale;
        }
        if (x < 0) {
            x = 0;
        }
        this.panningX = x;
        this.panningY = y;
        this.innerContainer.setAttribute("transform", `scale(${this.scale})translate(${-this.panningX},${this.panningY})`);
        const aniPreview = document.getElementById("aniPreview");
        const loc = document.getElementById('recommendList').getBoundingClientRect();
        aniPreview.style.left = `${loc.left}px`;
        aniPreview.style.top = `${loc.top}px`;
    }
}

export const kfTrack = new KfTrack();