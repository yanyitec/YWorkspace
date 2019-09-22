namespace YA{
    export enum ExecutionModes{
        Devalopment,
        Production
    }
    export let executionMode:ExecutionModes = ExecutionModes.Devalopment;
    /*=========================================================
     * 常用正则表达式
     *========================================================*/

    // 正则:去掉字符串首尾空白字符
    export let trimRegx :RegExp = /(^\s+)|(\s+$)/gi;
    // 正则:整数
    export let intRegx :RegExp = /^\s*(\+\-)?\d+\s*$/;
    // 正则: 数字，小数
    export let numberRegx :RegExp = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*$/;
    // 正则: 百分比
    export let percentRegx :RegExp = /^\s*(\+\-)?\s*\d{1，2}(?:.\d+)\s*\%\s*$/;
    export let quoteRegx:RegExp = /"/gi;
    

    /*=========================================================
     * ajax 函数，本框架不实现，由外部框架注入
     *========================================================*/

    export interface IAjaxOpts{
        method?:string;
        url?:string;
        data?:string;
        nocache?:boolean;
    }
    export interface IThenable{
        then(onFullfilled:Function,onReject?:Function):any;
    }
    export let ajax:(opts:IAjaxOpts)=>IThenable;

    /*=========================================================
     * trim 函数
     *========================================================*/

    /**
     * 去掉字符串两边的空白
     *
     * @export
     * @param {string} txt
     * @returns
     */
    export function trim(txt:string){
        return txt?txt.toString().replace(trimRegx,""):"";
    }
    

    /**
     * 判断参数是否是数组
     *
     * @export
     * @param {*} obj
     * @returns
     */
    export function isArray(obj){
        return Object.prototype.toString.call(obj)==="[object Array]";
    }

    export function isObject(obj){
        return Object.prototype.toString.call(obj)==="[object Object]";
    }



    /*=========================================================
     * 函数处理
     * 包含 固定this指针的delegate
     * 函数簇，多个类似的函数，调用时将依次调用里面的函数
     *========================================================*/

    /**
     * 函数代理，固定某个函数的this到指定的对象
     *
     * @export
     * @param {Function} func 要固定this的函数
     * @param {object} self this指向的对象
     * @param {number} [argc] (optional)函数有几个参数,不填写表示任意多参数
     * @returns 固定了this指针的函数
     */
    export function delegate(func:Function,self:object,argc?:number){
        if(argc===undefined) return function(){return func.apply(self,arguments);}
        if(argc===0) return function(){return func.call(self);}
        if(argc===1) return function(arg){return func.call(self,arg);}
        let factory = delegateFactories[argc];
        if(!factory){
            let argList="";
            for(let i = 0,j=argc;i<j;i++){
                if(argList)argList += ",";
                argList += "arg"+i;
            }
            let code = `return function(${argList}){return func.call(self,${argList})}`;
            factory = delegateFactories[argc] = new Function("func","self",code) as (func:Function,self:object)=>Function;

        }
        return factory(func,self);
    }
    let delegateFactories:Array<(func:Function,self:object)=>Function>=[];


    /**
     * 函数簇执行上下文，可以作为函数簇add/remove的参数
     *
     * @export
     * @interface IFuncExecuteArgs
     */
    export interface IFuncExecuteArgs{
        handler:(...args:any[])=>any;   
        [name:string]:any;
        args?:any[] | boolean;
        self?:object;
        arg0?:any;
        arg1?:any;
    }

    /**
     * 函数簇
     * 自己也是一个函数
     * 调用这个函数会依次调用add 的函数
     *
     * @export
     * @interface IFuncs
     */
    export interface IFuncs{
        (...args:any[]):any;
        add(handler:Function|IFuncExecuteArgs);
        remove(handler:any);
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
    export function createFuncs(argc?:number,ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean):IFuncs{
        let factory = funcsFactories[argc||0];
        if(!factory){
            let argList="";
            let isConst =false;
            if(argc===null){isConst = true;argc=24;}
            else if(argc>=24) throw new Error("参数最多只能有23个");
            for(let i = 0,j=argc;i<j;i++){
                if(argList)argList += ",";
                argList += "arg"+i;
            }
            let code = `var handlers = [];
var funcs = function(${argList}){
    var result;
                
    for(let i=0,j=handlers.length;i<j;i++){
        var handler = handlers[i];
        var rs;
        if(ck){
            handler = ck(handler);
            if(!handler) continue;
        }`;
            if(isConst){code+=`
        if(handler.handler){
            if(handler.args){
                if(handler.args===true){
                    rs = handler.handler.call(handler.self||this,handler.arg0,handler.arg1);
                }  else if(handler.args.length){
                    rs = handler.handler.apply(hanlder.self||this,handler.args);
                }
            }
              
        }
`;
            }else {code +=`
        let rs = handler(${argList});
`;
            }                    
code+=`
        if(rs!==undefined){
            result = rs;
            if(rs===false)break;
        }
    }
    return result;
};
funcs.__YA_FUNCS_HANLDERS = handlers;
funcs.add=function(handler){handlers.push(handler);}
funcs.remove=function(handler){
    for(var i=0,j=handlers.length;i<j;i++){
        var existed = handlers.shift();
        if(existed !==handler && (eq ?!eq(handler,existed):true)){continue;}
    }
}
return funcs;
`;
            factory = funcsFactories[argc] = new Function("ck","eq",code) as (ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean)=>IFuncs;

        }
        return factory(ck,eq);
    }
    let funcsFactories:Array<(ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean)=>IFuncs>=[];


    /*=========================================================
     * 数据处理相关类

     *========================================================*/

    
    /**
     * 数据路径
     * 给定一个字符串，比如 A.B.C
     * 当调用getValue(obj)/setValue(obj,value)时，表示在obj.A.B.C上赋值
     * 支持正向下标的数组表达式，比如 A.B[0].C,
     * 还支持反向下标的数组表达式
     * @export
     * @class DPath
     */
    export class DPath{
        
        fromRoot:boolean;
        constructor(pathOrValue:any,type?:string){
            if(type==="const"){
                this.getValue = (d)=>pathOrValue;
                this.setValue = (d,v)=>{
                    if(executionMode===ExecutionModes.Devalopment){console.warn("向一个const的DPath写入了值",this,d,v);}
                    return this;
                };
                return;
            }else if(type==="dynamic"){
                this.getValue = (d)=>pathOrValue(d);
                this.setValue = (d,v)=>{
                    pathOrValue(d,v);
                    return this;
                };
                return;
            }
            let path = pathOrValue as string;
            //$.user.roles[0].permissions:first.id;
            let lastAt:number= -1;
            let lastTokenCode:number; 
            let lastPropName:string;
            let isLastArr :boolean;
            let inBrace:boolean = false;
            let getterCodes :Array<string> = [];
            let setterCodes :Array<string> = ["var $current$;\n"];
            let buildCodes = (txt:string,isArr?:boolean)=>{
                if(isArr){
                    getterCodes.push("$obj$=$obj$["+txt+"];if(!$obj$===undefined)return $obj$;\n");
                }else {
                    getterCodes.push("$obj$=$obj$."+txt+";if(!$obj$===undefined)return $obj$;\n");
                }
                if(lastPropName){
                    if(isLastArr){
                        setterCodes.push("$current$=$obj$["+lastPropName+"];if(!$current$) $obj$=$obj$["+lastPropName+"]="+(isArr?"[]":"{}")+";else $obj$=$current$;\n");
                    }else{
                        setterCodes.push("$current$=$obj$."+lastPropName+";if(!$current$) $obj$=$obj$."+lastPropName+"="+(isArr?"[]":"{}")+";else $obj$=$current$;\n");
                    }
                }
                isLastArr = isArr;
                lastPropName=txt;
            }
            
            let tpath :string = "";
            for(let at:number=0,len:number=path.length;at<len;at++){
                let ch = path.charCodeAt(at);
                // .
                if(ch===46){
                    if(inBrace) throw new Error("Invalid DPath:" + path);
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt===""){
                        if(lastPropName && lastTokenCode!=93) throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;lastAt = at;continue;
                    }
                    lastPropName = txt;
                    if(txt==="$") this.fromRoot = true;
                    buildCodes(txt);
                    lastTokenCode = ch;lastAt = at;continue;
                }
                
                //[
                else if(ch===91){
                    if(inBrace) throw new Error("Invalid DPath:" + path);
                    
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt===""){
                        if(!lastPropName|| lastTokenCode!==93)  throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;lastAt = at;continue;
                    }
                    buildCodes(txt);
                    inBrace = true;
                    lastTokenCode = ch;lastAt = at;continue;
                }
                //]
                else if(ch===93){
                    if(!inBrace)  throw new Error("Invalid DPath:" + path);
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt==="")throw new Error("Invalid DPath:" + path);
                    let match  =txt.match(lastRegx);
                    if(match){
                        txt= "$obj$.length-1" + match;
                    }
                    buildCodes(txt,true);
                    inBrace = false;
                    lastTokenCode = ch;lastAt = at;continue;
                }
                
            }
            if(inBrace)  throw new Error("Invalid DPath:" + path);
            let txt = path.substr(lastAt+1).replace(trimRegx,"");
            if(txt){
                getterCodes.push("return $obj$."+txt+";\n");
                if(lastPropName){
                    if(isLastArr){
                        setterCodes.push("$current$=$obj$["+lastPropName+"];if(!$current$) $obj$=$obj$["+lastPropName+"]={};else $obj$=$current$;\n");
                    }else{
                        setterCodes.push("$current$=$obj$."+lastPropName+";if(!$current$) $obj$=$obj$."+lastPropName+"={};else $obj$=$current$;\n");
                    }
                    
                }
                setterCodes.push("$obj$." + txt+"=$value$;\nreturn this;\n");
            }else{
                getterCodes.pop();
                getterCodes.push("return $obj$["+lastPropName+"];");
                if(isLastArr){
                    setterCodes.push("$obj$["+lastPropName+"]=$value$;\nreturn this;\n");
                }else{
                    setterCodes.push("$obj$."+lastPropName+"=$value$;\nreturn this;\n");
                }
            }
            
            
            let getterCode = getterCodes.join("");
            let setterCode = setterCodes.join("");
            this.getValue = new Function("$obj$",getterCode) as (d)=>any;
            this.setValue = new Function("$obj$","$value$",setterCode) as (d,v)=>DPath;
        }
        getValue(data:any):any{}

        setValue(data:any,value:any):DPath{
            return this;
        }
        static fetch(pathtext:string):DPath{
            return DPaths[pathtext] ||(DPaths[pathtext]= new DPath(pathtext));
        }

        static const(value:any):DPath{
            return new DPath(value,"const");
        }
        static dymanic(value:Function):DPath{
            return new DPath(value,"dynamic");
        }
        static paths:{[name:string]:DPath};
    }
    let DPaths = DPath.paths={};

    export function extend(...args:any[]):any{
        let obj = arguments[0]||{};
        for(let i=1,j=arguments.length;i<j;i++){
            let src = arguments[i];
            for(let n in src) obj[n] = src[n];
        }
        return obj;
    }

    let lastRegx :RegExp = /^-\d+$/;

    export function replace(text:string,data:object){

    }
    let templateVar
    function makeTemplate(text:string){

    }
    
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
    export function merge(dest:any,src:any,prop?:string,refs?:Array<any>){
        if(prop===undefined){
            if(dest===src) return dest;
            for(let n in src) merge(dest,src,prop,[]);
            return dest;
        }
        let srcValue = src[prop];
        if(srcValue===null) return dest[prop]=null;
        if(srcValue instanceof RegExp) return dest[prop] = srcValue;
        let destValue = dest[prop];
        if(srcValue===undefined) return destValue;
        
        let srcValueType = typeof srcValue;
        if(srcValueType==="string"|| srcValueType==="number"|| srcValueType==="boolean") {
            return dest[prop] = srcValue;
        }
        for(let i in refs){
            let ref = refs[i];
            if(ref.src===srcValue) {
                return dest[prop] = ref.target;
            }
        }

        let isSrcValueArray = Object.prototype.toString.call(srcValue)==="[object Array]";
        let target;
        if(!destValue) target = isSrcValueArray?[]:{};
        if(!target){
            if(typeof destValue!=='object'|| destValue instanceof RegExp) destValue = isSrcValueArray?[]:{};
        }else target = destValue;
        refs.push({src:srcValue,target:target});
        merge(target,srcValue);
        return dest[prop] = target;

    }

    export function deepClone(obj:any):any{
        if(!obj) return obj;
        let type = typeof obj;
        if(type==="object"){
            let result = isArray(obj)?[]:{};
            for(let n in obj){
                result[n] = deepClone(obj[n]);
            }
            return result;
        }
        return obj;
    }

    export interface IAccessor{
        getValue():any;
        setValue(value):any;

    }
    


    /*=========================================================
     * 事件处理

     *========================================================*/

    export function xable(injectTaget:Function|object,Xable:Function){
        if(injectTaget){
            let target:object = injectTaget;
            if(typeof injectTaget==="function") target = injectTaget.prototype;
            let src = Xable.prototype;
            for(let n in src){
                target[n] = src[n];
            }
        }
    }

    export interface IEventHandler{
        (sender:any,eventArgs:IEventArgs):any;
    }
    export interface IEventArgs{
        [key:string]:any;
        type?:string;
        src?:any;
        canceled?:boolean;
    }
    export interface IEventCapture{
        handler:IEventHandler;
        raw:IEventHandler;
        capture:object;
    }
    export interface IObservable{
        subscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable;
        unsubscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable;
        notify(event:string,args:IEventArgs):IObservable;
        get_eventHandlers(event:string,addIfNone?:boolean):IFuncs;
    }
    

    export class Observable implements IObservable{
        private _eventMaps:{[evtName:string]:IFuncs};

        constructor(injectTaget?:Function|object){
            if(injectTaget)xable(injectTaget,Observable);
        }

        subscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable{
            let handlers = this.get_eventHandlers(event,true);
            handlers.add(capture?{handler:handler,capture:this,src:handler}:handler);
            return this;
        }
        unsubscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable{
            if(event==="<clear-all>") {
                this._eventMaps = undefined;
                return this;
            } 
            let maps = this._eventMaps;
            if(maps) {
                let handlers = maps[event];
                if(handlers) handlers.remove(capture?{handler:handler,src:handler,capture:this}:handler);
            }
            return this;
        }

        notify(event:string,args:IEventArgs):IObservable{
            let maps = this._eventMaps;
            if(maps) {
                let handlers = maps[event];
                if(handlers)handlers.call(this,args);
            }
            return this;
        }
        get_eventHandlers(event:string,addIfNone?:boolean):IFuncs{
            let maps = this._eventMaps || (this._eventMaps={});
            let handlers = maps[event];
            if(!handlers && addIfNone) maps[event]=handlers=createFuncs(2
                ,(handler:any)=>(handler as IEventCapture).handler||handler
                ,(e1,e2)=>e1===e2||(e1.capture===e2.capture&& e1.raw==e2.raw)
            );
            return handlers;
        }
    }

    /*=========================================================
     * 网页处理
     *========================================================*/

    export function createElement(tagName:string){
        return document.createElement(tagName);
    }

    export let getStyle = (obj:HTMLElement,attr:string):string =>{
        if((obj as any).currentStyle){//兼容IE
            getStyle = YA.getStyle = (obj:HTMLElement,attr:string):string=>(obj as any).currentStyle[attr];
        }else{
            getStyle = YA.getStyle = (obj:HTMLElement,attr:string):string=>{
                let f:any = false;
                return getComputedStyle(obj,f)[attr];
            };
        }
        return getStyle(obj,attr);
    }
    export let attach = (elem:HTMLElement,event:string,handler:Function)=>{
        if(elem.addEventListener){
            attach = YA.attach = (elem:HTMLElement,event:string,handler:Function)=>elem.addEventListener(event,handler as any,false);
        }else {
            attach = YA.attach = (elem:HTMLElement,event:string,handler:Function)=>(elem as any).attachEvent("on" +event,handler as any);
        }
        return attach(elem,event,handler);
    }
    export let detech = (elem:HTMLElement,event:string,handler:Function)=>{
        if(elem.removeEventListener){
            detech = YA.detech = (elem:HTMLElement,event:string,handler:Function)=>elem.removeEventListener(event,handler as any,false);
        }else {
            detech = YA.detech = (elem:HTMLElement,event:string,handler:Function)=>(elem as any).detechEvent("on" +event,handler as any);
        }
        return detech(elem,event,handler);
    }

    export function replaceClass(element:HTMLElement,addedCss:string,removeCss?:string){
        let clsText = element.className||"";
        let clsNames = clsText.split(/\s+/g);
        for(let i =0,j= clsNames.length;i<j;i++){
            let clsn = clsNames.shift();
            if(clsn==="") continue;
            if(clsn===removeCss){ clsNames.push(addedCss);addedCss = null; continue;}
            clsNames.push(clsn);
        }
        if(addedCss) clsNames.push(addedCss);
        element.className = clsNames.join(" ");
    }
    export function isInview(element:HTMLElement):boolean{
        let doc = element.ownerDocument;
        while(element){
            if(element===doc.body) return true;
            element = element.parentNode as HTMLElement;
        }
        return false;
    }

    export interface IFieldPathsOpts{
        detail?:string;
        edit?:string;
        filter?:string;
        cell?:string;
    }

    export interface IFieldOpts{
        
        /**
         * 字段名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        name?:string;

        constValue?:any;

        /**
         * 类型
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        type?:string;

        
        /**
         * 是否是主键
         *
         * @type {boolean}
         * @memberof IFieldOpts
         */
        isPrimary?:boolean;


        /**
         *  在数据对象上的路径
         *
         * @type {IFieldPathsOpts|string}
         * @memberof IFieldOpts
         */
        paths?:IFieldPathsOpts|string;


        /**
         * 显示名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        label?:string;

        /**
         * 说明
         *
         * @type {string}
         * @memberof IField
         */
        remark?:string;

        

        validations:{[name:string]:any};

        
    }

    export interface IDropdownFieldOpts extends IFieldOpts{
        itemKey?:string;
        itemText?:string;
        noSelectedText?:string;
        isObjectValue?:boolean;
        items?:any;
    }

    


    export interface IFieldViewAccessor extends IAccessor {
        valuechange:(handler:(value:any)=>any)=>any;
        element:HTMLElement;
        validate?:(value:any,lng:(txt:string)=>string)=>string;
    
    }
    export interface IDataPaths{
        detail:DPath;
        edit:DPath;
        filter:DPath;

        cell:DPath;
    }
    export class DataPaths implements IDataPaths{
        detail:DPath;
        edit:DPath;
        filter:DPath;
        cell:DPath;
        constructor(opts:IFieldPathsOpts|string){
            if(typeof opts==="string"){
                this.detail = this.filter = this.edit = this.cell = DPath.fetch(opts as string);
            }else {
                this.detail = DPath.fetch(opts.detail || opts.edit || opts.cell);
                this.detail = DPath.fetch(opts.edit || opts.detail || opts.cell);
                this.filter = DPath.fetch(opts.filter || opts.cell || opts.edit || opts.detail);
                this.cell = DPath.fetch(opts.cell || opts.detail || opts.edit);
            }
        }
        
    }

    export class Field{
        opts:IFieldOpts;
        name:string;
        type:string;
        paths:IDataPaths;
        label:string;
        validations:{[name:string]:any};
        required:boolean;
        fieldset:Fieldset;
        className:string;
        dataViewCreator:(field:Field,fieldView:FieldView)=>IFieldViewAccessor;
    
        constructor(fieldOpts:IFieldOpts,fieldset?:Fieldset){
            this.opts = fieldOpts;
            this.fieldset = fieldset;
            this.type = fieldOpts.type || "text";
            this.name = fieldOpts.name;
            
            this.label = fieldOpts.label || this.name;
            this.validations = fieldOpts.validations || {};
            if(!this.validations[this.type]){
                let validator = validators[this.type];
                if(validator) this.validations[this.type] = true;
            }
            this.required = this.validations.required;
            this.className = "field " + this.type + " " + this.name;
            
            this.dataViewCreator = fieldDataViewCreators[this.type] || fieldDataViewCreators["text"];
            
        }

        path(fieldViewType:FieldViewTypes):DPath{
            if(!this.paths) {
                if(this.opts.constValue!==undefined){
                    let constPath = DPath.const(this.opts.constValue);
                    this.paths ={
                        cell : constPath,
                        edit:constPath,
                        detail:constPath,
                        filter:constPath
                    };
                }else this.paths = new DataPaths(this.opts.paths|| this.name);
                
            } 
            switch(fieldViewType){
                case FieldViewTypes.Edit:return this.paths.edit;
                case FieldViewTypes.Detail:return this.paths.detail;
                case FieldViewTypes.Cell:return this.paths.cell;
                case FieldViewTypes.Filter:return this.paths.filter;
            }
        }

        
        validate(value:any,lng:(txt:string)=>string,isCheckRequired:boolean):string{
            let validRs:string;
            if(this.required && isCheckRequired){
                let requireValid = validators["required"];
                validRs = requireValid(value,true,lng);
                if(validRs) return validRs;
            }
            let validations = this.validations;
            for(let validName in validations){
                if(validName==="required") continue;
                let validator = validators[validName];
                if(!validator){ 
                    if(executionMode===ExecutionModes.Devalopment) console.warn("找不到验证器",validName,this);
                    continue;
                }
                validRs = validator(value,validations[validName],lng);
                if(validRs) return validRs;
            }
            return validRs;
        }
    }

    export interface IFieldsetOpts{
        name?:string;
        fields:{[name:string]:IFieldOpts}
    }

    

    export class Fieldset{
        __opts__:IFieldsetOpts;
        __name__:string;
        __primary__:Field;
        constructor(opts:IFieldsetOpts){
            this.__opts__ = opts;
            this.__name__ = opts.name;
            let fields = this.__opts__.fields;
            let idField:Field;
            for(let name in fields){
                let fieldOpts = fields[name];
                if(!fieldOpts.name) fieldOpts.name = name;
                let field:Field = (this as any)[name] = new Field(fieldOpts,this);
                if(fieldOpts.isPrimary) this.__primary__ = field;
                if(name=="Id" ||name=="ID" || name=="id") idField = field; 
                
            }
            if(!this.__primary__) this.__primary__ = idField;
        }

        TEXT(txt:string):string{
            return txt;
        }
    }

    export enum FieldViewTypes{

        /**
         * 显示为一个Button或超连接
         */
        Button,

        /**
         * 显示为一个只读的字段，带着字段名与字段说明
         */
        Detail,

        /**
         * 显示为一个可编辑的字段，带着字段名，验证信息等
         */
        Edit,

        /**
         * 显示为一个表格的单元格内容
         */
        Cell,

        /**
         * 显示为一个表格头的单元格内容
         */
        HeadCell,
        
        /**
         * 显示为查询条件的字段，去掉必填标记，验证信息显示在title上
         */
        Filter
    }

    export enum AccessPermissions{

        
        /**
         * 可写
         */
        Writable,

        /**
         * 可读
         */
        Readonly,
        Hidden,
        /**
         * 禁止访问
         */
        Denied
        
        
    }
    export enum FieldActionTypes{
        
        /**
         * 没有动作
         */
        None,
        /**
         * 呼叫函数
         */
        Call,

        /**
         * 跳转
         */
        Navigate,

        /**
         * 新建一个window
         */
        NewWindow,

        /**
         * 弹出一个对话框
         */
        Dialog,

        /**
         * 下转
         */
        Dive

    }
    export interface IFieldViewOpts extends IFieldOpts{
        className?:string;
        layout?:string;
        width?:number;
        field?:Field;
        accessPermission?:AccessPermissions;
        feildViewType?:FieldViewTypes|string;
        actionType?:FieldActionTypes|string;
        action?:any;

    }

    export class FieldView implements IAccessor{
        opts:IFieldViewOpts;
        field:Field;
        fieldsetView:FieldsetView;
        element:HTMLElement;
        dataViewAccessor:IFieldViewAccessor;
        errorMessage:(message:string)=>void;
        _fieldViewType:FieldViewTypes;
        path:DPath;
        accessPermission:AccessPermissions;
        
        actionType:FieldActionTypes;
        action:any;


        constructor(opts:IFieldViewOpts,fieldsetView?:FieldsetView){
            this.opts = opts;
            this.fieldsetView = fieldsetView;
            this.accessPermission = opts.accessPermission;
            this.actionType = (typeof opts.actionType==="string") ? FieldActionTypes[opts.actionType as string] : opts.actionType;
            this.action = opts.action;
            this.field = opts.field;
            if(this.actionType===undefined){
                var t = typeof opts.action;
                if(t==="function") this.actionType = FieldActionTypes.Call;
                else if(t==="string") this.actionType = FieldActionTypes.Navigate;
                else this.actionType = FieldActionTypes.None; 
            }
            if(!this.field){
                if(fieldsetView){
                    let fieldset = fieldsetView.fieldset;
                    if(fieldset)this.field = fieldset[opts.name];
                }
                if(!this.field){
                    this.field = new Field(opts);
                }
            }
            
            let viewType = (typeof opts.feildViewType==="string") ? FieldViewTypes[opts.feildViewType as string] : opts.feildViewType;
            if(viewType===undefined){
                if(fieldsetView){
                    switch(fieldsetView.fieldsetViewType){
                        case FieldsetViewTypes.Detail:viewType = FieldViewTypes.Detail;break;
                        case FieldsetViewTypes.Edit:viewType = FieldViewTypes.Edit;break;
                        case FieldsetViewTypes.Filter:viewType = FieldViewTypes.Filter;break;
                        case FieldsetViewTypes.Row:viewType = FieldViewTypes.Cell;break;
                        case FieldsetViewTypes.HeadRow:viewType = FieldViewTypes.HeadCell;break;
                    }
                }else viewType = FieldViewTypes.Detail;
            }
            this.fieldViewType(viewType);
        }

        fieldViewType(type?:FieldViewTypes):FieldView|FieldViewTypes{
            if(type===undefined) return this._fieldViewType;
            if(type!=this._fieldViewType){
                this._fieldViewType = type;
                this.path = this.field.path(type);
                this.element = this.makeElement(this.element);
            }
            return this;
        }

        

        makeLabelElement(wrapper:HTMLElement,isMarkRequired:boolean):HTMLElement{
            let labelElem = YA.createElement("label") as HTMLLabelElement;
            wrapper.appendChild(labelElem);
            labelElem.className = "label";
            labelElem.htmlFor = this.field.label;
            let labelText = this.field.label;
            if(this.field.required && isMarkRequired){
                labelElem.innerHTML = labelText + "<ins>*</ins>";
            }else labelElem.innerHTML = labelText;
            return labelElem;
        }

        makeElement(wrapper?:HTMLElement):HTMLElement{
            if(!wrapper) wrapper = this.element || (this.element = YA.createElement("div"));
            this.element.innerHTML = "";
            wrapper.className = this.field.className;
            if(this.opts.className) wrapper.className += " " + this.opts.className;
            if(this.opts.width) wrapper.style.width = this.opts.width + "px";
            if(this.isHidden()) wrapper.style.display = "none";
            if(this._fieldViewType== FieldViewTypes.HeadCell){
                wrapper.innerHTML=this.fieldsetView.TEXT(this.field.name);
                return wrapper;
            }

            if(this._fieldViewType!= FieldViewTypes.Cell && this._fieldViewType!= FieldViewTypes.Button){
                this.makeLabelElement(wrapper,this._fieldViewType === FieldViewTypes.Edit || this._fieldViewType === FieldViewTypes.Detail);
            }
            

            let dataElem = YA.createElement("div");
            wrapper.appendChild(dataElem);
            dataElem.className = "data";
                        
            let dataViewAccessor:IFieldViewAccessor = this.dataViewAccessor = this.field.dataViewCreator(this.field,this);
            if(dataViewAccessor.valuechange)dataViewAccessor.valuechange((value)=>this.setValue(value,false));
            dataElem.appendChild(dataViewAccessor.element);
            

            if(this._fieldViewType == FieldViewTypes.Detail){
                let remarkElem = YA.createElement("label") as HTMLLabelElement;
                wrapper.appendChild(remarkElem);
                remarkElem.className = "remark";
                remarkElem.htmlFor = this.field.name;
                this.errorMessage = (msg)=>remarkElem.innerHTML = msg;
            }else {
                this.errorMessage = (msg)=>this.dataViewAccessor.element.title = msg;
            }
            
            return wrapper;
            
        }
        getValue():any{
            return this.path.getValue(this.fieldsetView.getValue());
        }
        setValue(value:any,refresh?:boolean):FieldView{
            
            if(refresh!==false)this.dataViewAccessor.setValue(value);
            this.path.setValue(this.fieldsetView.getValue(),value);
            if(this.isWritable())this.validate(value);
            return this;
        }

        refresh():FieldView{
            let value = this.path.getValue(this.fieldsetView.getValue());
            this.dataViewAccessor.setValue(value);
            if(this.isWritable())this.validate(value);
            return this;
        }
        validate(value?:any):string{
            if(this.isReadonly()){
                if(executionMode===ExecutionModes.Devalopment){
                    console.warn("正在验证只读字段",this,value);
                }
                return;
            }
            if(value===undefined) value=this.getValue();
            let lng = (txt)=>this.fieldsetView.TEXT(txt);
            let rs = this.field.validate(value,lng,this._fieldViewType==FieldViewTypes.Edit || this._fieldViewType==FieldViewTypes.Cell);
            
            if(!rs && this.dataViewAccessor.validate) rs = this.dataViewAccessor.validate(value,lng);

            if(rs){
                replaceClass(this.element,"validate-error","validate-success");
            }else {
                replaceClass(this.element,"validate-success","validate-error");
            }
            return rs;
        }

        isWritable(){
            if(this.accessPermission!==undefined ) return this.accessPermission === AccessPermissions.Writable || this.accessPermission == AccessPermissions.Hidden;
            return this._fieldViewType === FieldViewTypes.Edit || this._fieldViewType === FieldViewTypes.Filter ;
        }

        isReadable(){
            return this.accessPermission ===undefined || this.accessPermission!==AccessPermissions.Denied;
        }

        isReadonly(){
            if(this.accessPermission!==undefined ) return this.accessPermission === AccessPermissions.Readonly || this.accessPermission === AccessPermissions.Denied;
            return this._fieldViewType === FieldViewTypes.Cell || this._fieldViewType === FieldViewTypes.Detail || this._fieldViewType===FieldViewTypes.Button ;
        }

        isDenied(){
            if(this.accessPermission!==undefined ) return this.accessPermission === AccessPermissions.Denied;
            return false;
        }
        isHidden(){
            if(this.accessPermission!==undefined ) return this.accessPermission === AccessPermissions.Hidden;
            return false;
        }
        
    }
    let requiredValidator = (value,opts,lng:(txt:string)=>string):string=>{
        let msg;
        if(isObject(opts)) msg = opts.message;
        if(!value) return lng(msg || "必填");
        for(let n in value){
            return;
        }
        return lng(msg || "必填");
    } 
    export let validators :{[name:string]:(value,opts,lng:(txt:string)=>string)=>string} = {
        required:requiredValidator,
        length:(value:any,opts:any,lng:(txt:string)=>string)=>{
            let min,max,message;
            if(isObject(opts)){
                min = opts.min;max=opts.max;
                message = opts.message;
            }else max = parseInt(opts);
            if(!value) {
                if(min) return message ? message.replace("{{min}}",min).replace("{{max}}",min) :lng("长度不能少于{{min}}个字符").replace("{min}",min);
            }
            let len = value.toString().replace(trimRegx,"").length;
            if(min && len<min) return message ? message.replace("{{min}}",min).replace("{{max}}",min) :lng("长度不能少于{{min}}个字符").replace("{min}",min);
            if(max && len>max) return message ? message.replace("{{min}}",min).replace("{{max}}",min) :lng("长度不能超过{{max}}个字符").replace("{max}",max);
        },
        regex:(value:any,opts:any,lng:(txt:string)=>string)=>{
            let reg:RegExp ,message,result;
            if(opts.match){
                reg = opts;
                message = lng("格式不正确");
            }else {
                reg = opts.reg;
                message = lng(opts.message||"格式不正确");
            }
            if(!value)return;
            if(!reg.test(value.toString())) return message;
            return;
        },
    };

    export let fieldDataViewCreators :{[type:string]:(field:Field,fieldView:FieldView)=>IFieldViewAccessor}  = {};
    function makeInputAccessor(inputElement:HTMLInputElement,isReadonly?:boolean){
        let tick;
        
        return {
            element :inputElement,
            getValue:()=>isReadonly?inputElement.innerHTML:inputElement.value,
            setValue:(value)=>{if(isReadonly)inputElement.innerHTML=value;else inputElement.value = value;},
            valuechange:(handler:(value)=>any)=>{
                if(isReadonly) return;
                let immidiate = ()=>{tick=0;handler(inputElement.value);};
                let newTick = ()=>{
                    if(tick) clearTimeout(tick);
                    tick = setTimeout(immidiate, 200);
                };
                attach(inputElement,"keyup",newTick);
                attach(inputElement,"keydown",newTick);
                attach(inputElement,"blur",immidiate);
                attach(inputElement,"change",immidiate);
            }
        };
    }
    fieldDataViewCreators.text = (field:Field,fieldView:FieldView):IFieldViewAccessor =>{
        if(fieldView.isReadonly()){
            let span = YA.createElement("SPAN");
            span.innerHTML = fieldView.getValue();
            return makeInputAccessor(span as HTMLInputElement,true);
        }
        let inputElement = YA.createElement("input") as HTMLInputElement;
        inputElement.type = "text";
        return makeInputAccessor(inputElement);
    };

    fieldDataViewCreators.textarea = (field:Field,fieldView:FieldView):IFieldViewAccessor =>{

        if(fieldView.isReadonly()){
            let span = YA.createElement("div");
            span.innerHTML = fieldView.getValue();
            return makeInputAccessor(span as HTMLInputElement,true);
        }

        let inputElement = YA.createElement("textarea") as HTMLInputElement;
        return makeInputAccessor(inputElement);
    };
    
    fieldDataViewCreators.dropdown = (field:Field,fieldView:FieldView):IFieldViewAccessor =>{
        let readonly = fieldView.isReadonly();

        let inputElement = readonly?YA.createElement("span") as HTMLSelectElement:YA.createElement("select") as HTMLSelectElement;
        inputElement.value = fieldView.getValue();
        let ddOpts = field.opts as IDropdownFieldOpts;
        let keypath = DPath.fetch(ddOpts.itemKey||"Id");
        let textpath = DPath.fetch(ddOpts.itemText||"Text");
        let items :any[];
        let itemsOpt = ddOpts.items;

        function makeItems(items){
            
            if(readonly){
                let key = fieldView.getValue();
                for(let i=0,j=items.length;i<j;i++){
                    let item = items[i];
                    let id= keypath.getValue(item);
                    if(id==key){
                        inputElement.innerHTML = textpath.getValue(item);
                        (inputElement as any).__YA_SELECTITEM = item;
                        break;
                    }
                }
                inputElement.innerHTML = "";
            }else {
                buildSelectOptions(inputElement,items||[],keypath,textpath,fieldView.fieldsetView.TEXT(ddOpts.noSelectedText||"请选择..."));
            }
        }
        if(itemsOpt.url){
            let ajaxOpts = itemsOpt as IAjaxOpts;
            if(readonly){
                inputElement.innerHTML = fieldView.fieldsetView.TEXT("加载中...");
            }else {
                buildSelectOptions(inputElement,[],keypath,textpath,fieldView.fieldsetView.TEXT("加载中..."));
               
            }
            YA.ajax(ajaxOpts).then((value)=>{
                items = value;
                makeItems(value);
                
            });
            
        }else if(isArray(itemsOpt)){
            items = itemsOpt;
            makeItems(itemsOpt);
        }

        if(readonly){
            return {
                element:inputElement,
                getValue:()=>ddOpts.isObjectValue?(inputElement as any).__YA_SELECTITEM:keypath.getValue((inputElement as any).__YA_SELECTITEM),
                setValue:(value)=>{
                    let key = value;
                    if(isObject(value)){
                        key = keypath.getValue(value);
                    }
                    for(let i=0,j=items.length;i<j;i++){
                        let item = items[i];
                        let id= keypath.getValue(item);
                        if(id==value){
                            inputElement.innerHTML = textpath.getValue(item);
                            (inputElement as any).__YA_SELECTITEM = item;
                            break;
                        }
                    }
                    inputElement.innerHTML="";
                },
                valuechange:(handler)=>{}
            };
        }
        return {
            element :inputElement,
            getValue:()=>{
                let opt = inputElement.options[inputElement.selectedIndex];
                return ddOpts.isObjectValue?(opt as any).__YA_SELECTITEM:opt.value;
            },
            setValue:(value)=>{
                let key = value;
                if(isObject(value)){
                    key = keypath.getValue(value);
                }
                for(let i=0,j=inputElement.options.length;i<j;i++){
                    let opt= inputElement.options[i];
                    if(opt.value===key) {
                        inputElement.selectedIndex = i;
                        opt.selected = true;
                        break;
                    }
                }
            },
            valuechange:(handler:(value)=>any)=>{
                
                let immidiate = ()=>{
                    let opt = inputElement.options[inputElement.selectedIndex];
                    let value = ddOpts.isObjectValue?(opt as any).__YA_SELECTITEM:opt.value;
                    handler(value);
                };
                
                attach(inputElement,"blur",immidiate);
                attach(inputElement,"change",immidiate);
            }
        };
    };

    function buildSelectOptions(select:HTMLSelectElement,items:any[],keypath:DPath,textpath:DPath,noSelected?:string){
        select.innerHTML = "";
        if(noSelected){
            let option = YA.createElement("option") as HTMLOptionElement;
            option.value="";option.text = noSelected;
            select.appendChild(option);
        }
        for(let i =0,j=items.length;i<j;i++){
            let item = items[i];
            let option = YA.createElement("option") as HTMLOptionElement;
            option.value=keypath.getValue(item);option.text = textpath.getValue(item);
            (option as any).__YA_SELECTITEM = item;
            select.appendChild(option);
        }
    }

    export enum FieldsetViewTypes{
        Detail,
        Edit,
        Filter,
        Row,
        HeadRow

    }
    export interface IFieldsetViewOpts extends IFieldsetOpts{
        //layoutName?:string;
        element?:HTMLElement;
        fieldsetViewType : FieldsetViewTypes|string;
        fields:{[name:string]:IFieldViewOpts};
        fieldset?:Fieldset;
        
    }

    export class FieldsetView{
        opts:IFieldsetViewOpts;
        name:string;
        fieldset:Fieldset;
        fieldviews:FieldView[];
        fieldsetViewType:FieldsetViewTypes;
        element:HTMLElement;
        selectedIds:any[];
        constructor(opts:IFieldsetViewOpts){
            this.opts = opts;
            this.element = opts.element;
            this.fieldset = opts.fieldset;
            this.fieldsetViewType =  (typeof opts.fieldsetViewType==="string") ? FieldsetViewTypes[opts.fieldsetViewType as string] : opts.fieldsetViewType;
            this._makeDetailElement(this.name);
            
        }


        _makeDetailElement(layoutName:string){
            let fields = this.opts.fields;
            this.fieldviews=[];
            let elem = this.element || YA.createElement("div");
            elem.innerHTML = "";
            elem.className = "fieldset " + (layoutName||"");
            
            
            
            for(let name in fields){
                let fieldOpts:IFieldViewOpts = fields[name];
                if(fieldOpts.accessPermission=== AccessPermissions.Denied) continue;
                if(layoutName!==undefined){
                    let layout = fieldOpts.layout||"";
                    if(layout!==layoutName) continue;
                }   
                if(!fieldOpts.name) fieldOpts.name = name;
                //let restoredType = fieldOpts.feildViewType;
                let fieldView = new FieldView(fieldOpts,this);
                this.fieldviews.push(fieldView);
                elem.appendChild(fieldView.element);
                
                
            }
            
        }
        
        _data:any;

        TEXT(txt:string):string{
            return txt;
        }
        
        getValue():any{
            return this._data||(this._data={});
        }

        setValue(value:any):FieldsetView{
            let data = this._data = value ||{};
            for(let name in this.fieldviews){
                let fieldview = this.fieldviews[name];
                fieldview.refresh();
            }
            return this;
        }

        validate(){
            let rs:{[index:string]:string};
            let hasError = false;
            for(let i in this.fieldviews){
                let fieldview = this.fieldviews[i];
                let fieldValid = fieldview.validate();
                if(fieldValid){if(!rs)rs={}; rs[fieldview.field.name] = fieldValid; hasError=true;}
            }
            return rs;
        }
    }
    /*
    export class FieldsetViewx{
        opts:IFieldsetViewOpts;
        name:string;
        primaryField:Field;
        length:number;
        fieldset:Fieldset;
        fieldviews:{[name:string]:FieldView};
        fieldsetViewType:FieldsetViewTypes;
        element:HTMLElement;
        selectedIds:any[];
        constructor(opts:IFieldsetViewOpts){
            this.opts = opts;
            
            this.name = opts.name || "";
            this.fieldsetViewType = (typeof opts.fieldsetViewType==="string") ? FieldsetViewTypes[opts.fieldsetViewType as string] : opts.fieldsetViewType;
            //this.fieldsetViewType = FieldsetViewTypes.Detail;
            this.fieldset = opts.fieldset;
            //this.selectedIds = opts.selectedIds;
            this._makeElement(this.name);
        }

        

        _makeElement(layoutName:string){
            let fields = this.opts.fields;
            let selectedIds = this.opts.selectedIds;
            this.fieldviews = {};
            let elem = this.element || (this.element = YA.createElement(this.fieldsetViewType === FieldsetViewTypes.Row?"tr":"div"));
            elem.innerHTML = "";
            elem.className = "fieldset " + layoutName;
            
            
            let primaryField :Field = this.primaryField;
            if(this.fieldset) primaryField = this.fieldset.__primary__;
            let idField:any;
            this.length = 0;
            for(let name in fields){
                let fieldOpts:IFieldViewOpts = fields[name];
                if(fieldOpts.accessPermission=== AccessPermissions.Denied) continue;
                if(layoutName!==undefined){
                    let layout = fieldOpts.layout||"";
                    if(layout!==layoutName) continue;
                }   
                if(!fieldOpts.name) fieldOpts.name = name;
                //let restoredType = fieldOpts.feildViewType;
                let fieldView = new FieldView(fieldOpts,this);
                this.fieldviews[name] = fieldView;
                elem.appendChild(fieldView.element);
                if(selectedIds){
                    if(name=="Id" || name=="ID" || name=="id") idField = fieldView.field;
                }
                this.length++;
                
            }
            if(!primaryField)primaryField=idField;
            if(selectedIds && (this.fieldsetViewType === FieldsetViewTypes.Row|| this.fieldsetViewType === FieldsetViewTypes.HeadRow)){
                let cellElem = YA.createElement("TD");
                let chkElem = YA.createElement("input") as HTMLInputElement;
                
                chkElem.type = "checkbox";
                if(this.fieldsetViewType === FieldsetViewTypes.Row){
                    cellElem.appendChild(chkElem);
                    chkElem.value = primaryField.path(FieldViewTypes.Cell).getValue(this._data);
                    chkElem.onclick = chkElem.onchange = function(e){
                        let currentId = (this as HTMLInputElement).value;
                        if((this as HTMLInputElement).checked){
                            let hasIt = false;
                            for(let i=0,j=selectedIds.length;i<j;i++){
                                if(selectedIds[i]===currentId) {
                                    hasIt = true;break;
                                }
                            }
                            if(!hasIt) selectedIds.push(currentId);
                        }else {
                            for(let i=0,j=selectedIds.length;i<j;i++){
                                let existed = selectedIds.shift();
                                if(existed!=currentId) selectedIds.push(existed);
                            }
                        }
                    };
                }
                
            }
        }
        
        _data:any;

        TEXT(txt:string):string{
            return txt;
        }
        
        getValue():any{
            return this._data;
        }

        setValue(value:any):FieldsetViewx{
            let data = this._data = value ||{};
            for(let name in this.fieldviews){
                let fieldview = this.fieldviews[name];
                fieldview.refresh();
            }
            return this;
        }
    }*/
