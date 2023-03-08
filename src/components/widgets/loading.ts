import '../../assets/style/loading.scss'

export class Loading {
    static LOADING: string = 'Preparing Animation';
    static EXPORTING: string = 'Exporting Animation';
    static SUGGESTING: string = 'Targeting Animation';
    static allLoadings: Loading[] = [];

    public container: HTMLDivElement;
    public createLoading(wrapper: HTMLElement, content: string) {
        //change cursor
        document.body.classList.add('wait');

        const wrapperBBox: DOMRect = wrapper.getBoundingClientRect();//fixed
        if (typeof this.container === 'undefined') {
            this.container = document.createElement('div');
            this.container.className = 'loading-container';

            const loadingWrapper: HTMLDivElement = document.createElement('div');
            loadingWrapper.className = 'loading-wrapper';
            const text: HTMLSpanElement = document.createElement('span');
            text.innerHTML = content;
            loadingWrapper.appendChild(text);

            const loadingIcon: HTMLDivElement = document.createElement('div');
            loadingIcon.className = 'lds-ellipsis';
            loadingIcon.appendChild(document.createElement('div'));
            loadingIcon.appendChild(document.createElement('div'));
            loadingIcon.appendChild(document.createElement('div'));
            loadingIcon.appendChild(document.createElement('div'));
            loadingWrapper.appendChild(loadingIcon);
            this.container.appendChild(loadingWrapper);
        }
        this.container.style.left = `${wrapperBBox.left}px`;
        this.container.style.top = `${wrapperBBox.top}px`;
        this.container.style.width = `${wrapperBBox.width}px`;
        this.container.style.paddingTop = `${wrapperBBox.height * 0.4}px`;
        this.container.style.height = `${wrapperBBox.height}px`;

        document.body.appendChild(this.container);
        Loading.allLoadings.push(this);
    }
    public static removeLoading() {
        //change cursor
        document.body.classList.remove('wait');
        this.allLoadings.forEach((l: Loading) => {
            if (document.body.contains(l.container)) {
                document.body.removeChild(l.container);
            }
        })
        this.allLoadings = [];
    }
}

// export let loadingBlock: Loading = new Loading();