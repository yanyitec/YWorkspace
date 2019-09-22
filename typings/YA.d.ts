declare namespace YA {
    enum ExecutionModes {
        Devalopment = 0,
        Production = 1,
    }
    let executionMode: ExecutionModes;
    let trimRegx: RegExp;
    let intRegx: RegExp;
    let numberRegx: RegExp;
    let percentRegx: RegExp;
    let quoteRegx: RegExp;
    interface IAjaxOpts {
        method?: string;
        url?: string;
        data?: string;
        nocache?: boolean;
    }
    interface IThenable {
        then(onFullfilled: Function, onReject?: Function): any;
    }
    let ajax: (opts: IAjaxOpts) => IThenable;
    /**
     * 去掉字符串两边的空白
     *
     * @export
     * @param {string} txt
     * @returns
     */
    function trim(txt: string): string;
    /**
     * 判断参数是否是数组
     *
     * @export
     * @param {*} obj
     * @returns
     */
    function isArray(obj: any): boolean;
    function isObject(obj: any): boolean;
    /**
     * 函数代理，固定某个函数的this到指定的对象
     *
     * @export
     * @param {Function} func 要固定this的函数
     * @param {object} self this指向的对象
     * @param {number} [argc] (optional)函数有几个参数,不填写表示任意多参数
     * @returns 固定了this指针的函数
     */
    function delegate(func: Function, self: object, argc?: number): Function;
    /**
     * 函数簇执行上下文，可以作为函数簇add/remove的参数
     *
     * @export
     * @interface IFuncExecuteArgs
     */
    interface IFuncExecuteArgs {
        handler: (...args: any[]) => any;
        [name: string]: any;
        args?: any[] | boolean;
        self?: object;
        arg0?: any;
        arg1?: any;
    }
    /**
     * 函数簇
     * 自己也是一个函数
     * 调用这个函数会依次调用add 的函数
     *
     * @export
     * @interface IFuncs
     */
    interface IFuncs {
        (...args: any[]): any;
        add(handler: Function | IFuncExecuteArgs): any;
        remove(handler: any): any;
    }
    /**
     * 创建函数簇
     *
     * @export
     * @param {number} [argc] (optional)函数参数个数，undefined表示任意多个
     * @param {(handler:any)=>Function} [ck] (optional)执行前检查函数，可以没有，表示所有的都执行；如果指定了该参数，在执行函数前会首先调用该函数，如果返回false表示未通过检查，不会执行
     * @param {(obj1:any,obj2:any)=>boolean} [eq] (optional) 等值检查函数。如果指定了，remove时会调用该函数来代替 ==
     * @returns {IFuncs}
     */
    function createFuncs(argc?: number, ck?: (handler: any) => Function, eq?: (obj1: any, obj2: any) => boolean): IFuncs;
    /**
     * 数据路径
     * 给定一个字符串，比如 A.B.C
     * 当调用getValue(obj)/setValue(obj,value)时，表示在obj.A.B.C上赋值
     * 支持正向下标的数组表达式，比如 A.B[0].C,
     * 还支持反向下标的数组表达式
     * @export
     * @class DPath
     */
    class DPath {
        fromRoot: boolean;
        constructor(pathOrValue: any, type?: string);
        getValue(data: any): any;
        setValue(data: any, value: any): DPath;
        static fetch(pathtext: string): DPath;
        static const(value: any): DPath;
        static dymanic(value: Function): DPath;
        static paths: {
            [name: string]: DPath;
        };
    }
    function extend(...args: any[]): any;
    function replace(text: string, data: object): void;
    /**
     * 对象合并
     *
     * @export
     * @param {*} dest 目标对象
     * @param {*} src 源对象
     * @param {string} [prop] 内部使用
     * @param {Array<any>} [refs] 内部使用，在循环引用时防止无穷循环
     * @returns
     */
    function merge(dest: any, src: any, prop?: string, refs?: Array<any>): any;
    function deepClone(obj: any): any;
    interface IAccessor {
        getValue(): any;
        setValue(value: any): any;
    }
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
    function createElement(tagName: string): HTMLElement;
    let getStyle: (obj: HTMLElement, attr: string) => string;
    let attach: (elem: HTMLElement, event: string, handler: Function) => any;
    let detech: (elem: HTMLElement, event: string, handler: Function) => any;
    function replaceClass(element: HTMLElement, addedCss: string, removeCss?: string): void;
    function isInview(element: HTMLElement): boolean;
    interface IFieldPathsOpts {
        detail?: string;
        edit?: string;
        filter?: string;
        cell?: string;
    }
    interface IFieldOpts {
        /**
         * 字段名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        name?: string;
        constValue?: any;
        /**
         * 类型
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        type?: string;
        /**
         * 是否是主键
         *
         * @type {boolean}
         * @memberof IFieldOpts
         */
        isPrimary?: boolean;
        /**
         *  在数据对象上的路径
         *
         * @type {IFieldPathsOpts|string}
         * @memberof IFieldOpts
         */
        paths?: IFieldPathsOpts | string;
        /**
         * 显示名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        label?: string;
        /**
         * 说明
         *
         * @type {string}
         * @memberof IField
         */
        remark?: string;
        validations: {
            [name: string]: any;
        };
    }
    interface IDropdownFieldOpts extends IFieldOpts {
        itemKey?: string;
        itemText?: string;
        noSelectedText?: string;
        isObjectValue?: boolean;
        items?: any;
    }
    interface IFieldViewAccessor extends IAccessor {
        valuechange: (handler: (value: any) => any) => any;
        element: HTMLElement;
        validate?: (value: any, lng: (txt: string) => string) => string;
    }
    interface IDataPaths {
        detail: DPath;
        edit: DPath;
        filter: DPath;
        cell: DPath;
    }
    class DataPaths implements IDataPaths {
        detail: DPath;
        edit: DPath;
        filter: DPath;
        cell: DPath;
        constructor(opts: IFieldPathsOpts | string);
    }
    class Field {
        opts: IFieldOpts;
        name: string;
        type: string;
        paths: IDataPaths;
        label: string;
        validations: {
            [name: string]: any;
        };
        required: boolean;
        fieldset: Fieldset;
        className: string;
        dataViewCreator: (field: Field, fieldView: FieldView) => IFieldViewAccessor;
        constructor(fieldOpts: IFieldOpts, fieldset?: Fieldset);
        path(fieldViewType: FieldViewTypes): DPath;
        validate(value: any, lng: (txt: string) => string, isCheckRequired: boolean): string;
    }
    interface IFieldsetOpts {
        name?: string;
        fields: {
            [name: string]: IFieldOpts;
        };
    }
    class Fieldset {
        __opts__: IFieldsetOpts;
        __name__: string;
        __primary__: Field;
        constructor(opts: IFieldsetOpts);
        TEXT(txt: string): string;
    }
    enum FieldViewTypes {
        /**
         * 显示为一个Button或超连接
         */
        Button = 0,
        /**
         * 显示为一个只读的字段，带着字段名与字段说明
         */
        Detail = 1,
        /**
         * 显示为一个可编辑的字段，带着字段名，验证信息等
         */
        Edit = 2,
        /**
         * 显示为一个表格的单元格内容
         */
        Cell = 3,
        /**
         * 显示为一个表格头的单元格内容
         */
        HeadCell = 4,
        /**
         * 显示为查询条件的字段，去掉必填标记，验证信息显示在title上
         */
        Filter = 5,
    }
    enum AccessPermissions {
        /**
         * 可写
         */
        Writable = 0,
        /**
         * 可读
         */
        Readonly = 1,
        Hidden = 2,
        /**
         * 禁止访问
         */
        Denied = 3,
    }
    enum FieldActionTypes {
        /**
         * 没有动作
         */
        None = 0,
        /**
         * 呼叫函数
         */
        Call = 1,
        /**
         * 跳转
         */
        Navigate = 2,
        /**
         * 新建一个window
         */
        NewWindow = 3,
        /**
         * 弹出一个对话框
         */
        Dialog = 4,
        /**
         * 下转
         */
        Dive = 5,
    }
    interface IFieldViewOpts extends IFieldOpts {
        className?: string;
        layout?: string;
        width?: number;
        field?: Field;
        accessPermission?: AccessPermissions;
        feildViewType?: FieldViewTypes | string;
        actionType?: FieldActionTypes | string;
        action?: any;
    }
    class FieldView implements IAccessor {
        opts: IFieldViewOpts;
        field: Field;
        fieldsetView: FieldsetView;
        element: HTMLElement;
        dataViewAccessor: IFieldViewAccessor;
        errorMessage: (message: string) => void;
        _fieldViewType: FieldViewTypes;
        path: DPath;
        accessPermission: AccessPermissions;
        actionType: FieldActionTypes;
        action: any;
        constructor(opts: IFieldViewOpts, fieldsetView?: FieldsetView);
        fieldViewType(type?: FieldViewTypes): FieldView | FieldViewTypes;
        makeLabelElement(wrapper: HTMLElement, isMarkRequired: boolean): HTMLElement;
        makeElement(wrapper?: HTMLElement): HTMLElement;
        getValue(): any;
        setValue(value: any, refresh?: boolean): FieldView;
        refresh(): FieldView;
        validate(value?: any): string;
        isWritable(): boolean;
        isReadable(): boolean;
        isReadonly(): boolean;
        isDenied(): boolean;
        isHidden(): boolean;
    }
    let validators: {
        [name: string]: (value, opts, lng: (txt: string) => string) => string;
    };
    let fieldDataViewCreators: {
        [type: string]: (field: Field, fieldView: FieldView) => IFieldViewAccessor;
    };
    enum FieldsetViewTypes {
        Detail = 0,
        Edit = 1,
        Filter = 2,
        Row = 3,
        HeadRow = 4,
    }
    interface IFieldsetViewOpts extends IFieldsetOpts {
        element?: HTMLElement;
        fieldsetViewType: FieldsetViewTypes | string;
        fields: {
            [name: string]: IFieldViewOpts;
        };
        fieldset?: Fieldset;
    }
    class FieldsetView {
        opts: IFieldsetViewOpts;
        name: string;
        fieldset: Fieldset;
        fieldviews: FieldView[];
        fieldsetViewType: FieldsetViewTypes;
        element: HTMLElement;
        selectedIds: any[];
        constructor(opts: IFieldsetViewOpts);
        _makeDetailElement(layoutName: string): void;
        _data: any;
        TEXT(txt: string): string;
        getValue(): any;
        setValue(value: any): FieldsetView;
        validate(): {
            [index: string]: string;
        };
    }
    interface ILayout {
        appendElement(lyname: string, element?: HTMLElement): Element;
        /**
         * 查找布局元素
         *
         * @param {string} lyName
         * @param {boolean} [noUseCache]
         * @memberof ILayoutMaster
         */
        findElement(lyName: string, noUseCache?: boolean): any;
        /**
         * 清空布局元素
         *
         * @param {string} [lyName]
         * @memberof ILayoutMaster
         */
        clearElement(lyName?: string): any;
        /**
         * 找到/新添布局元素
         *
         * @param {string} lyName
         * @param {boolean} [noUseCache]
         * @memberof ILayoutMaster
         */
        sureElement(lyName: string, noUseCache?: boolean): any;
    }
}
