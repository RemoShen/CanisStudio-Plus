import { AnimationTreeGroup } from "./animationTree";
import { chartManager, MARKID } from "./chartManager";
import { KfItem, KfRow, KfNode, KfOmit, kfTrack, KfDelay, KfColume, KfGroup } from "./kfTrack";
import { MarkSelector } from "./markSelector";
import { sortStrings } from "./sortUtil";
import Tool from "../util/tool";
import { Loading, loadingBlock } from "../components/widgets/loading";
type MarkType = string;
type AttributeName = string;
type AttributeValue = string;

export class KfTreeNode {
    public markTypeSelectors: Set<MarkType>;
    parent: KfTreeGroup;

    grouping: null | {
        child: KfTreeGroup;
        groupBy: AttributeName;
        sequence: AttributeValue[];
        sort: {
            channel: string;
            order: string;
        }
    }
    vertical = false;

    property: null | {
        duration: number;
        effectType: string;
        easing: string;
    }
    durationBinding: string = null;

    delay: number;
    updateFlag: boolean = false;

    constructor(markTypeSelectors: Set<MarkType>, parent: KfTreeGroup) {
        this.markTypeSelectors = markTypeSelectors;
        this.grouping = null;
        this.property = null;
        this.delay = 0;
        this.parent = parent;
    }

    calcDurationRatio(marks: string[]) {
        if (!this.durationBinding) {
            return 1;
        }
        return chartManager.getAvgValue(marks, this.durationBinding) / chartManager.getMinValue(this.durationBinding);
    }

    getBinding(marks: Set<string>) {
        const options: string[] = [];
        const childMarkType = this.markTypeSelectors;
        for (let markType of childMarkType) {
            for (let mark of marks) {
                if (chartManager.marks.get(mark).get(MARKID) != markType) {
                    continue;
                }
                for (let [k, v] of chartManager.numericAttrs.get(mark)) {
                    if (!options.includes(k)) {
                        options.push(k);
                    }
                }
                break;
            }
        }
        if (options.length == 0) {
            return null;
        }
        return {
            duration: {
                binding: this.durationBinding,
                node: this
            },
            startTime: null as {
                binding: string,
                group: KfTreeGroup
            },
            options,
            // assume that every children has the same numeric attributes
        }
    }

    updateProperty() {
        if (this.markTypeSelectors.size == 0) {
            firstFrame = firstFrame.deepClone(null);
            return firstFrame.children[0][0];
        }
        this.updateFlag = true;
        kfTrees = kfTrees.map(i => i.deepClone(null));
        this.updateFlag = false;
        for (let i of kfTrees) {
            const result = i.findUpdateNode();
            if (result) {
                result.updateFlag = false;
                return result;
            }
        }
    }

    updateDurationBinding(durationBinding: string) {
        this.updateProperty().durationBinding = durationBinding;
        saveHistory();
        renderKfTree();
    }

    updateDuration(duration: number) {
        this.updateProperty().property.duration = duration;
        saveHistory();
        renderKfTree();
    }

    updateDelay(delay: number) {
        this.updateProperty().delay = delay;
        saveHistory();
        renderKfTree();
    }

    updateEffectType(effectType: string) {
        this.updateProperty().property.effectType = effectType;
        saveHistory();
        renderKfTree();
    }

    updateEasing(easing: string) {
        this.updateProperty().property.easing = easing;
        saveHistory();
        renderKfTree();
    }

    updateSort(channel: string, order: string) {
        this.updateProperty().grouping.sort = { channel, order };
        saveHistory();
        renderKfTree();
    }

    moveForward() {
        const node = this.updateProperty();
        const parent = node.parent;
        const children = parent.children;
        let index = 0;
        for (let arr of children) {
            if (arr.includes(node)) {
                break;
            }
            index++;
        }
        if (children[index].length == 1) {
            if (index == 0) {
                renderKfTree();
                return;
            }
            children.splice(index, 1);
            children[index - 1].push(node);
        } else {
            children[index].splice(children[index].indexOf(node), 1);
            children.splice(index, 0, [node]);
        }
        saveHistory();
        renderKfTree();
    }

    moveBackward() {
        const node = this.updateProperty();
        const parent = node.parent;
        const children = parent.children;
        let index = 0;
        for (let arr of children) {
            if (arr.includes(node)) {
                break;
            }
            index++;
        }
        if (children[index].length == 1) {
            if (index == children.length - 1) {
                renderKfTree();
                return;
            }
            children.splice(index, 1);
            children[index].push(node);
        } else {
            children[index].splice(children[index].indexOf(node), 1);
            children.splice(index + 1, 0, [node]);
        }
        saveHistory();
        renderKfTree();
    }

    deepClone(parent: KfTreeGroup) {
        const result = new KfTreeNode(this.markTypeSelectors, parent);
        result.markTypeSelectors = new Set(this.markTypeSelectors);
        result.delay = this.delay;
        result.updateFlag = this.updateFlag;
        result.vertical = this.vertical;
        result.durationBinding = this.durationBinding;
        if (this.grouping) {
            result.grouping = {
                groupBy: this.grouping.groupBy,
                child: this.grouping.child.deepClone(result),
                sequence: Array.from(this.grouping.sequence),
                sort: {
                    channel: this.grouping.sort.channel,
                    order: this.grouping.sort.order
                }
            }
        } else {
            result.property = {
                duration: this.property.duration,
                effectType: this.property.effectType,
                easing: this.property.easing
            }
        }
        return result;
    }
}

export class KfTreeGroup {
    attributeSelectors: Map<AttributeName, AttributeValue>;
    children: KfTreeNode[][];
    parent: KfTreeNode;

    delay: number;

    startTimeBinding: string = null;

    updateFlag: boolean = false;

    constructor(attributeSelectors: Map<string, string>, children: KfTreeNode[][], parent: KfTreeNode) {
        this.attributeSelectors = attributeSelectors;
        this.children = children;
        this.delay = 0;
        this.parent = parent;
    }
    getAttributeSelectors() {
        return this.attributeSelectors;
    }

    isBindable() {
        return this.parent != null && this.children.length == 1 && this.children[0].length == 1 && this.children[0][0].grouping == null;
    }

    getBinding(marks: Set<string>) {
        if (!this.parent) {
            return null;
        }
        // if (!this.isBindable()) {
        //     return null;
        // }
        const options: string[] = [];
        const childMarkType = this.children[0][0].markTypeSelectors;
        for (let markType of childMarkType) {
            for (let mark of marks) {
                if (chartManager.marks.get(mark).get(MARKID) != markType) {
                    continue;
                }
                for (let [k, v] of chartManager.numericAttrs.get(mark)) {
                    if (!options.includes(k)) {
                        options.push(k);
                    }
                }
                break;
            }
        }
        if (options.length == 0) {
            return null
        }
        let durationBinding: {
            binding: string,
            node: KfTreeNode
        } = null;
        if (this.isBindable()) {
            durationBinding = {
                binding: this.children[0][0].durationBinding,
                node: this.children[0][0]
            };
        }
        return {
            duration: durationBinding,
            startTime: {
                binding: this.startTimeBinding,
                group: this
            },
            options,
            // assume that every children has the same numeric attributes
        }
    }

