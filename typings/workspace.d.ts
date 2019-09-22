declare namespace YA1 {
    let trimRegx: RegExp;
    let intRegx: RegExp;
    let numberRegx: RegExp;
    let percentRegx: RegExp;
    let quoteRegx: RegExp;
    function trim(txt: string): string;
    function delegate(func: Function, self: object, argc?: number): Function;
    interface IFuncs {
        (...args: any[]): any;
        add(handler: any): any;
        remove(handler: any): any;
    }
    function createFuncs(argc?: number, ck?: (handler: any) => Function, eq?: (obj1: any, obj2: any) => boolean): IFuncs;
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
        (sender: any, eventArgs: IEventArgs): any;
    }
    interface IEventArgs {
        [key: string]: any;
        type?: string;
        src?: any;
        canceled?: boolean;
    }
    interface IEventCapture {
        handler: IEventHandler;
        raw: IEventHandler;
        capture: object;
    }
    interface IObservable {
        subscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        unsubscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        notify(event: string, args: IEventArgs): IObservable;
        get_eventHandlers(event: string, addIfNone?: boolean): IFuncs;
    }
    class Observable implements IObservable {
        private _eventMaps;
        constructor(injectTaget?: Function | object);
        subscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        unsubscribe(event: string, handler: IEventHandler, capture?: boolean): IObservable;
        notify(event: string, args: IEventArgs): IObservable;
        get_eventHandlers(event: string, addIfNone?: boolean): IFuncs;
    }
    interface ICompositable {
        name(value?: string): string | ICompositable;
        composite(newComposite?: ICompositable, internalUsage?: string): ICompositable;
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
    let attach: (elem: HTMLElement, event: string, handler: Function) => any;
    let detech: (elem: HTMLElement, event: string, handler: Function) => any;
    function isInview(element: HTMLElement): boolean;
    interface IComponentChangeEventArgs {
        type: string;
        component: IComponent;
        index?: number;
    }
    interface IPoint {
        x?: number;
        y?: number;
    }
    interface ISize {
        width?: number;
        height?: number;
    }
    interface IBox extends IPoint, ISize {
    }
    interface IBoxEventArgs {
        type: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    }
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
        model?: any;
        actions?: Function[];
    }
    /**
     * 抽象的组件
     *
     * @interface IComponent
     */
    interface IComponent extends IObservable, ICompositable {
        element: HTMLElement;
        root(): IComponent;
        opts(opts?: IComponentOpts): IComponentOpts | IComponent;
        className(value?: string): string | IComponent;
        visible(value?: boolean): boolean | IComponent;
        x(value?: number): number | IComponent;
        y(value?: number): number | IComponent;
        position(value?: string): string | IComponent;
        location(point?: IPoint | string, relative?: string): IPoint | IComponent;
        move(args: IPoint | IEventHandler): IComponent;
        width(value?: any): any;
        height(value?: any): any;
        resize(args: ISize | IEventHandler): IComponent;
        resizable(value?: any): any;
        scrollX(value?: number): number | IComponent;
        scrollY(value?: number): number | IComponent;
        scroll(args: IPoint | IEventHandler): IComponent;
        content(value?: string): string | IComponent;
        attrs(name: {
            [attrName: string]: string;
        } | string, value?: string): string | IComponent;
        css(name: string | {
            [name: string]: string;
        }, value?: string): string | IComponent;
        dock(value?: string): string | IComponent;
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
        constructor(element?: string | HTMLElement | IComponentOpts);
        get_eventHandlers(event: string, addIfNone?: boolean): IFuncs;
        _bindedEvents: {
            [event: string]: IFuncs;
        };
        subscribe(event: string, handler: IEventHandler, capture?: boolean): IComponent;
        unsubscribe(event: string, handler: IEventHandler, capture?: boolean): IComponent;
        notify(event: string, args: IEventArgs): IComponent;
        onComponentChanged(event: string, component: IComponent, index?: number): void;
        componentChange(handler: (sender: IComponent, args: IComponentChangeEventArgs) => any): IComponent;
        protected contentElement(): HTMLElement;
        _root: IComponent;
        root(): IComponent;
        private _binders;
        _opts: IComponentOpts;
        opts(opts?: IComponentOpts): IComponent | IComponentOpts;
        _dock: string;
        dock(value?: string): string | IComponent;
        className(value?: string): string | IComponent;
        content(value?: string): string | IComponent;
        private _disNone;
        private _visible;
        visible(value?: boolean): boolean | IComponent;
        show(animate?: boolean): void;
        _x: number;
        x(value?: number | boolean): IComponent | number;
        _y: number;
        y(value?: number | boolean): IComponent | number;
        move(args: IPoint | IEventHandler): IComponent;
        location(point?: IPoint | string, relative?: string): IPoint | IComponent;
        width(value?: any): any;
        height(value?: any): any;
        resize(args: ISize | IEventHandler): IComponent;
        position(value?: string | boolean): string | IComponent;
        scrollX(value?: number): IComponent | number;
        scrollY(value?: number): IComponent | number;
        scroll(point: IPoint | IEventHandler): IComponent;
        _resizable: any;
        _resizableMousemoveHandler: any;
        _resizableMousedownHandler: any;
        resizable(value?: any): any;
        css(name: string | {
            [name: string]: string;
        }, value?: string): string | IComponent;
        _opacity: string;
        opacity(value?: number): number | IComponent;
        cursor(value?: string): string | IComponent;
        attrs(name: string | {
            [attrname: string]: string;
        }, value?: string): string | IComponent;
        protected _preventEvent: boolean;
        suspend(handler?: (comp: IComponent) => any): IComponent;
        resume(): IComponent;
        refresh(includeChildren?: boolean): IComponent;
        private _makeDock(child, dockInfo);
        renovate(data?: any, diff?: boolean): IComponent;
        update(data: any, diff?: boolean): IComponent;
        static types: {
            [name: string]: Function;
        };
        static feature(name: string, feature: Function): void;
    }
    let componentTypes: {
        [name: string]: Function;
    };
    function component(opts: IComponentOpts, parent?: IComponent | HTMLElement): IComponent;
    let eventConvertors: {
        [event: string]: (e: Event) => IEventArgs;
    };
    interface IDockInfo {
        left_x: number;
        right_x: number;
        spaceWidth: number;
        top_y: number;
        bottom_y: number;
        spaceHeight: number;
    }
    interface IMaskOpts {
        css?: {
            [name: string]: string;
        };
        content?: string | IComponent;
        className?: string;
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
declare function xxx(ck: any, eq: any): void;
