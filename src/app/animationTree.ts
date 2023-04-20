import { forIn } from "lodash";
import { chartManager } from "./chartManager";
import { KfTreeGroup, KfTreeNode, meetAttributeConstrains, meetMarkTypeConstrains } from "./kfTree";
import { sortStrings } from "./sortUtil";

class AnimationTreeItem {
    delay: number;
    render(animations: any[], time: number) {
        return time;
    }
}

export class AnimationTreeGroup extends AnimationTreeItem {
    children: AnimationTreeItem[][] = [];

    fromKfTreeGroup(kfGroup: KfTreeGroup, marks: string[], isFirst: boolean, lastDuration: number) {
        const delay = isFirst ? 0 : kfGroup.delay;
        this.delay = Math.max(-lastDuration, delay);
        let isFirstNode = true;
        for (let arr of kfGroup.children) {
            let col = [];
            for (let child of arr) {
                if (child.grouping == null) {
                    const childNode = new AnimationTreeNode();
                    lastDuration = childNode.fromKfTreeNode(child, marks, isFirstNode, lastDuration);
                    col.push(childNode);
                } else {
                    const childGroup = new AnimationTreeGroup();
                    lastDuration = childGroup.fromKfTreeNode(child, marks, isFirstNode, lastDuration);
                    col.push(childGroup);
                }
                isFirstNode = false;
            }
            this.children.push(col);
        }
        // for (let child of kfGroup.children.flatMap(val => val)) {
        //     if (child.grouping == null) {
        //         const childNode = new AnimationTreeNode();
        //         lastDuration = childNode.fromKfTreeNode(child, marks, isFirstNode, lastDuration);
        //         this.children.push(childNode);
        //     } else {
        //         const childGroup = new AnimationTreeGroup();
        //         lastDuration = childGroup.fromKfTreeNode(child, marks, isFirstNode, lastDuration);
        //         this.children.push(childGroup);
        //     }
        //     isFirstNode = false;
        // }

        return lastDuration;
    }

    fromKfTreeNode(kfNode: KfTreeNode, marks: string[], isFirst: boolean, lastDuration: number) {
        marks = marks.filter(i => meetMarkTypeConstrains(i, kfNode.markTypeSelectors));
        const delay = isFirst ? 0 : kfNode.delay;
        this.delay = Math.max(-lastDuration, delay);

        const groupBy = kfNode.grouping.groupBy;
        const partition: Map<string, Set<string>> = new Map();
        for (let id of marks) {
            const value = chartManager.marks.get(id).get(groupBy);
            if (!partition.has(value)) {
                partition.set(value, new Set());
            }
            partition.get(value).add(id);
        }
        const sequence: string[] = kfNode.grouping.sequence.filter(i => partition.has(i));
        if (kfNode.grouping.sort.channel) {
            const channel = kfNode.grouping.sort.channel;
            const order = kfNode.grouping.sort.order;
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
        let isFirstChild = true;
        for (let attributeName of sequence) {
            if (!partition.has(attributeName)) {
                continue;
            }
            const child = new AnimationTreeGroup();
            lastDuration = child.fromKfTreeGroup(kfNode.grouping.child, Array.from(partition.get(attributeName)), isFirstChild, lastDuration);
            this.children.push([child]);
            isFirstChild = false;
        }
        return lastDuration;
    }

    render(animations: any[], time: number) {
        time += this.delay;
        for(let arr of this.children){
            let nextTime = time;
            time += arr[0].delay;
            arr[0].delay = 0;
            for(let child of arr){
                nextTime = Math.max(nextTime, child.render(animations, time))
            }
            time = nextTime;
        }
        // for (let child of this.children) {
        //     time = child.render(animations, time);
        // }
        return time;
    }
}

export class AnimationTreeNode extends AnimationTreeItem {
    marks: string[];
    duration: number;
    effectType: string;
    easing: string;

    fromKfTreeNode(kfNode: KfTreeNode, marks: string[], isFirst: boolean, lastDuration: number) {
        marks = marks.filter(i => meetMarkTypeConstrains(i, kfNode.markTypeSelectors));
        const delay = isFirst ? 0 : kfNode.delay;
        this.delay = Math.max(-lastDuration, delay);

        this.marks = marks;
        this.duration = kfNode.property.duration;
        this.easing = kfNode.property.easing;
        this.effectType = kfNode.property.effectType;

        return this.duration;
    }

    render(animations: any[], time: number) {
        time += this.delay;
        for (let id of this.marks) {
            let effectType = ["grow", "wheel"].includes(this.effectType) && chartManager.isText.get(id) ? "wipe left" : this.effectType;
            if (this.effectType == "wheel") {
                const element = document.getElementById(id);
                if (element.tagName == "line" || element.getAttribute("fill") == "none") {
                    effectType = "grow";
                }
            }
            // const effectType = child.property.effectType;
            animations.push(generateCanisFrame(
                `#${id}`,
                effectType,
                this.easing,
                time,
                this.duration
            ));
        }
        return time + this.duration;
    }
}

const generateCanisFrame = (selector: string, effectType: string, easing: string, start: number, duration: number) => {
    return {
        selector,
        offset: start,
        reference: "absolute",
        effects: [
            {
                type: effectType,
                duration,
                easing
            }
        ]
    }
}