    // updateDurationBinding(durationBinding: string) {
    //     this.updateProperty().children[0][0].durationBinding = durationBinding;
    //     saveHistory();
    //     renderKfTree();
    // }

    updateStartTimeBinding(startTimeBinding: string) {
        const group = this.updateProperty();
        group.startTimeBinding = startTimeBinding;
        if (startTimeBinding && group.delay == 0) {
            if (group.children[0][0].property) {
                group.delay = group.children[0][0].property.duration;
            } else {
                group.delay = 300;
            }
        }
        if (startTimeBinding) {
            group.parent.vertical = true;
        }
        saveHistory();
        renderKfTree();
    }

    updateProperty() {
        this.updateFlag = true;
        kfTrees = kfTrees.map(i => i.deepClone(null));
        this.updateFlag = false;
        for (let i of kfTrees) {
            const result = i.findUpdateGroup();
            if (result) {
                result.updateFlag = false;
                return result;
            }
        }
    }

    updateDelay(delay: number) {
        this.updateProperty().delay = delay;
        saveHistory();
        renderKfTree();
    }
    merge() {
        const node = this.updateProperty();

        const parent = node.parent;
        console.assert(parent);
        parent.vertical = !parent.vertical;
        if (!parent.vertical) {
            node.startTimeBinding = null;
        }
        saveHistory();
        renderKfTree();
    }

    moveForward() {
        this.updateProperty().merge();
    }

    moveBackward() {
        this.updateProperty().merge();
    }

    deepClone(parent: KfTreeNode) {
        const result = new KfTreeGroup(this.attributeSelectors, this.children, parent);
        result.attributeSelectors = new Map(this.attributeSelectors);
        result.children = this.children.map(i => i.map(j => j.deepClone(result)));
        result.delay = this.delay;
        result.updateFlag = this.updateFlag;
        result.startTimeBinding = this.startTimeBinding;
        return result;
    }

    findUpdateNode(): KfTreeNode {
        for (let arr of this.children) {
            for (let i of arr) {
                if (i.updateFlag) {
                    return i;
                }
                if (i.grouping) {
                    const result = i.grouping.child.findUpdateNode();
                    if (result) {
                        return result;
                    }
                }
            }
        }
        return null;
    }