/*
    export enum FieldPanelTypes{
        Detail,
        Edit,
        Table,
        Grid
    }

    export interface IFeildPanelLayoutView{
        appendChild(elem:HTMLElement);
        
        clear();
    }
    export interface IFieldPanelOpts extends IFieldsetViewOpts{
        fieldPanelType?:FieldPanelTypes | string;
        data?:any;
        pageSize?:number|string;
        items?:any[]|string;
        detail?:any|string;
        filter?:any|string;
    }

    
    
    export class FieldPanel{
        opts:IFieldPanelOpts;
        _data:any;
        _total:number;
        _items:any[];
        
        layouts:{[name:string]:any};

        detailPath:DPath;
        filterPath:DPath;
        itemsPath:DPath;
        pageSizePath:DPath;
        totalPath:DPath;

        //itemOpts:IFieldsetViewOpts;
        element:HTMLElement;
        fieldPanelType:FieldPanelTypes;
        //headView:FieldsetView;
        //fieldsetViews:{[name:string]:FieldsetView};
        //fieldsetView:FieldsetView;
        isCollection:boolean;
        constructor(opts:IFieldPanelOpts){
            this.opts = opts;
            this._data = opts.data;
            this.fieldPanelType = (typeof opts.fieldPanelType==="string") ? FieldPanelTypes[opts.fieldPanelType as string] : opts.fieldPanelType;
            if(this.fieldPanelType== FieldPanelTypes.Grid || this.fieldPanelType == FieldPanelTypes.Table){
                this.opts.fieldsetViewType = FieldsetViewTypes.Row;
                this.isCollection = true;
            }else this.opts.fieldsetViewType = FieldsetViewTypes[FieldPanelTypes[this.fieldPanelType]];
            let fields = opts.fields;
            let layouts:{[name:string]:boolean} = {};
            for(let name in fields){
                let fieldOpts:IFieldViewOpts = fields[name];
                if(fieldOpts.accessPermission=== AccessPermissions.Denied || fieldOpts.accessPermission=== AccessPermissions.Hidden) continue;
                layouts[fieldOpts.layout||""] = true;
            }
            this.makeElement();
        }

        pageSize(value?:number):number|FieldPanel{
            if(!this.pageSizePath){
                if(typeof this.opts.pageSize==="string"){
                    this.pageSizePath = DPath.fetch(this.opts.pageSize);
                }else {
                    this.pageSizePath = DPath.const(this.opts.pageSize);
                }
            }
            if(value===undefined){
                return this.pageSizePath.getValue(this._data);
            }
            throw "Not Implement";
        }

        items(value?:any[]):number|FieldPanel{
            if(!this.itemsPath){
                if(typeof this.opts.pageSize==="string"){
                    this.pageSizePath = DPath.fetch(this.opts.pageSize);
                }else {
                    this.pageSizePath = DPath.const(this.opts.pageSize);
                }
            }
            if(value===undefined){
                return this.pageSizePath.getValue(this._data);
            }
            throw "Not Implement";
        }
        
        makeElement(){
            //let element :HTMLElement;
            //if(this.element) (element =this.element).innerHTML = "";
            //else this.element = element = YA.createElement("div");
            //this.fieldsetViews = {};
            //if(this.fieldPanelType== FieldPanelTypes.Detail || this.fieldPanelType == FieldPanelTypes.Edit){
            //    for(let n in this.layouts){
            //        let name = this.opts.name;this.opts.name = n;
             //       this.fieldsetView = this.fieldsetViews[n] = new FieldsetView(this.opts);
            //        this.opts.name = name;
            //        this.element.appendChild(this.fieldsetView.element);
            //    }
            //}
        }

        makeTableElement(layoutName:string){
            let tb = YA.createElement("table");
            let thead = YA.createElement("thead");tb.appendChild(thead);
            if(!this.headView){
                let headOpts = extend({},this.opts);
                headOpts = FieldsetViewTypes.HeadRow;
                
                this.headView = new FieldsetView(headOpts);
                
            }
            thead.appendChild(this.headView.element);
            let tbody = YA.createElement("tbody");tb.appendChild(tbody);
            let rowDatas = this._data;
            if(!rowDatas){
                let tr = YA.createElement("tr");tbody.appendChild(tr);
                let td = YA.createElement("td") as HTMLTableCellElement;tr.appendChild(td);td.colSpan = this.headView.length;
                td.innerHTML = "加载中...";
            }else if(rowDatas.length==0){
                let tr = YA.createElement("tr");tbody.appendChild(tr);
                let td = YA.createElement("td") as HTMLTableCellElement;tr.appendChild(td);td.colSpan = this.headView.length;
                td.innerHTML = "没有数据";
            }else{
                this.fieldsetViews = {};
                for(let i=0,j=rowDatas.length;i<j;i++){
                    this.fieldsetView = this.fieldsetViews[i] = new FieldsetView(this.opts);
                    tbody.appendChild(this.fieldsetView.element);
                }
            }
        }

        getValue():any{
            return this._data;
        }

        setValue(value:any):FieldPanel{
            let data = this._data = value ||{};
            for(let name in this.fieldsetViews){
                let fieldsetview = this.fieldsetViews[name];
                fieldsetview.setValue(value);
            }
            return this;
        }
    }*/

    export interface ILayout{
        
        appendElement(lyname:string,element?:HTMLElement):Element;

        /**
         * 查找布局元素
         *
         * @param {string} lyName
         * @param {boolean} [noUseCache]
         * @memberof ILayoutMaster
         */
        findElement(lyName:string,noUseCache?:boolean);

        /**
         * 清空布局元素
         *
         * @param {string} [lyName]
         * @memberof ILayoutMaster
         */
        clearElement(lyName?:string);

        /**
         * 找到/新添布局元素
         *
         * @param {string} lyName
         * @param {boolean} [noUseCache]
         * @memberof ILayoutMaster
         */
        sureElement(lyName:string,noUseCache?:boolean);

        
    }
    /*
    class LayoutCache{
        name:string;
        element:HTMLElement;
        paths:string[];
    }

    export class Layout {
        opts:any;
        element:HTMLElement;
        _caches:{[name:string]:LayoutCache};
        protected _appendLayoutElement:(parentLayoutElement:HTMLElement,currName:string,num:number,fullpath:string)=>any;
        //_layoutPaths:{[name:string]:string[]};
        constructor(opts:any){
            this.element = opts.element;
            this._appendLayoutElement = opts.appendLayoutElement;
            if(!this._appendLayoutElement) this._appendLayoutElement = (p:HTMLElement,currName:string,num:number,fullpath:string):any=>{
                let currLayout = YA.createElement("div");
                p.appendChild(currLayout);
                return currLayout;
            };
        }
        getCache(pathstr:string):LayoutCache{
            let caches = this._caches ||(this._caches={});
            let cached :LayoutCache = caches[pathstr];
            cached.paths = pathstr.split("->");
            return cached;
        }
        appendElement(lyname:string,element:HTMLElement):HTMLElement{
            return null;
        }
        findElement(lyName:string,notUseCache?:boolean):HTMLElement{
            let cached = this._caches[lyName];
            if(notUseCache===true || !cached.element) {
                return this._findElement(this.element,cached.paths);
            }
            let elem = cached.element;
            if(notUseCache===false) return elem;
            if(this._checkIn(this.element,elem)) return elem;
        }
        clearELement(lyName?:string) : Layout{
            if(lyName===undefined){
                this.element.innerHTML = "";
                return this;
            }
            let elem = this.findElement(lyName);
            if(elem) elem.innerHTML="";
            return this;
        } 
        sureElement(lyName:string,notUseCache?:boolean){
            let cached = this._caches[lyName];
            let elem :HTMLElement;
            
            if(notUseCache===true) {
                elem = cached.element = this._findElement(this.element,cached.paths);
            }else elem = cached.element;
            
            if(elem) return elem;
            
            let paths = cached.paths;
            
            let curr=this.element;
            let subpath = "";
            for(let i =0,j=paths.length;i<j;i++){
                let path = paths[i];
                let elem = this._findChildren(curr,path);
                if(elem){
                    curr = elem;
                    continue;
                }
                if(!curr) {
                    curr= this._appendLayoutElement(curr,path,i,cached.name);
                    curr.setAttribute("layout-name",path);
                    
                    let subpaths = [];
                    for(let m=1,n=i;m<n;m++){
                        subpaths.push(paths[m]);
                    }
                    this._caches[subpath]={
                        name:subpaths.join("->"),
                        paths :subpaths,
                        element:curr
                    };
                }
            }
            return curr;
        }
        _findChildren(element:HTMLElement,name:string){
            for(let i =0,j=element.childNodes.length;i<j;i++){
                let child = element.childNodes[i] as HTMLElement;
                if(child.hasChildNodes) continue;
                let lyName = child.getAttribute("layout-name");
                if(lyName===name) {
                    return child;
                } else{
                    let rs = this._findChildren(child,name);
                    if(rs) return rs;
                }
            }
            
        }
        _findElement(element:HTMLElement,paths:string[]){
            let name = paths.shift();
            let rs = this._findChildren(element,name);
            if(rs){
                let elem = this._findElement(rs,paths);
                paths.push(name);
                return elem;
            }else {
                paths.push(name);
            }
        }
        _checkIn(root:HTMLElement,element:HTMLElement){
            while(element){
                element = element.parentNode as HTMLElement;
                if(element===root) return true;
            }
            return false;
        }
    }

    export class TableRowLayout extends Layout{
        constructor(opts:any){
            super(opts);
            this._appendLayoutElement = (p:HTMLElement,currName:string,num:number,fullpath:string):any=>{
                let currLayout = YA.createElement("TD");
                p.appendChild(currLayout);
                return currLayout;
            };
        }

    }*/
    
}