const padding = 5;
const width: number = 220;
const foldedWidth: number = 28;
const foldedHeight: number = 28;

const recommendListWidth = 260;

const highlightColor = "rgb(252,191,139)";
const regularColor = "dodgerblue";

export class AddPanel {
    static container: SVGElement;
    static box: SVGElement;
    static icon: SVGElement;
    static shouldHide: boolean;
    static height: number;
    static width: number;

    static createAddPanel(height: number, shouldHide = false) {
        this.height = height;
        this.shouldHide = shouldHide;
        const container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.container = container;

        container.setAttribute("id", "addPanel");
        const dashBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        // dashBox.setAttribute("class", "dashBox");
        dashBox.setAttribute("height", String(height - 2 * padding));
        dashBox.setAttribute("x", String(padding));
        dashBox.setAttribute("y", String(padding));

        dashBox.setAttribute("rx", "8");
        dashBox.setAttribute("stroke", regularColor);
        dashBox.setAttribute("stroke-width", "1");
        dashBox.setAttribute("stroke-dasharray", "4 4");
        dashBox.setAttribute("fill", "none");
        container.appendChild(dashBox);
        this.box = dashBox;

        const plusIcon = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const r = 5;
        const w = 1;
        plusIcon.setAttribute("d",
            `M${w} ${r}V${w}H${r}V${-w}H${w}V${-r}H${-w}V${-w}H${-r}V${w}H${-w}V${r}Z`
        );
        plusIcon.setAttribute("fill", regularColor);
        this.icon = plusIcon;
        container.appendChild(plusIcon);

        this.fold();
    }

    static resize(width: number, height: number) {
        const result = width - this.width;
        this.width = width;
        if (width == 0) {
            this.container.setAttribute("display", "none");
            return;
        }
        this.container.removeAttribute("display");
        this.icon.setAttribute("transform", `translate(${width / 2}, ${this.height / 2})`);
        this.box.setAttribute("width", String(width - padding * 2));
        this.box.setAttribute("height", String(height - padding * 2));
        if (height === foldedHeight) {
            this.box.setAttribute("transform", `translate(${0}, ${(this.height - padding * 2) / 2 - 9})`)
            this.box.setAttribute('stroke', 'gray')
            this.icon.setAttribute("fill", "gray");
        }else{
            this.icon.setAttribute("fill", regularColor);
            this.box.setAttribute('stroke', regularColor)
            this.box.setAttribute("transform", `translate(${0}, ${0})`)
        }
        return result;
    }

    static fold() {
        let result: number;
        if (this.shouldHide) {
            result = this.resize(0, 0);
        } else {
            result = this.resize(foldedWidth, foldedHeight);
        }

        const recommendList = document.getElementById("recommendList");
        if (recommendList && this.shouldHide && result != 0) {
            recommendList.removeAttribute('display');
            result += recommendListWidth;
        }

        return result;
    }

    static show() {
        let result = this.resize(width, this.height);

        const recommendList = document.getElementById("recommendList");
        if (recommendList && this.shouldHide && result != 0) {
            recommendList.setAttribute('display', "none");
            result -= recommendListWidth;
        }

        return result;
    }

    static addHighlight() {
        this.icon.setAttribute("fill", highlightColor);
        this.box.setAttribute("stroke", highlightColor);
    }

    static removeHighlight() {
        this.icon.setAttribute("fill", regularColor);
        this.box.setAttribute("stroke", regularColor);
    }
}