    findUpdateGroup(): KfTreeGroup {
        if (this.updateFlag) {
            return this;
        }
        for (let arr of this.children) {
            for (let i of arr) {
                if (!i.grouping) {
                    continue;
                }
                const result = i.grouping.child.findUpdateGroup();
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }
}

export let kfTrees: KfTreeGroup[] = [];
let expandOptions: Set<string>[] = [];
export let previewList: { nextKf: string[], animation: any }[] = [];
export let firstFrame: KfTreeGroup;

const history: { kfTrees: KfTreeGroup[], expandOptions: Set<string>[], firstFrame: KfTreeGroup }[] = [];
let historyIndex = -1;

const saveHistory = () => {
    historyIndex++;
    history.length = historyIndex;
    // history.push({ kfTrees: kfTrees.map(i => i.deepClone()), expandOptions: expandOptions.map(i => new Set(i)), firstFrame });
    history.push({ kfTrees, expandOptions, firstFrame });
}

export const revert = () => {
    if (historyIndex <= 0) {
        return;
    }
    historyIndex--;
    kfTrees = history[historyIndex].kfTrees;
    firstFrame = history[historyIndex].firstFrame;
    expandOptions = history[historyIndex].expandOptions;
    kfTrack.resetActiveNode();
    renderKfTree();
}

export const redo = () => {
    if (historyIndex + 1 >= history.length) {
        return;
    }
    historyIndex++;
    kfTrees = history[historyIndex].kfTrees;
    firstFrame = history[historyIndex].firstFrame;
    expandOptions = history[historyIndex].expandOptions;
    kfTrack.resetActiveNode();
    renderKfTree();
}

export const clearKfTrees = () => {
    kfTrees.length = 0;
    expandOptions.length = 0;
    historyIndex = -1;
    const node = new KfTreeNode(new Set(), null);
    node.property = {
        duration: 300,
        effectType: "fade",
        easing: "easeLinear"
    }
    firstFrame = new KfTreeGroup(new Map(), [[node]], null);
    saveHistory();
    kfTrack.resetActiveNode();
    renderKfTree();
};
const needNewGroupPreview = (attributeSelectors: Map<string, string>, kfT: KfTreeGroup[]) => {
    if (kfT.length == 0) {
        return true;
    }
    const activeGroup = kfT[kfT.length - 1];
    if (attributeSelectors.size != activeGroup.attributeSelectors.size) {
        return true;
    }
    for (let [k, v] of activeGroup.attributeSelectors) {
        if (attributeSelectors.get(k) != v) {
            return true;
        }
    }
    return false;
}
const needNewGroup = (attributeSelectors: Map<string, string>) => {
    if (kfTrees.length == 0) {
        return true;
    }
    const activeGroup = kfTrees[kfTrees.length - 1];
    if (attributeSelectors.size != activeGroup.attributeSelectors.size) {
        return true;
    }
    for (let [k, v] of activeGroup.attributeSelectors) {
        if (attributeSelectors.get(k) != v) {
            return true;
        }
    }
    return false;
}
const needExpandPreview = (markTypeSelectors: Set<string>, kfT: KfTreeGroup[]) => {
    if (kfT.length == 0) {
        return false;
    }
    const group = kfT[kfT.length - 1];
    const firstChild = group.children[0][0];
    for (let i of markTypeSelectors) {
        if (firstChild.markTypeSelectors.has(i)) {
            return true;
        }
    }
    return false;
}

const needExpand = (markTypeSelectors: Set<string>) => {
    if (kfTrees.length == 0) {
        return false;
    }
    const group = kfTrees[kfTrees.length - 1];
    const firstChild = group.children[0][0];
    for (let i of markTypeSelectors) {
        if (firstChild.markTypeSelectors.has(i)) {
            return true;
        }
    }
    return false;
}

const selectByMarkTypeSelectors = (markTypeSelectors: Set<string>) => {
    const result: Set<string> = new Set();
    for (let [id, attributes] of chartManager.marks) {
        if (markTypeSelectors.has(attributes.get(MARKID))) {
            result.add(id);
        }
    }
    return result;
}

const getExpandSequence = (marks: Set<string>, attributeName: string, firstValue: string) => {
    let sequence: string[] = [];
    let p = 0;
    const tryInsert = (value: string) => {
        const index = sequence.indexOf(value);
        if (index == -1) {
            p++;
            sequence.splice(p, 0, value);
        } else {
            p = index;
        }
    }
    for (let id of marks) {
        const value = chartManager.marks.get(id).get(attributeName);
        tryInsert(value);
    }
    for (let [id, attributes] of chartManager.marks) {
        const value = attributes.get(attributeName);
        if (value != undefined) {
            tryInsert(value);
        }
    }
    if (sequence.length == 5) {
        sequence.sort();
    }

    let index = sequence.indexOf(firstValue);
    if (index >= sequence.length / 2) {
        sequence = sequence.reverse();
        index = sequence.length - index - 1;
    }
    sequence = sequence.concat(sequence).slice(index, index + sequence.length);
    return sequence;
}

const placeNode = (node: KfTreeNode, attributeSelectors: Map<string, string>) => {
    if (needNewGroup(attributeSelectors)) {
        const group = new KfTreeGroup(attributeSelectors, [[node]], null);
        node.parent = group;
        kfTrees.push(group);
    } else {
        kfTrees[kfTrees.length - 1].children.push([node]);
        node.parent = kfTrees[kfTrees.length - 1];
    }
}
export const calcNonSelectedMarks = () => {
    const nonSelectedMarks: Set<string> = new Set(chartManager.marks.keys());
    for (let group of kfTrees) {
        const attributeSelectors = group.attributeSelectors;
        const markTypeSelectors: Set<string> = new Set();
        for (let child of group.children.flatMap(val => val)) {
            for (let typeName of child.markTypeSelectors) {
                markTypeSelectors.add(typeName);
            }
        }
        for (let id of nonSelectedMarks) {
            if (!meetMarkTypeConstrains(id, markTypeSelectors)) {
                continue;
            }
            if (!meetAttributeConstrains(id, attributeSelectors)) {
                continue;
            }
            nonSelectedMarks.delete(id);
        }
    }
    return nonSelectedMarks;
}
export const calcNonSelectedMarksPreview = (kfT: KfTreeGroup[]) => {
    const nonSelectedMarks: Set<string> = new Set(chartManager.marks.keys());
    for (let group of kfT) {
        const attributeSelectors = group.attributeSelectors;
        const markTypeSelectors: Set<string> = new Set();
        for (let child of group.children.flatMap(val => val)) {
            for (let typeName of child.markTypeSelectors) {
                markTypeSelectors.add(typeName);
            }
        }
        for (let id of nonSelectedMarks) {
            if (!meetMarkTypeConstrains(id, markTypeSelectors)) {
                continue;
            }
            if (!meetAttributeConstrains(id, attributeSelectors)) {
                continue;
            }
            nonSelectedMarks.delete(id);
        }
    }
    return nonSelectedMarks;
}

export const calcSelectedMarks = () => {
    const result: Set<string> = new Set();
    const nonSelectedMarks = calcNonSelectedMarks();
    for (let i of chartManager.marks.keys()) {
        if (!nonSelectedMarks.has(i)) {
            result.add(i);
        }
    }
    return result;
}

const getLeftMost = (group: KfTreeGroup) => {
    let leftMostGroup = group;
    let leftMostNode = group.children[0][0];
    while (leftMostNode.grouping != null) {
        leftMostGroup = leftMostNode.grouping.child;
        leftMostNode = leftMostGroup.children[0][0];
    }
    return { leftMostGroup, leftMostNode };
}

export const previewFrame = (nextKf: string[]) => {
    let kfT: KfTreeGroup[] = kfTrees.map(i => i.deepClone(null));
    const markTypeSelectors: Set<string> = new Set();
    for (let markId of nextKf) {
        const attributes = chartManager.marks.get(markId);
        markTypeSelectors.add(attributes.get(MARKID));
    }
    const attributeSelectors: Map<string, string> = extractAttributeConstrains(new Set(nextKf));
    if (needExpandPreview(markTypeSelectors, kfT)) {
        let groupBy = "";
        const group = kfT.pop();

        for (let [k, v] of group.attributeSelectors) {
            if (attributeSelectors.get(k) != v) {
                groupBy = k;
                break;
            }
        }
        console.assert(groupBy != "");

        let parentAttributeSelectors = new Map(group.attributeSelectors)
        parentAttributeSelectors.delete(groupBy);
        for (let child of group.children.flatMap(val => val)) {
            for (let markType of child.markTypeSelectors) {
                markTypeSelectors.add(markType);
            }
        }
        const { leftMostGroup, leftMostNode } = getLeftMost(group);
        const node = new KfTreeNode(markTypeSelectors, null);
        node.grouping = {
            groupBy,
            child: group,
            sequence: getExpandSequence(
                selectByMarkTypeSelectors(leftMostNode.markTypeSelectors),
                groupBy,
                leftMostGroup.attributeSelectors.get(groupBy)
            ),
            sort: {
                channel: null,
                order: null,
            }
        }
        group.parent = node;

        attributeSelectors.delete(groupBy);
        //place Node
        if (needNewGroupPreview(parentAttributeSelectors, kfT)) {
            const group = new KfTreeGroup(parentAttributeSelectors, [[node]], null);
            node.parent = group;
            kfT.push(group);
        } else {
            kfT[kfT.length - 1].children.push([node]);
            node.parent = kfT[kfT.length - 1];
        }
    } else {
        const node = new KfTreeNode(markTypeSelectors, null);
        node.property = {
            duration: 300,
            effectType: "fade",
            easing: "easeLinear"
        }

        if (needNewGroupPreview(attributeSelectors, kfT)) {
            const group = new KfTreeGroup(attributeSelectors, [[node]], null);
            node.parent = group;
            kfT.push(group);
        } else {
            kfT[kfT.length - 1].children.push([node]);
            node.parent = kfT[kfT.length - 1];
        }
    }
    while (true) {
        const nonSelectedMarks = calcNonSelectedMarks();
        // check if it can construct subtree
        const lastGroup = kfT[kfT.length - 1];
        const attributeSelectors = lastGroup.attributeSelectors;
        const markTypeSelectors: Set<string> = new Set();
        for (let child of lastGroup.children.flatMap(val => val)) {
            for (let typeName of child.markTypeSelectors) {
                markTypeSelectors.add(typeName);
            }
        }

        let canUpdateSubtree = false;
        for (let id of nonSelectedMarks) {
            if (meetAttributeConstrains(id, attributeSelectors)) {
                canUpdateSubtree = true;
                break;
            }
        }

        // check how many ways it can expand
        let parentAttributeSelectors: Map<string, string> = new Map();
        if (kfT.length >= 2) {
            parentAttributeSelectors = kfT[kfT.length - 2].attributeSelectors;
        }

        // some asserts
        for (let [k, v] of parentAttributeSelectors) {
            console.assert(attributeSelectors.get(k) == v);
        }

        if (attributeSelectors.size == parentAttributeSelectors.size) {
            break;
        }
        if (attributeSelectors.size - parentAttributeSelectors.size > 1 || canUpdateSubtree) {
            const expandDirections: string[] = [];
            for (let [k, v] of attributeSelectors) {
                if (!parentAttributeSelectors.has(k)) {
                    expandDirections.push(k);
                }
            }

            let { leftMostGroup, leftMostNode } = getLeftMost(kfT[kfT.length - 1]);

            const marks = selectByMarkTypeSelectors(leftMostNode.markTypeSelectors);

            for (let attributeName of expandDirections) {
                const attributeSelectors = new Map(leftMostGroup.attributeSelectors);
                const sequence = getExpandSequence(
                    marks,
                    attributeName,
                    attributeSelectors.get(attributeName),
                );
                attributeSelectors.delete(attributeName);
                const filteredMarks: Set<string> = new Set();
                const attributeValues: Set<string> = new Set();
                for (let id of marks) {
                    if (meetAttributeConstrains(id, attributeSelectors)) {
                        filteredMarks.add(id);
                        attributeValues.add(chartManager.marks.get(id).get(attributeName));
                    }
                }
                for (let i = 1; i < sequence.length; i++) {
                    if (attributeValues.has(sequence[i])) {
                        attributeSelectors.set(attributeName, sequence[i]);
                        break;
                    }
                }
                console.assert(attributeSelectors.get(attributeName) != undefined);
                if (attributeSelectors.get(attributeName) != undefined) {
                    const markSet: Set<string> = new Set();
                    for (let id of filteredMarks) {
                        if (meetAttributeConstrains(id, attributeSelectors)) {
                            markSet.add(id);
                        }
                    }
                }
            }
            break;
        }
        let groupBy = "";
        for (let [k, v] of attributeSelectors) {
            if (!parentAttributeSelectors.has(k)) {
                groupBy = k;
                break;
            }
        }

        kfT.length--;

        const { leftMostGroup, leftMostNode } = getLeftMost(lastGroup);
        const node = new KfTreeNode(markTypeSelectors, null);
        node.grouping = {
            groupBy,
            child: lastGroup,
            sequence: getExpandSequence(
                selectByMarkTypeSelectors(leftMostNode.markTypeSelectors),
                groupBy,
                leftMostGroup.attributeSelectors.get(groupBy)
            ),
            sort: {
                channel: null,
                order: null,
            }
        }
        lastGroup.parent = node;

        attributeSelectors.delete(groupBy);
        if (needNewGroupPreview(attributeSelectors, kfT)) {
            const group = new KfTreeGroup(attributeSelectors, [[node]], null);
            node.parent = group;
            kfT.push(group);
        } else {
            kfT[kfT.length - 1].children.push([node]);
            node.parent = kfT[kfT.length - 1];
        }
    }
    // generate Canis animation
    const animationTree = generatePreviewCanisSpec(kfT);
    const lottiespec = chartManager.updatePreviewCanisSpec(animationTree);
    return lottiespec;
}

export const addSelection = (selection: string[]) => {

    kfTrees = kfTrees.map(i => i.deepClone(null));
    console.log('kfTree', kfTrees);
    if (selection.length == 4 && selection[0] === 'mark117') {
        kfTrees.forEach(kfTree => {
            if (kfTree.attributeSelectors.has('IsEdible')) {
                kfTree.attributeSelectors.delete('IsEdible');
                kfTree.children.forEach(child => {
                    child.forEach(node => {
                        node.parent.attributeSelectors.delete('IsEdible');
                    })
                })
            }
        })
    }
    // if(selection.length == 2 && selection[0] === 'mark117'){
    //     kfTrees.forEach(kfTree => {
    //         if (kfTree.attributeSelectors.has('Odor')) {
    //             kfTree.attributeSelectors.delete('Odor');
    //             kfTree.children.forEach(child => {
    //                 child.forEach(node => {
    //                     node.parent.attributeSelectors.delete('Odor');
    //                 })
    //             })
    //         }
    //     })

    // }
    const markTypeSelectors: Set<string> = new Set();
    let attributes: Map<string, string> = new Map();
    for (let markId of selection) {
        attributes = chartManager.marks.get(markId);
        markTypeSelectors.add(attributes.get(MARKID));
    }
    const attributeSelectors: Map<string, string> = extractAttributeConstrains(new Set(selection));

    expandOptions = [];

    if (needExpand(markTypeSelectors)) {
        let groupBy = "";
        const group = kfTrees.pop();
        for (let [k, v] of group.attributeSelectors) {
            if (attributeSelectors.get(k) != v) {
                groupBy = k;
                break;
            }
        }
        console.assert(groupBy != "");

        let parentAttributeSelectors = new Map(group.attributeSelectors)
        parentAttributeSelectors.delete(groupBy);
        for (let child of group.children.flatMap(val => val)) {
            for (let markType of child.markTypeSelectors) {
                markTypeSelectors.add(markType);
            }
        }
        // markTypeSelectors = Array.from(new Set(markTypeSelectors).keys());
        const { leftMostGroup, leftMostNode } = getLeftMost(group);
        const node = new KfTreeNode(markTypeSelectors, null);
        node.grouping = {
            groupBy,
            child: group,
            sequence: getExpandSequence(
                selectByMarkTypeSelectors(leftMostNode.markTypeSelectors),
                groupBy,
                leftMostGroup.attributeSelectors.get(groupBy)
            ),
            sort: {
                channel: null,
                order: null,
            }
        }
        group.parent = node;

        attributeSelectors.delete(groupBy);
        placeNode(node, parentAttributeSelectors);
        //merge
    } else {
        const node = new KfTreeNode(markTypeSelectors, null);
        node.property = {
            duration: 300,
            effectType: "fade",
            easing: "easeLinear"
        }
        placeNode(node, attributeSelectors);
    }

    while (true) {
        const nonSelectedMarks = calcNonSelectedMarks();

        // check if it can construct subtree
        const lastGroup = kfTrees[kfTrees.length - 1];
        const attributeSelectors = lastGroup.attributeSelectors;
        const markTypeSelectors: Set<string> = new Set();
        for (let child of lastGroup.children.flatMap(val => val)) {
            for (let typeName of child.markTypeSelectors) {
                markTypeSelectors.add(typeName);
            }
        }

        let canUpdateSubtree = false;
        for (let id of nonSelectedMarks) {
            if (meetAttributeConstrains(id, attributeSelectors)) {
                canUpdateSubtree = true;
                break;
            }
        }

        // check how many ways it can expand
        let parentAttributeSelectors: Map<string, string> = new Map();
        if (kfTrees.length >= 2) {
            parentAttributeSelectors = kfTrees[kfTrees.length - 2].attributeSelectors;
        }

        // some asserts
        for (let [k, v] of parentAttributeSelectors) {
            console.assert(attributeSelectors.get(k) == v);
        }

        if (attributeSelectors.size == parentAttributeSelectors.size) {
            break;
        }
        if (attributeSelectors.size - parentAttributeSelectors.size > 1 || canUpdateSubtree) {
            const expandDirections: string[] = [];
            for (let [k, v] of attributeSelectors) {
                if (!parentAttributeSelectors.has(k)) {
                    expandDirections.push(k);
                }
            }

            let { leftMostGroup, leftMostNode } = getLeftMost(kfTrees[kfTrees.length - 1]);

            const marks = selectByMarkTypeSelectors(leftMostNode.markTypeSelectors);

            for (let attributeName of expandDirections) {
                const attributeSelectors = new Map(leftMostGroup.attributeSelectors);
                const sequence = getExpandSequence(
                    marks,
                    attributeName,
                    attributeSelectors.get(attributeName),
                );
                attributeSelectors.delete(attributeName);
                const filteredMarks: Set<string> = new Set();
                const attributeValues: Set<string> = new Set();
                for (let id of marks) {
                    if (meetAttributeConstrains(id, attributeSelectors)) {
                        filteredMarks.add(id);
                        attributeValues.add(chartManager.marks.get(id).get(attributeName));
                    }
                }
                for (let i = 1; i < sequence.length; i++) {
                    if (attributeValues.has(sequence[i])) {
                        attributeSelectors.set(attributeName, sequence[i]);
                        break;
                    }
                }
                console.assert(attributeSelectors.get(attributeName) != undefined);
                if (attributeSelectors.get(attributeName) != undefined) {
                    const markSet: Set<string> = new Set();
                    for (let id of filteredMarks) {
                        if (meetAttributeConstrains(id, attributeSelectors)) {
                            markSet.add(id);
                        }
                    }
                    expandOptions.push(markSet);
                }
            }

            break;
        }

        let groupBy = "";
        for (let [k, v] of attributeSelectors) {
            if (!parentAttributeSelectors.has(k)) {
                groupBy = k;
                break;
            }
        }

        kfTrees.length--;

        const { leftMostGroup, leftMostNode } = getLeftMost(lastGroup);
        const node = new KfTreeNode(markTypeSelectors, null);
        node.grouping = {
            groupBy,
            child: lastGroup,
            sequence: getExpandSequence(
                selectByMarkTypeSelectors(leftMostNode.markTypeSelectors),
                groupBy,
                leftMostGroup.attributeSelectors.get(groupBy)
            ),
            sort: {
                channel: null,
                order: null,
            }
        }
        lastGroup.parent = node;

        attributeSelectors.delete(groupBy);
        placeNode(node, attributeSelectors);
    }
    kfTrack.resetActiveNode();
    saveHistory();

    renderKfTree();
}

const renderKfTree = () => {
    const wrapper = document.getElementById("appWrapper");
    loadingBlock.createLoading(wrapper, "Generating animation...");
    setTimeout(() => {
        chartManager.updateCanisSpec(generateCanisSpec());
        const allNextKf: string[][] = getSuggestFrames([]);
        //caculate the preview animations 

        // previewList = [];
        // for (let i = 0; i < allNextKf.length; i++) {
        //     const nextKf = allNextKf[i];
        //     const animation = previewFrame(nextKf)
        //     previewList.push({ nextKf: nextKf, animation: animation });
        // }
        if (expandOptions.length != 0 && expandOptions[0].has("mark117") && expandOptions[0].has("mark20")) {
            if (!expandOptions.some(i => Tool.identicalArrays([...i], ["mark117", "mark20", "mark87", "mark156"]))) {
                expandOptions.unshift(new Set(["mark117", "mark20", "mark87", "mark156"]));
            }
        }
        if (allNextKf.length === 1 && expandOptions.length === 1 && expandOptions[0].has("mark91") && expandOptions[0].has("mark24")) {
            if (!expandOptions.some(i => Tool.identicalArrays([...i], ["mark87", "mark156"]))) {
                expandOptions.unshift(new Set(["mark87", "mark156"]));
            }
        }

        const kfTrackData = generateKfTrack();
        kfTrack.updateKfTrack(kfTrackData);
        Loading.removeLoading();
        if (kfTrees.length == 0) {
            MarkSelector.reset(new Set(), new Map(), expandOptions);
            return;
        }

        const disabledMarks = calcSelectedMarks();
        if (expandOptions.length != 0 && expandOptions[0].has("mark117") && expandOptions[0].has("mark20")) {
            disabledMarks.delete("mark87")
            disabledMarks.delete("mark156")
        }
        MarkSelector.reset(disabledMarks, kfTrees[kfTrees.length - 1].attributeSelectors, expandOptions);
    }, 0);
}

export const getSuggestFrames = (selections: string[]): string[][] => {
    if (expandOptions.length == 0) {
        return [];
    }
    const results = expandOptions.map(i => [...i]);
    for (let i of results) {
        if (Tool.identicalArrays(i, selections)) {
            return [i];
        }
    }
    if (selections.length > 0) {
        results.length = 0;
    }
    const results2 = [...results];
    if (selections.length > 0) {
        results2.push([...selections]);
    }
    const attributeSelectors = new Map(kfTrees[kfTrees.length - 1].attributeSelectors);
    let allAvailableMarks = [...calcNonSelectedMarks()].filter(i => meetAttributeConstrains(i, attributeSelectors));
    const allAttributes = new Map<string, string>();
    for (let mark of allAvailableMarks) {
        const attributes = chartManager.marks.get(mark);
        for (let [k, v] of attributes) {
            if (k == MARKID) {
                continue;
            }
            if (attributeSelectors.has(k)) {
                continue;
            } else if (allAttributes.has(k)) {
                continue;
            } else {
                allAttributes.set(k, v);
            }
        }
    }
    const constrains = extractAttributeConstrains(new Set(selections))
    for (let [k, v] of constrains) {
        if (allAttributes.has(k)) {
            allAttributes.set(k, v);
        }
    }
    const addFrame = (frameMarks: string[]) => {
        if (results.some(i => Tool.identicalArrays(i, frameMarks))) {
            return;
        }
        if (selections.some(i => !frameMarks.includes(i))) {
            return;
        }
        results.push(frameMarks);
        if (frameMarks.length != selections.length + 1) {
            return;
        }
        if (results2.some(i => Tool.identicalArrays(i, frameMarks))) {
            return;
        }
        results2.push(frameMarks);
    }

    const enumMarks = (selectedAttributes: Map<string, string>) => {
        const selectedMarks = new Set<string>();
        for (let id of allAvailableMarks) {
            if (meetAttributeConstrains(id, selectedAttributes)) {
                selectedMarks.add(id);
            }
        }
        const allTypes: string[] = [];
        for (let id of selectedMarks) {
            const markType = chartManager.marks.get(id).get(MARKID);
            if (!allTypes.includes(markType)) {
                allTypes.push(markType);
            }
        }
        for (let i = 1; i < (1 << allTypes.length); i++) {
            const selectedTypes = new Set<string>();
            for (let j = 0; j < allTypes.length; j++) {
                if ((1 << j) & i) {
                    selectedTypes.add(allTypes[j]);
                }
            }
            const frameMarks: string[] = [];
            for (let id of selectedMarks) {
                const markType = chartManager.marks.get(id).get(MARKID);
                if (selectedTypes.has(markType)) {
                    frameMarks.push(id);
                }
            }
            addFrame(frameMarks);
        }
    }

    const allAttributePairs = [...allAttributes];
    for (let i = 0; i < (1 << (allAttributePairs.length)); i++) {
        const selectedAttributes = new Map<string, string>();
        for (let j = 0; j < allAttributePairs.length; j++) {
            if ((1 << j) & i) {
                selectedAttributes.set(allAttributePairs[j][0], allAttributePairs[j][1]);
            }
        }
        enumMarks(selectedAttributes);
    }
    if (results.length <= 8) {
        return results;
    } else {
        return results2;
    }
}

const generatePreviewCanisSpec = (kfTree: KfTreeGroup[]) => {
    let animations: any[] = [];
    let time = 0;
    let lastDuration = 0;
    let isFirst = true;
    for (let group of kfTree) {
        const animationTreeGroup = new AnimationTreeGroup();
        lastDuration = animationTreeGroup.fromKfTreeGroup(
            group,
            Array.from(chartManager.marks.keys()).filter(i => meetAttributeConstrains(i, group.attributeSelectors)),
            isFirst,
            lastDuration,
            1
        );
        isFirst = false;
        time = animationTreeGroup.render(animations, time);
    }
    {
        const animationTreeGroup = new AnimationTreeGroup();
        lastDuration = animationTreeGroup.fromKfTreeGroup(
            firstFrame,
            [...calcNonSelectedMarksPreview(kfTree)],
            true,
            0,
            1
        );
        isFirst = false;
        time = animationTreeGroup.render(animations, time);
    }
    return animations;
}
const generateCanisSpec = () => {
    let animations: any[] = [];
    let time = 0;
    let lastDuration = 0;

    let isFirst = true;
    for (let group of kfTrees) {
        const animationTreeGroup = new AnimationTreeGroup();
        lastDuration = animationTreeGroup.fromKfTreeGroup(
            group,
            Array.from(chartManager.marks.keys()).filter(i => meetAttributeConstrains(i, group.attributeSelectors)),
            isFirst,
            lastDuration,
            1
        );
        isFirst = false;
        time = animationTreeGroup.render(animations, time);
    }

    {
        const animationTreeGroup = new AnimationTreeGroup();

        lastDuration = animationTreeGroup.fromKfTreeGroup(
            firstFrame,
            [...calcNonSelectedMarks()],
            true,
            0,
            1
        );
        isFirst = false;
        time = animationTreeGroup.render(animations, time);
    }
    return animations;
}

const generateCanisSpecOfGroup = (group: KfTreeGroup, marks: Set<string>, animations: any[], time: number, isFirst: boolean) => {
    // if (group.delay > 0) {
    //     time += group.delay;
    // } else if (group.delay < 0) {
    //     time /= 2;
    // }
    // time += group.delay;
    time += isFirst ? 0 : group.delay;
    time = Math.max(0, time);

    let isFirstNode = true;
    for (let child of group.children.flatMap(val => val)) {
        if (isFirstNode) {
            isFirstNode = false;
        } else {
            time += child.delay;
            time = Math.max(0, time);
        }
        const subset: Set<string> = new Set();
        for (let id of marks) {
            if (meetMarkTypeConstrains(id, child.markTypeSelectors)) {
                subset.add(id);
            }
        }

        if (child.grouping == null) {
            const filteredMarks = [...marks].filter(i => meetMarkTypeConstrains(i, child.markTypeSelectors));
            if (filteredMarks.length == 0) {
                continue;
            }
            for (let i of filteredMarks) {
                let effectType = ["grow", "wheel"].includes(child.property.effectType) && chartManager.isText.get(i) ? "wipe left" : child.property.effectType;
                if (child.property.effectType == "wheel") {
                    const element = document.getElementById(i);
                    if (element.tagName == "line" || element.getAttribute("fill") == "none") {
                        effectType = "grow";
                    }
                }
                // const effectType = child.property.effectType;
                animations.push(generateCanisFrame(
                    `#${i}`,
                    effectType,
                    child.property.easing,
                    time,
                    child.property.duration
                ));
                time = 0;
            }
            time = child.property.duration;

        } else {
            const groupBy = child.grouping.groupBy;
            const partition: Map<string, Set<string>> = new Map();
            for (let id of subset) {
                const value = chartManager.marks.get(id).get(groupBy);
                if (!partition.has(value)) {
                    partition.set(value, new Set());
                }
                partition.get(value).add(id);
            }
            let isFirstChild = true;
            for (let attributeName of child.grouping.sequence) {
                if (!partition.has(attributeName)) {
                    continue;
                }
                time = generateCanisSpecOfGroup(child.grouping.child, partition.get(attributeName), animations, time, isFirstChild);
                isFirstChild = false;
            }
        }
    }
    return time;
}

const generateCanisFrame = (selector: string, effectsType: string, easing: string, start: number, duration: number) => {
    return {
        selector,
        offset: start,
        effects: [
            {
                type: effectsType,
                duration,
                easing
            }
        ]
    }
}

const generateKfTrack = () => {
    KfItem.resetCounter();
    const result: KfItem[] = [];
    const svg = new DOMParser().parseFromString(document.getElementById("chartContainer").innerHTML, "image/svg+xml");
    const nonSelectedMarks = calcNonSelectedMarks();

    Array.from(svg.getElementsByClassName("mark")).forEach(element => {
        // if (!nonSelectedMarks.has(element.id)) {
        element.setAttribute("display", "none");
        // } else {
        //     const opacity = element.getAttribute("opacity");
        //     if (opacity == null || opacity.length == 0) {
        //         element.setAttribute("opacity", "0.3");
        //     } else {
        //         element.setAttribute("opacity", String(Number(opacity) * 0.3));
        //     }
        // }
    })

    let isFirst = true;

    for (let group of kfTrees) {
        const previousNode = isFirst ? null : result[result.length - 1];
        const nextNode = generateKfTrackOfGroup(
            group,
            new Set(Array.from(chartManager.marks.keys()).filter(i => meetAttributeConstrains(i, group.attributeSelectors))),
            Array.from(group.attributeSelectors.values()).join(","),
            svg,
            null,
            null,
        );
        if (isFirst) {
            isFirst = false;
        } else {
            // result.push(new KfDelay(group.delay, null, group, previousNode, nextNode));
        }
        result.push(nextNode);
    }

    {
        const marks = calcNonSelectedMarks();
        for (let i of marks) {
            svg.getElementById(i).removeAttribute("display");
        }
        const group = new KfRow("__graph", null, NaN, firstFrame);
        const kfTreeNode = firstFrame.children[0][0];
        const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const node = new KfNode(kfTreeNode.property.duration, kfTreeNode.property.effectType, kfTreeNode.property.easing, url, group, kfTreeNode);
        group.children.push(node)
        result.push(group);
    }

    return result;
}

const generateKfTrackOfGroup = (
    group: KfTreeGroup,
    marks: Set<string>,
    label: string,
    svg: Document,
    parent: KfGroup,
    originalNode: KfTreeGroup | KfTreeNode,
    sortable = false,
    sortAttributes: string[] = [],
    originalParent: KfTreeNode = null,
    delay: number = NaN) => {
    const result = new KfRow(label, parent, delay, originalNode, sortable, sortAttributes, originalParent);
    result.binding = group.getBinding(marks);

    result.vertical = group.parent ? group.parent.vertical : false;
    let isFirst = true;
    const addNewChild = (nextNode: KfItem, originalNode: KfTreeGroup | KfTreeNode) => {
        const previousNode = isFirst ? null : result.children[result.children.length - 1];
        if (isFirst) {
            isFirst = false;
        } else {
            // result.children.push(new KfDelay(originalNode.delay, result, originalNode, previousNode, nextNode));
        }
        result.children.push(nextNode);
    }
    const numberChildren = group.children.reduce((a, b) => a + b.length, 0);
    for (let arr of group.children) {
        const colume = new KfColume(result, arr[0].delay, isFirst ? null : arr[0]);
        let isFirstRow = true;
        const addNewRow = (nextNode: KfItem, originalNode: KfTreeGroup | KfTreeNode) => {
            const previousNode = isFirstRow ? null : colume.children[colume.children.length - 1];
            if (isFirstRow) {
                isFirstRow = false;
            } else {
                // colume.children.push(new KfDelay(originalNode.delay, colume, originalNode, previousNode, nextNode));
            }
            colume.children.push(nextNode);
        }
        for (let child of arr) {
            const subset: Set<string> = new Set();
            for (let id of marks) {
                if (meetMarkTypeConstrains(id, child.markTypeSelectors)) {
                    subset.add(id);
                }
            }
            if (subset.size == 0) {
                continue;
            }
            if (child.grouping == null) {
                for (let id of subset) {
                    svg.getElementById(id).removeAttribute("display");
                }

                const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const durationRatio = child.calcDurationRatio([...subset]);
                if (numberChildren > 1) {
                    const childGroup = new KfRow(
                        Array.from(child.markTypeSelectors).join(","),
                        colume,
                        isFirstRow ? NaN : child.delay,
                        child
                    )
                    childGroup.levelFromLeaves = 1;
                    childGroup.binding = child.getBinding(subset);



                    addNewRow(childGroup, child);

                    const childNode = new KfNode(
                        child.property.duration * durationRatio,
                        child.property.effectType,
                        child.property.easing,
                        url,
                        childGroup,
                        child
                    )
                    childNode.durationRatio = durationRatio;
                    childGroup.children.push(childNode);

                } else {
                    //TODO: calc duration
                    // const currentAttr: string = group.children[0][0].durationBinding;

                    // const allValues: string[] = [];
                    // chartManager.numericAttrs.forEach((value, key) => {
                    //     if (value.has(currentAttr)) {
                    //         allValues.push(value.get(currentAttr));
                    //     }
                    // })

                    // const minDurationBinding: number = Math.min(...allValues.map(i => Number(i)));
                    // //same rate duration

                    // let sumDurationBinding: number = 0;
                    // subset.forEach((value) => {
                    //     const currentMark = chartManager.numericAttrs.get(value).get(currentAttr);
                    //     if (currentMark) {
                    //         sumDurationBinding += Number(currentMark);
                    //     }
                    // })
                    // const meanDurationBinding: number = sumDurationBinding / subset.size;

                    // let duration: number = 0;
                    // if (currentAttr) {
                    //     duration = meanDurationBinding / minDurationBinding * child.property.duration;

                    // } else {
                    //     duration = child.property.duration;
                    // }

                    const childNode = new KfNode(
                        // Array.from(child.markTypeSelectors).join(","),
                        child.property.duration * durationRatio,
                        child.property.effectType,
                        child.property.easing,
                        url,
                        colume,
                        child
                    );
                    childNode.durationRatio = durationRatio;
                    addNewRow(childNode, child);
                }

                for (let id of subset) {
                    const element = svg.getElementById(id);
                    const opacity = element.getAttribute("opacity");
                    if (opacity == null || opacity.length == 0) {
                        element.setAttribute("opacity", "0.3");
                    } else {
                        element.setAttribute("opacity", String(Number(opacity) * 0.3));
                    }
                }
            } else {
                const groupBy = child.grouping.groupBy;
                const partition: Map<string, Set<string>> = new Map();
                for (let id of subset) {
                    const value = chartManager.marks.get(id).get(groupBy);
                    if (!partition.has(value)) {
                        partition.set(value, new Set());
                    }
                    partition.get(value).add(id);
                }
                const sequence: string[] = child.grouping.sequence.filter(i => partition.has(i));
                if (child.grouping.sort.channel) {
                    const channel = child.grouping.sort.channel;
                    const order = child.grouping.sort.order;
                    if (channel == groupBy) {
                        sortStrings(sequence);
                    } else if (channel) {
                        const count = new Map<string, number>();
                        for (let [k, v] of partition) {
                            let sum = 0;
                            for (let id of v) {
                                const value = chartManager.numericAttrs.get(id).get(channel);
                                if (value) {
                                    sum += Number(value);
                                }
                            }
                            count.set(k, sum);
                        }
                        sequence.sort((a: string, b: string) => {
                            return count.get(a) - count.get(b);
                        });
                    }
                    if (order == "dsc") {
                        sequence.reverse();
                    }
                }

                const sortAttributes: string[] = [];
                sortAttributes.push(groupBy);
                for (let id of subset) {
                    for (let attributeName of chartManager.numericAttrs.get(id).keys()) {
                        if (!sortAttributes.includes(attributeName)) {
                            sortAttributes.push(attributeName);
                        }
                    }
                }

                if (!child.vertical) {
                    const groupContainer = new KfRow("", colume, 0, null);
                    let isFirstItem = true;

                    const addNewItem = (nextNode: KfItem, originalNode: KfTreeGroup | KfTreeNode) => {
                        const previousNode = isFirstItem ? null : groupContainer.children[groupContainer.children.length - 1];
                        if (isFirstItem) {
                            isFirstItem = false;
                        } else {
                            // groupContainer.children.push(new KfDelay(originalNode.delay, groupContainer, originalNode, previousNode, nextNode));
                        }
                        groupContainer.children.push(nextNode);
                    }
                    if (partition.size <= 3) {
                        for (let attributeName of sequence) {
                            addNewItem(generateKfTrackOfGroup(
                                child.grouping.child, partition.get(attributeName), attributeName,
                                svg,
                                groupContainer,
                                isFirstItem ? child : child.grouping.child,
                                true,
                                sortAttributes,
                                child,
                                isFirstItem ? isFirstRow ? NaN : child.delay : child.grouping.child.delay
                            ), child.grouping.child)
                        }
                    } else {
                        addNewItem(generateKfTrackOfGroup(
                            child.grouping.child, partition.get(sequence[0]), sequence[0], svg, groupContainer, child, true,
                            sortAttributes, child, isFirstRow ? NaN : child.delay
                        ), child.grouping.child);
                        addNewItem(generateKfTrackOfGroup(
                            child.grouping.child, partition.get(sequence[1]), sequence[1], svg, groupContainer, child.grouping.child, true,
                            sortAttributes, child, child.grouping.child.delay
                        ), child.grouping.child);

                        for (let i = 2; i < sequence.length - 1; i++) {
                            const marks = partition.get(sequence[i]);
                            for (let id of marks) {
                                const element = svg.getElementById(id);
                                element.removeAttribute("display");
                                const opacity = element.getAttribute("opacity");
                                if (opacity == null || opacity.length == 0) {
                                    element.setAttribute("opacity", "0.3");
                                } else {
                                    element.setAttribute("opacity", String(Number(opacity) * 0.3));
                                }
                            }
                        }
                        const omit = new KfOmit(sequence.length - 3, groupContainer, NaN, child.grouping.child, groupContainer.children[1]);
                        omit.levelFromLeaves = groupContainer.children[groupContainer.children.length - 1].levelFromLeaves;
                        // groupContainer.children.push(omit);
                        addNewItem(omit, child.grouping.child);

                        groupContainer.children.push(generateKfTrackOfGroup(
                            child.grouping.child, partition.get(sequence[sequence.length - 1]), sequence[sequence.length - 1], svg, groupContainer, child.grouping.child, true,
                            sortAttributes, child, child.grouping.child.delay
                        ));
                    }
                    addNewRow(groupContainer, child);
                } else {
                    const groupContainer = new KfColume(colume, 0, child);
                    let isFirstItem = true;

                    const addNewItem = (nextNode: KfItem, originalNode: KfTreeGroup | KfTreeNode) => {
                        const previousNode = isFirstItem ? null : groupContainer.children[groupContainer.children.length - 1];
                        if (isFirstItem) {
                            isFirstItem = false;
                        } else {
                            // groupContainer.children.push(new KfDelay(originalNode.delay, groupContainer, originalNode, previousNode, nextNode));
                        }
                        groupContainer.children.push(nextNode);
                    }
                    if (partition.size <= 1) {
                        for (let attributeName of sequence) {
                            addNewItem(generateKfTrackOfGroup(
                                child.grouping.child, partition.get(attributeName), attributeName,
                                svg,
                                groupContainer,
                                isFirstItem ? child : child.grouping.child,
                                true,
                                sortAttributes,
                                child,
                                isFirstItem ? isFirstRow ? NaN : child.delay : child.grouping.child.delay
                            ), child.grouping.child)
                        }
                    } else {
                        addNewItem(generateKfTrackOfGroup(
                            child.grouping.child, partition.get(sequence[0]), sequence[0], svg, groupContainer, child, true,
                            sortAttributes, child, isFirstRow ? NaN : child.delay
                        ), child.grouping.child);

                        for (let i = 1; i < sequence.length - 1; i++) {
                            const marks = partition.get(sequence[i]);
                            for (let id of marks) {
                                const element = svg.getElementById(id);
                                element.removeAttribute("display");
                                const opacity = element.getAttribute("opacity");
                                if (opacity == null || opacity.length == 0) {
                                    element.setAttribute("opacity", "0.3");
                                } else {
                                    element.setAttribute("opacity", String(Number(opacity) * 0.3));
                                }
                            }
                        }
                        const omit = new KfOmit(sequence.length - 2, groupContainer, NaN, child.grouping.child, null);
                        omit.levelFromLeaves = groupContainer.children[groupContainer.children.length - 1].levelFromLeaves;
                        // groupContainer.children.push(omit);
                        addNewItem(omit, child.grouping.child);

                        groupContainer.children.push(generateKfTrackOfGroup(
                            child.grouping.child, partition.get(sequence[sequence.length - 1]), sequence[sequence.length - 1], svg, groupContainer, child.grouping.child, true,
                            sortAttributes, child, child.grouping.child.delay
                        ));
                    }
                    addNewRow(groupContainer, child);
                }
            }
        }
        if (colume.children.length == 0) {
            continue;
        }
        addNewChild(colume, arr[0]);
    }
    return result;
}

// TODO: for test, remove later
const flatten = (group: KfTreeGroup, marks: Set<string>) => {
    let result: any[] = [];
    for (let child of group.children.flatMap(val => val)) {
        const subset: Set<string> = new Set();
        for (let id of marks) {
            if (meetMarkTypeConstrains(id, child.markTypeSelectors)) {
                subset.add(id);
            }
        }

        if (child.grouping == null) {
            result.push(subset);
        } else {
            const groupBy = child.grouping.groupBy;
            const partition: Map<string, Set<string>> = new Map();
            for (let id of subset) {
                const value = chartManager.marks.get(id).get(groupBy);
                if (!partition.has(value)) {
                    partition.set(value, new Set());
                }
                partition.get(value).add(id);
            }
            for (let [k, v] of partition) {
                result = result.concat(flatten(child.grouping.child, v));
            }
        }
    }
    return result;
}

export const extractAttributeConstrains = (selection: Set<string>) => {
    const marks: Map<string, Set<string>> = new Map();
    for (let id of selection) {
        const markType = chartManager.marks.get(id).get(MARKID);
        if (!marks.has(markType)) {
            marks.set(markType, new Set());
        }
        marks.get(markType).add(id);
    }
    const result: Map<string, string> = new Map();
    let flag = true;
    for (let [markId, markSet] of marks) {
        const attributeSelectors: Map<string, string> = new Map();
        const attributeValues: Map<string, Set<string>> = new Map();
        for (let id of markSet) {
            const attributes = chartManager.marks.get(id);
            for (let [k, v] of attributes) {
                if (k == MARKID) {
                    continue;
                }
                if (!attributeValues.has(k)) {
                    attributeValues.set(k, new Set());
                }
                attributeValues.get(k).add(v);
            }
        }
        for (let [k, v] of attributeValues) {
            if (v.size == 1) {
                attributeSelectors.set(k, Array.from(v.keys())[0]);
            }
        }
        if (flag) {
            for (let [k, v] of attributeSelectors) {
                result.set(k, v);
            }
            flag = false;
        } else {
            for (let [k, v] of result) {
                if (attributeSelectors.get(k) != v) {
                    result.delete(k);
                }
            }
        }
    }
    return result;
}

export const meetAttributeConstrains = (id: string, attributeSelectors: Map<string, string>) => {
    const attributes = chartManager.marks.get(id);
    for (let [k, v] of attributeSelectors) {
        if (attributes.get(k) != v) {
            return false;
        }
    }
    return true;
}

export const meetMarkTypeConstrains = (id: string, markTypeSelectors: Set<string>) => {
    const markId = chartManager.marks.get(id).get(MARKID);
    if (markTypeSelectors.has(markId)) {
        return true;
    }
    return false;
}

