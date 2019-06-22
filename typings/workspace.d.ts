declare namespace YA {
    let trimRegx: RegExp;
    let intRegx: RegExp;
    let numberRegx: RegExp;
    let percentRegx: RegExp;
    let quoteRegx: RegExp;
    function trim(txt: string): string;
    function delegate(func: Function, self: object, argc?: number): Function;
    class DataPath {
        fromRoot: boolean;
        constructor(path: string);
        getValue(data: any): any;
        setValue(data: any, value: any): DataPath;
    }
    class Binder {
        path: DataPath;
        accessor: Function;
        constructor(path: DataPath, accessor: Function);
        update(data: any, diff?: boolean): void;
        renovate(data: any, diff?: boolean): void;
        static tryMake(pathExpr: string, prop: string, comp: object): Binder;
    }
    class ObjectBinder extends Binder {
        constructor(path: DataPath, accessor: Function);
        update(data: any, diff?: boolean): void;
        renovate(data: any, diff?: boolean): void;
    }
    function merge(dest: any, src: any, prop?: string, refs?: Array<any>): any;
    function xable(injectTaget: Function | object, Xable: Function): void;
    interface IEventHandler {
        (sender: any, eventArgs: any): any;
    }
    interface IEventCapture {
        handler: IEventHandler;
        capture: object;
    }
    interface IObservable {
        subscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        unsubscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        notify(event: string, args: any, sender?: any): IObservable;
    }
    class Observable implements IObservable {
        private _eventMaps;
        constructor(injectTaget?: Function | object);
        subscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        unsubscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        notify(event: string, args: any, sender?: any): IObservable;
    }
    interface ICompositable {
        name(value?: string): string | ICompositable;
        composite(newComposite?: ICompositable): ICompositable;
        components(name: number | string, child?: ICompositable): ICompositable | ICompositable[];
        add(compoent: ICompositable, index?: number): ICompositable;
        remove(compoent: ICompositable | string): ICompositable;
        length(): number;
        onComponentChanged(event: string, component: ICompositable, index?: number): void;
    }
    class Compositable implements ICompositable {
        protected _components: ICompositable[];
        protected _composite: ICompositable;
        protected _name: string;
        constructor(injectTaget?: Function | object);
        onComponentChanged(event: string, component: ICompositable, index?: number): void;
        length(): number;
        name(value?: string): string | ICompositable;
        composite(newParent?: ICompositable, internalUsage?: string): ICompositable;
        components(name: number | string, child?: ICompositable, evtable?: string): ICompositable | ICompositable[];
        add(child: ICompositable, index?: number, eventable?: string): ICompositable;
        protected _add(child: ICompositable, index: number): number;
        remove(child: Compositable, evtable?: string): ICompositable;
    }
    function createElement(tagName: string): HTMLElement;
    let getStyle: (obj: HTMLElement, attr: string) => string;
    function isInview(element: HTMLElement): boolean;
    interface IComponentOpts {
        name?: string;
        tag?: string;
        type: string;
        className?: string;
        attrs?: {
            [index: string]: string;
        };
        css?: {
            [index: string]: string;
        };
        children?: Array<IComponentOpts>;
    }
    /**
     * 抽象的组件
     *
     * @interface IComponent
     */
    interface IComponent extends IObservable, ICompositable {
        element: HTMLElement;
        opts(opts?: IComponentOpts): IComponentOpts | IComponent;
        className(value?: string): string | IComponent;
        visible(value?: boolean): boolean | IComponent;
        x(value?: number): number | IComponent;
        y(value?: number): number | IComponent;
        width(value?: any): any;
        height(value?: any): any;
        attrs(name: {
            [attrName: string]: string;
        } | string, value?: string): string | IComponent;
        css(name: string | {
            [name: string]: string;
        }, value?: string): string | IComponent;
        dock(value?: string): string | IComponent;
        position(value?: string): string | IComponent;
        suspend(handler?: (comp: IComponent) => void): IComponent;
        resume(): IComponent;
        refresh(includeCHildren?: boolean): IComponent;
        renovate(data?: any, diff?: boolean): IComponent;
        update(data: any, diff?: boolean): IComponent;
    }
    class Component extends Compositable implements IComponent {
        element: HTMLElement;
        private _width;
        private _height;
        private _percentHeight;
        constructor(element?: string | HTMLElement | IComponentOpts);
        subscribe: (event: string, handler: IEventHandler, capture?: boolean) => IComponent;
        unsubscribe: (event: string, handler: IEventHandler, capture?: boolean) => IComponent;
        notify(event: string, args: any, sender?: any): IComponent;
        onComponentChanged(event: string, component: IComponent, index?: number): void;
        protected contentElement(): HTMLElement;
        private _binders;
        _opts: IComponentOpts;
        opts(opts?: IComponentOpts): IComponent | IComponentOpts;
        _dock: string;
        dock(value?: string): string | IComponent;
        className(value?: string): string | IComponent;
        private _disNone;
        private _visible;
        visible(value?: boolean): boolean | IComponent;
        _x: number;
        x(value?: number | boolean): IComponent | number;
        _y: number;
        y(value?: number | boolean): IComponent | number;
        width(value?: any): any;
        height(value?: any): any;
        position(value?: string | boolean): string | IComponent;
        css(name: string | {
            [name: string]: string;
        }, value?: string): string | IComponent;
        attrs(name: string | {
            [attrname: string]: string;
        }, value?: string): string | IComponent;
        protected _preventRefresh: boolean;
        suspend(handler?: (comp: IComponent) => void): IComponent;
        resume(): IComponent;
        refresh(includeCHildren?: boolean): IComponent;
        private _makeDock(child, dockInfo);
        renovate(data?: any, diff?: boolean): IComponent;
        update(data: any, diff?: boolean): IComponent;
        static types: {
            [name: string]: Function;
        };
    }
    let componentTypes: {
        [name: string]: Function;
    };
    function component(opts: IComponentOpts, parent?: IComponent | HTMLElement): IComponent;
    interface IDockInfo {
        left_x: number;
        right_x: number;
        spaceWidth: number;
        top_y: number;
        bottom_y: number;
        spaceHeight: number;
    }
    class LayoutComponent extends Component {
        constructor();
        _direction: string;
        direction(value?: string): string | LayoutComponent;
        refresh(): LayoutComponent;
        /**
         *  水平排版
         *
         * @memberof LayoutComponent
         */
        private _layout_horizontal();
    }
    interface IResiseableComponentOpts extends IComponentOpts {
        minSize: number;
        maxSize: number;
    }
    class ResizeableComponent extends Component {
        _contentElement: HTMLElement;
        _collapsed: boolean;
        _minSize: number;
        _maxSize: number;
        _collapseable: boolean;
        _resizeable: boolean;
        _rszElement: HTMLElement;
        _pos: any;
        constructor(opts: IComponentOpts);
        update(): this;
    }
    class AnchorableComponent extends Component {
        private _anchorTop;
        private _anchorBottom;
        private _anchorLeft;
        private _anchorRight;
        constructor();
        anchorTop(value?: any): any;
        anchorBottom(value?: any): any;
        anchorLeft(value?: any): any;
        anchorRight(value?: any): any;
        refresh(): IComponent;
    }
}
declare let user: {
    id: string;
    roles: {
        id: string;
        name: string;
        permissions: {
            id: string;
        }[];
    }[];
};
declare let dp: YA.DataPath;
declare let v: any;
