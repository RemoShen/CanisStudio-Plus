import { sort } from "d3";
import { AnimationTreeGroup } from "./animationTree";
import { chartManager, MARKID } from "./chartManager";
import { KfItem, KfGroup, KfNode, KfOmit, kfTrack, KfDelay } from "./kfTrack";
import { MarkSelector } from "./markSelector";
type MarkType = string;
type AttributeName = string;
type AttributeValue = string;

export class KfTreeNode {
    markTypeSelectors: Set<MarkType>;

    grouping: null | {
        child: KfTreeGroup;
        groupBy: AttributeName;
        sequence: AttributeValue[];
    }

    property: null | {
        duration: number;
        effectType: string;
        easing: string;
    }

    delay: number;

    updateFlag: boolean = false;

    constructor(markTypeSelectors: Set<MarkType>) {
        this.markTypeSelectors = markTypeSelectors;
        this.grouping = null;
        this.property = null;
        this.delay = 0;
    }

    updateProperty() {
        this.updateFlag = true;
        kfTrees = kfTrees.map(i => i.deepClone());
        this.updateFlag = false;
        for (let i of kfTrees) {
            const result = i.findUpdateNode();
            if (result) {
                result.updateFlag = false;
                return result;
            }
        }
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

    deepClone() {
        const result = new KfTreeNode(this.markTypeSelectors);
        result.delay = this.delay;
        result.updateFlag = this.updateFlag;
        if (this.grouping) {
            result.grouping = {
                groupBy: this.grouping.groupBy,
                child: this.grouping.child.deepClone(),
                sequence: Array.from(this.grouping.sequence)
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
    children: KfTreeNode[];

    delay: number;

    updateFlag: boolean = false;

    constructor(attributeSelectors: Map<string, string>, children: KfTreeNode[]) {
        this.attributeSelectors = attributeSelectors;
        this.children = children;
        this.delay = 0;
    }

    updateProperty() {
        this.updateFlag = true;
        kfTrees = kfTrees.map(i => i.deepClone());
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

    deepClone() {
        const result = new KfTreeGroup(this.attributeSelectors, this.children);
        result.children = this.children.map(i => i.deepClone());
        result.delay = this.delay;
        result.updateFlag = this.updateFlag;
        return result;
    }

    findUpdateNode(): KfTreeNode {
        for (let i of this.children) {
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
        return null;
    }

    findUpdateGroup(): KfTreeGroup {
        if (this.updateFlag) {
            return this;
        }
        for (let i of this.children) {
            if (!i.grouping) {
                continue;
            }
            const result = i.grouping.child.findUpdateGroup();
            if (result) {
                return result;
            }
        }
        return null;
    }
}

let kfTrees: KfTreeGroup[] = [];
let expandOptions: Set<string>[] = [];

const history: { kfTrees: KfTreeGroup[], expandOptions: Set<string>[] }[] = [];
let historyIndex = -1;

const saveHistory = () => {
    historyIndex++;
    history.length = historyIndex;
    // history.push({ kfTrees: kfTrees.map(i => i.deepClone()), expandOptions: expandOptions.map(i => new Set(i)) });
    history.push({ kfTrees, expandOptions });
}

export const revert = () => {
    if (historyIndex <= 0) {
        return;
    }
    historyIndex--;
    kfTrees = history[historyIndex].kfTrees;
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
    expandOptions = history[historyIndex].expandOptions;
    kfTrack.resetActiveNode();
    renderKfTree();
}

export const clearKfTrees = () => {
    kfTrees.length = 0;
    expandOptions.length = 0;
    historyIndex = -1;
    saveHistory();
    kfTrack.resetActiveNode();
    renderKfTree();
};

const needNewGroup = (attributeSelectors: Map<string, string>) => {
    if (kfTrees.length == 0) {
        return true;
    }
    const activeGroup = kfTrees[kfTrees.length - 1];
    if (activeGroup.attributeSelectors.size == 0) {
        return true;
    }
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

const needExpand = (markTypeSelectors: Set<string>) => {
    if (kfTrees.length == 0) {
        return false;
    }
    const group = kfTrees[kfTrees.length - 1];
    const firstChild = group.children[0];
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
        const group = new KfTreeGroup(attributeSelectors, [node]);
        kfTrees.push(group);
    } else {
        kfTrees[kfTrees.length - 1].children.push(node);
    }
}

const calcNonSelectedMarks = () => {
    const nonSelectedMarks: Set<string> = new Set(chartManager.marks.keys());
    for (let group of kfTrees) {
        const attributeSelectors = group.attributeSelectors;
        const markTypeSelectors: Set<string> = new Set();
        for (let child of group.children) {
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

const calcSelectedMarks = () => {
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
    let leftMostNode = group.children[0];
    while (leftMostNode.grouping != null) {
        leftMostGroup = leftMostNode.grouping.child;
        leftMostNode = leftMostGroup.children[0];
    }
    return { leftMostGroup, leftMostNode };
}


export const addSelection = (selection: string[]) => {
    kfTrees = kfTrees.map(i => i.deepClone());
    const markTypeSelectors: Set<string> = new Set();
    for (let markId of selection) {
        const attributes = chartManager.marks.get(markId);
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
        for (let child of group.children) {
            for (let markType of child.markTypeSelectors) {
                markTypeSelectors.add(markType);
            }
        }
        // markTypeSelectors = Array.from(new Set(markTypeSelectors).keys());
        const { leftMostGroup, leftMostNode } = getLeftMost(group);
        const node = new KfTreeNode(markTypeSelectors);
        node.grouping = {
            groupBy,
            child: group,
            sequence: getExpandSequence(
                selectByMarkTypeSelectors(leftMostNode.markTypeSelectors),
                groupBy,
                leftMostGroup.attributeSelectors.get(groupBy)
            ),
        }

        attributeSelectors.delete(groupBy);
        placeNode(node, parentAttributeSelectors);
        console.log(kfTrees);
    } else {
        const node = new KfTreeNode(markTypeSelectors);
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
        for (let child of lastGroup.children) {
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
                const markSet: Set<string> = new Set();
                for (let id of filteredMarks) {
                    if (meetAttributeConstrains(id, attributeSelectors)) {
                        markSet.add(id);
                    }
                }
                expandOptions.push(markSet);
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
        const node = new KfTreeNode(markTypeSelectors);
        node.grouping = {
            groupBy,
            child: lastGroup,
            sequence: getExpandSequence(
                selectByMarkTypeSelectors(leftMostNode.markTypeSelectors),
                groupBy,
                leftMostGroup.attributeSelectors.get(groupBy)
            ),
        }

        attributeSelectors.delete(groupBy);
        placeNode(node, attributeSelectors);
    }

    kfTrack.resetActiveNode();
    saveHistory();
    renderKfTree();

    // TODO: for test, remove later
    // for (let group of kfTrees) {
    //     flatten(group, new Set(Array.from(chartManager.markTable.keys()).filter(i => meetAttributeConstrains(i, group.attributeSelectors))));
    // }
    // console.log("################");
}

const renderKfTree = () => {
    chartManager.updateCanisSpec(generateCanisSpec());
    kfTrack.updateKfTrack(generateKfTrack());

    if (kfTrees.length == 0) {
        MarkSelector.reset(new Set(), new Map(), expandOptions);
        return;
    }
    const disabledMarks = calcSelectedMarks();
    MarkSelector.reset(disabledMarks, kfTrees[kfTrees.length - 1].attributeSelectors, expandOptions);
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
            lastDuration
        );
        isFirst = false;
        time = animationTreeGroup.render(animations, time);
    }

    // for (let group of kfTrees) {
    //     time = generateCanisSpecOfGroup(
    //         group,
    //         new Set(Array.from(chartManager.marks.keys()).filter(i => meetAttributeConstrains(i, group.attributeSelectors))),
    //         animations,
    //         time,
    //         isFirst
    //     );
    //     isFirst = false;
    // }
    // // console.log(JSON.stringify(animations));
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
    for (let child of group.children) {
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
            null
        );
        if (isFirst) {
            isFirst = false;
        } else {
            result.push(new KfDelay(group.delay, null, group, previousNode, nextNode));
        }
        result.push(nextNode);
    }
    return result;
}

const generateKfTrackOfGroup = (group: KfTreeGroup, marks: Set<string>, label: string, svg: Document, parent: KfGroup, sortable = false, sortAttributes: string[] = []) => {
    const result = new KfGroup(label, parent, sortable, sortAttributes);
    let isFirst = true;
    const addNewChild = (nextNode: KfItem, originalNode: KfTreeGroup | KfTreeNode) => {
        const previousNode = isFirst ? null : result.children[result.children.length - 1];
        if (isFirst) {
            isFirst = false;
        } else {
            result.children.push(new KfDelay(originalNode.delay, result, originalNode, previousNode, nextNode));
        }
        result.children.push(nextNode);
    }
    for (let child of group.children) {
        const subset: Set<string> = new Set();
        for (let id of marks) {
            if (meetMarkTypeConstrains(id, child.markTypeSelectors)) {
                subset.add(id);
            }
        }

        if (child.grouping == null) {
            if (subset.size == 0) {
                continue;
            }
            for (let id of subset) {
                svg.getElementById(id).removeAttribute("display");
            }

            const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            // TODO: delete blob?

            if (group.children.length > 1) {
                const childGroup = new KfGroup(
                    Array.from(child.markTypeSelectors).join(","),
                    result
                )
                childGroup.levelFromLeaves = 1;
                addNewChild(childGroup, child);
                childGroup.children.push(new KfNode(
                    child.property.duration,
                    child.property.effectType,
                    child.property.easing,
                    url,
                    childGroup,
                    child
                ))
            } else {
                addNewChild(new KfNode(
                    // Array.from(child.markTypeSelectors).join(","),
                    child.property.duration,
                    child.property.effectType,
                    child.property.easing,
                    url,
                    result,
                    child
                ), child);
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

            const sortAttributes: string[] = [];
            sortAttributes.push(groupBy);
            for (let id of subset) {
                for (let attributeName of chartManager.numericAttrs.get(id).keys()) {
                    if (!sortAttributes.includes(attributeName)) {
                        sortAttributes.push(attributeName);
                    }
                }
            }

            if (partition.size <= 3) {
                let isFirstChild = true;
                for (let attributeName of child.grouping.sequence) {
                    if (!partition.has(attributeName)) {
                        continue;
                    }
                    const originalNode = isFirstChild ? child : child.grouping.child;
                    isFirstChild = false;
                    addNewChild(generateKfTrackOfGroup(
                        child.grouping.child, partition.get(attributeName), attributeName,
                        svg,
                        result,
                        true,
                        sortAttributes,
                    ), originalNode)
                }
            } else {
                let keys = child.grouping.sequence.filter(i => partition.has(i));
                addNewChild(generateKfTrackOfGroup(
                    child.grouping.child, partition.get(keys[0]), keys[0], svg, result, true,
                    sortAttributes,
                ), child);
                addNewChild(generateKfTrackOfGroup(
                    child.grouping.child, partition.get(keys[1]), keys[1], svg, result, true,
                    sortAttributes,
                ), child.grouping.child);

                for (let i = 2; i < keys.length - 1; i++) {
                    const marks = partition.get(keys[i]);
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
                const omit = new KfOmit(keys.length - 3, result);
                omit.levelFromLeaves = result.children[result.children.length - 1].levelFromLeaves;
                // result.children.push(omit);
                addNewChild(omit, child.grouping.child);

                result.children.push(generateKfTrackOfGroup(
                    child.grouping.child, partition.get(keys[keys.length - 1]), keys[keys.length - 1], svg, result, true,
                    sortAttributes,
                ));
            }
        }
    }
    for (let i of result.children) {
        result.levelFromLeaves = Math.max(i.levelFromLeaves + 1, result.levelFromLeaves);
    }
    return result;
}

// TODO: for test, remove later
const flatten = (group: KfTreeGroup, marks: Set<string>) => {
    let result: any[] = [];
    for (let child of group.children) {
        const subset: Set<string> = new Set();
        for (let id of marks) {
            if (meetMarkTypeConstrains(id, child.markTypeSelectors)) {
                subset.add(id);
            }
        }

        if (child.grouping == null) {
            result.push(subset);
            console.log("----------------");
            for (let id of subset) {
                console.log(document.getElementById(id));
            }
            console.log("----------------");
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
