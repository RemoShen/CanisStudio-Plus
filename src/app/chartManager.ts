import Lottie from "lottie-web";
import { IChartSpec } from "../app_backup/core/canisGenerator";
import { Player, player } from "../components/player";
import { ViewContent } from "../components/viewWindow";
import CanisGenerator, { canis, ICanisSpec } from "./core/canisGenerator";
import { clearKfTrees } from "./kfTree";
import { MarkSelector, MarkSelectorMode } from "./markSelector";
import { markTableManager } from "./markTableManager";
import Tool from "../util/tool";

export const MARKID = "_MARKID";
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const NONDATATYPE = ["axis-domain", "axis-tick", "axis-label", "legend-text", "legend-symbol", "x-axis-domain", "x-axis-tick", "x-axis-label", "y-axis-domain", "y-axis-tick", "y-axis-label", "title", "Title", "axis-grid", "y-axis-grid", "x-axis-grid", "y-axis-domain1", "y-axis-tick1", "y-axis-label1", "y-axis-domain2", "y-axis-tick2", "y-axis-label2", "legend-label", "year-title", "title1",
    "title2", "x-axis-title", "y-axis-title", "l-axis-domain", "l-axis-tick", "l-axis-label", "r-axis-domain", "r-axis-tick", "r-axis-label"];
class MarkTable {
    markType: Set<string> = new Set();
    fieldNames: string[] = [];
    fieldType: string[] = [];
    sortAttribute: string[] = [];
    sortId: string = ''
    items: { id: string, attributes: string[] }[] = [];
    constructor(firstMark: Map<string, string>, id: string) {
        this.sortId = 'none';
        this.fieldNames.push(MARKID);
        this.sortAttribute.push('none');
        this.fieldType.push('string');
        for (let [k, v] of firstMark) {
            if (k == MARKID) {
                continue;
            }
            this.fieldNames.push(k);
            this.sortAttribute.push('none');
            if (parseFloat(v) == Number(v)) {
                this.fieldType.push('number');
            } else if (MONTHS.indexOf(v) != -1) {
                this.fieldType.push('month');
            } else {
                this.fieldType.push('string');
            }
        }
        this.tryToAddMark(firstMark, id);
    }

    tryToAddMark(mark: Map<string, string>, id: string) {
        if (mark.size != this.fieldNames.length) {
            return false;
        }

        for (let name of this.fieldNames) {
            if (!mark.has(name)) {
                return false;
            }
        }

        const attributes: string[] = [];
        for (let i of this.fieldNames) {
            attributes.push(mark.get(i));
        }
        this.items.push({ id, attributes });
        this.markType.add(mark.get(MARKID));
        return true;
    }
}

class ChartManager {
    canisSpec: ICanisSpec;
    marks: Map<string, Map<string, string>> = new Map();
    numericAttrs: Map<string, Map<string, string>> = new Map();
    isText: Map<string, boolean> = new Map();
    markTables: MarkTable[];
    lottieSpec: any;
    lottieAnimation: any;

    async loadChart(chart: string) {
        const chartSpec: IChartSpec[] = CanisGenerator.generateChartSpec([chart]);
        const spec: ICanisSpec = { charts: chartSpec, animations: [] };
        this.marks.clear();
        this.numericAttrs.clear();
        this.canisSpec = spec;
        const lottieSpec = await canis.renderSpec(this.canisSpec, () => { });
        // console.log('lottiespec', lottieSpec);

        this.updateAnimation(lottieSpec);

        const marks = document.getElementsByClassName("mark");
        for (let i = 0, l = marks.length; i < l; i++) {
            const mark = marks[i];
            this.isText.set(mark.id, mark.tagName == "text");
            const markAttributes = JSON.parse(mark.getAttribute("data-datum"));
            const attributeMap = new Map<string, string>();
            const numericAttributeMap = new Map<string, string>();
            attributeMap.set(MARKID, markAttributes[MARKID]);
            for (let name in markAttributes) {
                if (name[0] == "_") {
                    continue;
                }
                let value: string = markAttributes[name];
                if (parseFloat(value) == Number(value)) {
                    numericAttributeMap.set(name, value)
                    continue;
                }
                if (value[0] == "_") {
                    value = value.slice(1);
                }
                attributeMap.set(name, value);
            }
            this.marks.set(mark.id, attributeMap);
            this.numericAttrs.set(mark.id, numericAttributeMap);
        }
        // MarkSelector.reset(new Set(), new Map(), []);
        this.loadMarkTables();
        clearKfTrees();
    }

    loadMarkTables() {
        const markTables: MarkTable[] = [];
        const dataMarks: Map<string, Map<string, string>> = new Map();
        this.marks.forEach((value, key) => {
            if (NONDATATYPE.indexOf(value.get(MARKID)) == -1) {
                dataMarks.set(key, new Map([...value, ...this.numericAttrs.get(key)]));
            }
        });

        for (let [id, mark] of dataMarks) {
            let flag: boolean = false;
            for (let markTable of markTables) {
                if (markTable.tryToAddMark(mark, id)) {
                    flag = true;
                    break;
                }
            }
            if (flag) {
                continue;
            }
            markTables.push(new MarkTable(mark, id));
        }
        this.markTables = markTables;
        markTableManager.render();
    }

    async updateCanisSpec(animations: any[]) {
        if (!this.canisSpec) {
            return;
        }
        this.canisSpec.animations = animations;
        const lottieSpec = await canis.renderSpec(this.canisSpec, () => { });
        this.updateAnimation(lottieSpec);
    }

    updateAnimation(lottieSpec: any) {
        this.lottieSpec = lottieSpec;
        // console.log(JSON.stringify(lottieSpec));
        document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID).innerHTML = '';
        this.lottieAnimation = Lottie.loadAnimation({
            container: document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: lottieSpec // the animation data
        })
        player.resetPlayer({
            frameRate: canis.frameRate,
            currentTime: 0,
            totalTime: canis.duration()
        })
        // document.getElementById(Player.PLAY_BTN_ID).click();
    }

    getMinValue(fieldName: string) {
        let result = Infinity;
        for (let [id, attrs] of this.numericAttrs) {
            if (attrs.has(fieldName)) {
                result = Math.min(result, Number(attrs.get(fieldName)));
            }
        }
        return result;
    }

    getAvgValue(marks: string[], fieldName: string) {
        let result = 0;
        let count = 0;
        for (let id of marks) {
            const attr = this.numericAttrs.get(id);
            if (attr.has(fieldName)) {
                result += Number(attr.get(fieldName));
                count++;
            }
        }
        result /= count;
        return result;
    }
}

export const chartManager = new ChartManager();