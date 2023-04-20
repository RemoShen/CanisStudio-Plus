const padding = 5;
const width: number = 220;

const highlightColor = "rgb(252,191,139)";
const regularColor = "dodgerblue";

export class AddPanel {
    static container: SVGElement;
    static box: SVGElement;
    static icon: SVGElement;

    static createAddPanel(height: number) {
        const container = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.container = container;

        container.setAttribute("id", "addPanel");
        const dashBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        // dashBox.setAttribute("class", "dashBox");
        dashBox.setAttribute("width", String(width - 2 * padding));
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
        plusIcon.setAttribute("transform", `translate(${width / 2},${height / 2})`);
        plusIcon.setAttribute("fill", regularColor);
        this.icon = plusIcon;
        container.appendChild(plusIcon);

        this.hide();
        return container;
    }

    static hide() {
        const recommendList = document.getElementById("recommendList");
        recommendList.removeAttribute('display')
        this.container.setAttribute("display", "none");
    }

    static show() {
        const recommendList = document.getElementById("recommendList");
        recommendList.setAttribute('display', "none")
        this.container.removeAttribute("display");
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