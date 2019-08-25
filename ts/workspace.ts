
namespace YA1{
    export let trimRegx :RegExp = /(^\s+)|(\s+$)/gi;
    export let intRegx :RegExp = /^\s*(\+\-)?\d+\s*$/;
    export let numberRegx :RegExp = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*$/;
    export let percentRegx :RegExp = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*\%\s*$/;
    export let quoteRegx:RegExp = /"/gi;
    let lastRegx :RegExp = /^last(?:-(\d+))?$/;
    export function trim(txt:string){
        return txt?txt.toString().replace(trimRegx,""):"";
    }
    let delegateFactories:Array<(func:Function,self:object)=>Function>=[];
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

    export interface IFuncs{
        (...args:any[]):any;
        add(handler:any);
        remove(handler:any);
    }
    let funcsFactories:Array<(ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean)=>IFuncs>=[];
    export function createFuncs(argc?:number,ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean):IFuncs{
        let factory = funcsFactories[argc||0];
        if(!factory){
            let argList="";
            for(let i = 0,j=argc;i<j;i++){
                if(argList)argList += ",";
                argList += "arg"+i;
            }
            let code = `var handlers = [];
            var funcs = function(${argList}){
                var result;
                for(let i=0,j=handlers.length;i<j;i++){
                    let handler = handlers[i];
                    if(ck){
                        handler = ck(handler);
                        if(!handler) continue;
                    }
                    let rs = handler(${argList});
                    if(rs!==undefined){
                        result = rs;
                        if(rs===false)break;
                    }
                }
                return result;
            };
            funcs.__YA_FUNCS_HANLDERS = handlers;
            funcs.add=function(handler){
                handlers.push(handler);
            }
            funcs.remove=function(handler){
                for(var i=0,j=handlers.length;i<j;i++){
                    var existed = handlers.shift();
                    if(existed !==handler && (eq ?!eq(handler,existed):true)){
                        continue;
                    }
                }
            }
            return funcs;
`;
            factory = funcsFactories[argc] = new Function("ck","eq",code) as (ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean)=>IFuncs;

        }
        return factory(ck,eq);
    }

    
    export class DataPath{
        
        fromRoot:boolean;
        constructor(path:string){
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
                    if(inBrace) throw new Error("Invalid DataPath:" + path);
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt===""){
                        if(lastPropName && lastTokenCode!=93) throw new Error("Invalid DataPath:" + path);
                        lastTokenCode = ch;lastAt = at;continue;
                    }
                    lastPropName = txt;
                    if(txt==="$") this.fromRoot = true;
                    buildCodes(txt);
                    lastTokenCode = ch;lastAt = at;continue;
                }
                
                //[
                else if(ch===91){
                    if(inBrace) throw new Error("Invalid DataPath:" + path);
                    
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt===""){
                        if(!lastPropName|| lastTokenCode!==93)  throw new Error("Invalid DataPath:" + path);
                        lastTokenCode = ch;lastAt = at;continue;
                    }
                    buildCodes(txt);
                    inBrace = true;
                    lastTokenCode = ch;lastAt = at;continue;
                }
                //]
                else if(ch===93){
                    if(!inBrace)  throw new Error("Invalid DataPath:" + path);
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt==="")throw new Error("Invalid DataPath:" + path);
                    let match  =txt.match(lastRegx);
                    if(match){
                        txt = "$obj$.length-1";
                        if(match[1]){
                            txt= "$obj$.length-1-" + match[1];
                        }
                    }
                    buildCodes(txt,true);
                    inBrace = false;
                    lastTokenCode = ch;lastAt = at;continue;
                }
                
            }
            if(inBrace)  throw new Error("Invalid DataPath:" + path);
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
            this.setValue = new Function("$obj$","$value$",setterCode) as (d,v)=>DataPath;
        }
        getValue(data:any):any{}

        setValue(data:any,value:any):DataPath{
            return this;
        }
    
    }
    export class Binder{
        path:DataPath;
        accessor:Function;
        constructor(path:DataPath,accessor:Function){
            this.path= path;
            this.accessor = accessor;
        }
        update(data:any,diff?:boolean){
            this.path.setValue(data,this.accessor());
        }

        renovate(data:any,diff?:boolean){
            let newValue = this.path.getValue(data);
            this.accessor(newValue);
        }

        static tryMake(pathExpr:string,prop:string,comp:object):Binder{
            if(typeof pathExpr!=="string") return pathExpr;
            pathExpr = pathExpr.replace(trimRegx,"");
            if(pathExpr[0]=="@"){
                if(pathExpr[1]=="@") return ;
                return new Binder(new DataPath(pathExpr),delegate(comp[prop],comp,3));
            }
            if(pathExpr[0]=="{" && pathExpr[pathExpr.length-1]=="}"  ){
                if(pathExpr[1]=="{") return ;
                return new ObjectBinder(new DataPath(pathExpr.substring(1,pathExpr.length-1)),delegate(comp[prop],comp,3));
            }
            if(pathExpr[0]=="<" && pathExpr[pathExpr.length-1]==">"  ){
                if(pathExpr[1]=="<") return ;
                return new ObjectBinder(new DataPath(pathExpr.substring(1,pathExpr.length-1)),delegate(comp[prop],comp,3));
            }
            //return pathExpr;
        }
    }
    
    export class ObjectBinder extends Binder{
        constructor(path:DataPath,accessor:Function){
            super(path,accessor);
        }

        update(data:any,diff?:boolean){
            let srcData = this.accessor();
            
            if(diff) {
                let modelData = this.path.getValue(data);
                merge(modelData,srcData);
                this.path.setValue(data,modelData);
            }else {
                this.path.setValue(data,srcData);
            }
        }

        renovate(data:any,diff?:boolean){
            let newValue = this.path.getValue(data);
            if(diff){
                for(let n in newValue){
                    this.accessor(n,newValue[n],diff);
                }
            }else{
                this.accessor(newValue);
            }
            
            
        }

    }

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

    export interface ICompositable{
        
        name(value?:string):string|ICompositable;
        composite(newComposite?:ICompositable,internalUsage?:string):ICompositable;
        components(name:number|string,child?:ICompositable):ICompositable|ICompositable[];
        add(compoent:ICompositable,index?:number):ICompositable;
        remove(compoent:ICompositable|string):ICompositable;
        length():number;
        onComponentChanged(event:string,component:ICompositable,index?:number):void;
    }

    export class Compositable implements ICompositable{
        protected _components:ICompositable[];
        protected _composite:ICompositable;
        protected _name:string;
        constructor(injectTaget?:Function|object){
            if(injectTaget)xable(injectTaget,Compositable);
            //this.onComponentChanged=null;
        }

        onComponentChanged(event:string,component:ICompositable,index?:number):void{}

        length():number{
            return this._components?this._components.length:0;
        }
        name(value?:string):string|ICompositable{
            if(value===undefined)return this._name;
            let oldname = this._name;
            if(this._name = value){
                if(oldname && this._composite){
                    delete this._composite[oldname];
                    if(value)this._composite[value] = this;
                }
            }
            return this;
        }

        composite(newParent?:ICompositable,internalUsage?:string):ICompositable{
            if(newParent===undefined) return this._composite;
            if(newParent===this._composite) return this;
            
            if(internalUsage==="<internal_use>") {
                this._composite = newParent;
                return this;
            }
            if(this._composite) this._composite.remove(this);
            if(newParent===null){
                this._composite =null;
            }else{
                newParent.add(this);
            }
            return this;
        }

        components(name:number|string,child?:ICompositable,evtable?:string):ICompositable|ICompositable[]{
            if(name===undefined){
                return (this._components ||(this._components=[])) as ICompositable[];
            }
            if(child===undefined){
                if(typeof name==="string") return this[name] as ICompositable;
                return this._components[name] as ICompositable;
            }
            let children = this._components || (this._components=[]);
            let index :number;
            let childName :string= child.name() as string;
            
            for(let i =0,j=children.length;i<j;i++){
                let existed = children.shift();
                let existedName:string = existed.name() as string;
                if(existedName===name){
                    children.push(child);
                    index = i;
                }else if(i===name){
                    children.push(child);
                    if(existedName!==childName){
                        delete this[existedName];
                        this[childName] = child;
                    }
                    index = i;
                }else  children.push(existed);
            }
            if(index===undefined){
                
                children.push(child);
                if(childName) this[childName] = child; 
                if(this.onComponentChanged){
                    this.onComponentChanged("added",child);
                }
            } else {
                if(this.onComponentChanged){
                    this.onComponentChanged("replaced",child,index);
                }
            }
            

        }
        add(child:ICompositable,index?:number,eventable?:string):ICompositable{
            let oldParent = child.composite();
            if(oldParent) oldParent.remove(child);
            this._add(child,index);
            if(this.onComponentChanged){
                this.onComponentChanged("added",child,index);
            }
            return this;
        }

        protected _add(child:ICompositable,index:number){
            let components = this._components || (this._components=[]);
            let inserted :number;
            for(let i =0,j=components.length;i<j;i++){
                let existed = components.shift();
                if(inserted===index){
                    if(i==index){
                        components.push(child);
                        inserted=index;
                    }else {
                        if(existed===child) {index++;continue;}
                    }
                }
                
                components.push(existed);
            }
            if(!inserted) {components.push(child);}
            if(child.name()) this[child.name() as string] = child; 
            child.composite(this,"<internal_use>");
            return inserted;
        }
        remove(child:Compositable,evtable?:string):ICompositable{
            let components = this._components;
            if(!components || components.length==0) throw new Error("不是该节点的子节点");
            let removed = false;
            let index:number;
            for(let i =0,j=components.length;i<j;i++){
                let existed = components.shift();
                if(existed!==child){
                    components.push(existed);
                }else{
                    removed = true;
                    index = i;
                } 
            }
            if(!removed)throw new Error("不是该节点的子节点");
            if(child._name) delete this[child._name];
            child.composite(null,"<internal_use>");
            if(this.onComponentChanged){
                this.onComponentChanged("removed",child,index);
            }
            return this;
        }
    }
    export function createElement(tagName:string){
        return document.createElement(tagName);
    }

    export let getStyle = (obj:HTMLElement,attr:string):string =>{
        if((obj as any).currentStyle){//兼容IE
            getStyle = YA1.getStyle = (obj:HTMLElement,attr:string):string=>(obj as any).currentStyle[attr];
        }else{
            getStyle = YA1.getStyle = (obj:HTMLElement,attr:string):string=>{
                let f:any = false;
                return getComputedStyle(obj,f)[attr];
            };
        }
        return getStyle(obj,attr);
    }
    export let attach = (elem:HTMLElement,event:string,handler:Function)=>{
        if(elem.addEventListener){
            attach = YA1.attach = (elem:HTMLElement,event:string,handler:Function)=>elem.addEventListener(event,handler as any,false);
        }else {
            attach = YA1.attach = (elem:HTMLElement,event:string,handler:Function)=>(elem as any).attachEvent("on" +event,handler as any);
        }
        return attach(elem,event,handler);
    }
    export let detech = (elem:HTMLElement,event:string,handler:Function)=>{
        if(elem.removeEventListener){
            detech = YA1.detech = (elem:HTMLElement,event:string,handler:Function)=>elem.removeEventListener(event,handler as any,false);
        }else {
            detech = YA1.detech = (elem:HTMLElement,event:string,handler:Function)=>(elem as any).detechEvent("on" +event,handler as any);
        }
        return detech(elem,event,handler);
    }
    export function isInview(element:HTMLElement):boolean{
        let doc = element.ownerDocument;
        while(element){
            if(element===doc.body) return true;
            element = element.parentNode as HTMLElement;
        }
        return false;
    }

    export interface IComponentChangeEventArgs{
        type:string;
        component:IComponent;
        index?:number;
    }

    export interface IPoint{
        x?:number;
        y?:number;
    }
    
    export interface ISize{
        width?:number;
        height?:number;
    }

    export interface IBox extends IPoint,ISize{}

    export interface IBoxEventArgs{
        type:string;
        x?:number;
        y?:number;
        width?:number;
        height?:number;
    }
    
    export interface IComponentOpts{
        name?:string;
        tag?:string;
        type:string;
        className?:string;
        attrs?:{[index:string]:string};
        css?:{[index:string]:string};
        children?:Array<IComponentOpts>;
        model?:any;
        actions?:Function[];
    }

    /**
     * 抽象的组件
     *
     * @interface IComponent
     */
    export interface IComponent extends IObservable,ICompositable{
        element:HTMLElement;
        root():IComponent;
        opts(opts?:IComponentOpts):IComponentOpts|IComponent;
        className(value?:string):string|IComponent;
        visible(value?:boolean):boolean|IComponent;

        x(value?:number):number|IComponent;
        y(value?:number):number|IComponent;
        position(value?:string):string|IComponent;
        location(point?:IPoint|string,relative?:string):IPoint|IComponent;
        move(args:IPoint|IEventHandler):IComponent;

        width(value?:any):any;
        height(value?:any):any;
        resize(args:ISize|IEventHandler):IComponent;
        resizable(value?:any):any;
        
        scrollX(value?:number):number|IComponent;
        scrollY(value?:number):number|IComponent;
        scroll(args:IPoint|IEventHandler):IComponent;

        content(value?:string):string|IComponent;

        attrs(name:{[attrName:string]:string}|string,value?:string):string|IComponent;
        css(name:string|{[name:string]:string},value?:string):string|IComponent;
        dock(value?:string):string|IComponent;
        
        
        suspend(handler?:(comp:IComponent)=>void):IComponent;
        resume():IComponent;
        refresh(includeCHildren?:boolean):IComponent;
        renovate(data?:any,diff?:boolean):IComponent;
        update(data:any,diff?:boolean):IComponent;
       //update():IComponent;
    }

    let notify = Observable.prototype.notify;
    
    export class Component extends Compositable implements IComponent{
        element:HTMLElement;
        private _width:any;
        private _height:any;
        constructor(element?:string|HTMLElement|IComponentOpts){
            super();
            if(typeof element==="string"){
                this.element = createElement(element as string);
                return;
            }
            if((element as HTMLElement).nodeType!==undefined){
                this.element = element as HTMLElement;
                return this;
            }
            let opts = element as IComponentOpts;
            let tag = opts.tag || "div";
            this.element = createElement(tag);
            (this.element as any).__YA_COMPOMENT = this;
            this.opts(opts);
        }
        get_eventHandlers(event:string,addIfNone?:boolean):IFuncs{
            return Observable.prototype.get_eventHandlers.call(this,event,addIfNone);
        }
        _bindedEvents:{[event:string]:IFuncs};
        subscribe(event:string,handler:IEventHandler,capture?:boolean):IComponent{
            let convertor = eventConvertors[event];
            if(convertor){
                let funcs = (this._bindedEvents||(this._bindedEvents={}))[event];
                if(!funcs){
                    funcs=this._bindedEvents[event]=this.get_eventHandlers(event,true);
                    ((fns:IFuncs)=>attach(this.element,event, function(sender:any,evt:Event){
                        let args;
                        if(evt===undefined){
                            evt =sender;
                            sender = undefined;
                            args = convertor(evt||(evt=window.event));
                            let target:any = evt.target;
                            while(target){
                                if(sender =target.__YA_COMPOMENT){
                                     break;
                                }
                                target = target.parentNode;
                            }
                        }
                        return funcs(sender||component,args);
                    }))(funcs);
                }
                funcs.add(handler);
            }else{
                this.get_eventHandlers(event,true).add(handler);
            }
            return this;
        }
        unsubscribe(event:string,handler:IEventHandler,capture?:boolean):IComponent{
            return Observable.prototype.unsubscribe(event,handler,capture) as IComponent;
        }
        notify(event:string,args:IEventArgs):IComponent{
            if(this._preventEvent) return this;
            args= args||{src:this};
            notify.call(this,args);
            if(!args.canceled && this._composite){
                (this._composite as IComponent).notify(event,args);
            }
            return this;
        }

        onComponentChanged(event:string,component:IComponent,index?:number):void{
            let contentElement = this.contentElement();
            if(event==="added"){
                if(index===undefined){
                    contentElement.appendChild(component.element);
                }else{
                    let a = contentElement.childNodes[index];
                    contentElement.insertBefore(component.element,a);
                }
                if(isInview(this.element)) component.refresh();
                this.notify("componentChange",{index:index,component:component,type:"added",src:this} as IEventArgs);
            }else if(event==="removed"){
                contentElement.removeChild(component.element);
                this.notify("componentChange",{index:index,component:component,type:"removed",src:this} as IEventArgs);
            }else if(event==="replaced"){
                contentElement.replaceChild(component.element,contentElement.childNodes[index]);
                this.notify("componentChange",{index:index,component:component,type:"replaced",src:this} as IEventArgs);
            }
        }
        componentChange(handler:(sender:IComponent,args:IComponentChangeEventArgs)=>any):IComponent{
            this.subscribe("componentChange",handler);
            return this;
        }

        protected contentElement():HTMLElement{
            return this.element;
        }
        _root:IComponent;
        root():IComponent{
            let root = this._root;
            if(!root){
                root = (this.element.ownerDocument as any).__YA_ROOT_COMPONENT;
                if(!root){
                    let rootElement = this.element.ownerDocument.compatMode==="BackCompat"?this.element.ownerDocument.body:this.element.ownerDocument.documentElement;
                    root = this._root = (this.element.ownerDocument as any).__YA_ROOT_COMPONENT = new Component(rootElement);
                }else this._root = root;
            }
            return root;
        }

        private _binders:{[prop:string]:Binder};
        _opts:IComponentOpts;
        opts(opts?:IComponentOpts):IComponent|IComponentOpts{
            if(opts===undefined) return this._opts;
            if(this._opts) throw new Error("还不支持重复设置opts");
            let oldPrevent = this._preventEvent;
            this._preventEvent = true;
            for(let key in opts){
                let value = opts[key];
                let cmd = key[0];
                if(cmd=="#"){
                    let name = key.substr(1);
                    value.name = name;
                    let ctype = value.type;
                    let cls:any = componentTypes[ctype]||Component;
                    let component = new cls(value);
                    this.add(component);
                    continue;
                }else if(cmd=="!"){
                    let name = key.substr(1);
                    if(typeof value==="function"){
                        this.subscribe(name,value);
                    }else{
                        let dataPath = new DataPath(value);

                    }
                }else if(typeof value==="string"){
                    let binder = Binder.tryMake(value,key,this);
                    if(binder){
                        let binders = this._binders||(this._binders={});
                        binders[key] = binder;
                        continue;
                    }
                }
                let prop = this[key];
                if(typeof prop==="function"){
                    prop.call(this,value);
                }
            }
            
            this._preventEvent = oldPrevent;
            return this;
        }

        
        _dock:string;
        dock(value?:string):string|IComponent{
            if(value===undefined) return this._dock;
            if(this._dock!=value){
                this._dock = value;
                if(this._composite){
                    (this._composite as IComponent).refresh(false);
                }
            }
            
            return this;
        }



        
        className(value?:string):string|IComponent{
            if(value===undefined) return this.element.className;
            this.element.className = value;
            return this;
        }

        content(value?:string):string|IComponent{
            if(value===undefined) return this.contentElement().innerHTML;
            this.contentElement().innerHTML = value;
            return this;
        }
        
        private _disNone:string;
        private _visible:boolean;
        visible(value?:boolean):boolean|IComponent{
            if(value===undefined){
                if(this._visible===undefined){
                    this._visible = getStyle(this.element,"display")!=="none";
                }
                if(this._visible){
                    return this._composite?((this._composite as IComponent).visible() as boolean):true;
                }else {
                    return false;
                }
            }else{
                if(this._disNone===undefined){
                    let v = getStyle(this.element,"display");
                    if(v==="none")v="block";
                    else this._disNone = v;
                }
                if(this._visible===value) return this;
                if(value===false){
                    this.element.style.display="none";
                    this._visible=false;
                }else {
                    this.element.style.display=this._disNone;
                    this._visible=true;
                }
                return this;
            }
        }
        show(animate?:boolean){
            
        }
        _x:number;
        x(value?:number|boolean):IComponent|number{
            if(value===undefined||value===true){
                return this._x = parseFloat(this.css("left") as string);
            }
            
            if(value===false){
                if(this._x===undefined) this._x = parseFloat(this.css("left") as string);
                return this._x;
            }
            return this.move({x:value});
        }
        _y:number;
        y(value?:number|boolean):IComponent|number{
            if(value===undefined||value===true){
                return this._y = parseFloat(this.css("top") as string);
            }
            if(value===false){
                if(this._y===undefined) this._y = parseFloat(this.css("top") as string);
                return this._y;
            }
            
            return this.move({y:value});
        }
        move(args:IPoint|IEventHandler):IComponent{
            if(typeof args==="function"){
                this.subscribe("move",args as IEventHandler);
                return this;
            }
            if(this._dock && !this._preventEvent){
                console.warn("已经设置了停靠dock,再设置y()为无效操作");
                //return this;
            }
            this.position(true);
            if(args.x!==undefined)this.element.style.left = (this._x=args.x)+"px";
            if(args.y!==undefined)this.element.style.top = (this._y=args.y)+"px";
            this.notify("move",{x:args.x,y:args.y,src:this,type:"move"} as IEventArgs);
            return this;
        }

        location(point?:IPoint|string,relative?:string):IPoint|IComponent{
            if(point===undefined|| point==="absolute"){
                let elm = this.element;
                let p :IPoint= {x:0,y:0};
                let meetBody = false;
                while(elm){
                    p.x += elm.offsetLeft;
                    p.y +=elm.offsetTop;
                    elm = elm.offsetParent as HTMLElement;
                    if(elm === elm.ownerDocument.body){
                        meetBody=true;
                    }
                }
                if(meetBody) return p;
                else return {};
            }else if(point==="fixed"){
                //let scrollx = Math.max(document.body.scrollLeft,document);
            }
            
        }

        width(value?:any):any{
            if(value===undefined||value===false){
                return this._width;
            }else if(value===true){
                return this.element.clientWidth;
            }
            if(this._dock && !this._preventEvent){
                console.warn("已经设置了停靠dock,再设置width()为无效操作");
                //return this;
            }
            if(value===this._width) return this;
            this._width=value;
            if(intRegx.test(this._width)){
                this.element.style.width= this._width+"px";
            }else this.element.style.width = this._width;
            return this.notify("resize",{width:this.element.clientWidth});
        }

        height(value?:any):any{
            if(value===undefined||value===false){
                return this._height;
            }else if(value===true){
                return this.element.clientHeight;
            }
            if(this._dock && !this._preventEvent){
                console.warn("已经设置了停靠dock,再设置height()为无效操作");
                //return this;
            }
            if(value===this._height) return this;
            
            this._height=value;
            if(intRegx.test(this._height)){
                this.element.style.height= this._height+"px";
            }else{
                this.element.style.height= this._height;
            }
            return this.notify("resize",{height:this.element.clientHeight});
        }

        resize(args:ISize|IEventHandler):IComponent{
            if(typeof args==="function"){
                return this.subscribe("resize",args as IEventHandler);
            }
            if(args.width!==undefined)  this.element.style.width= (this._width=args.width)+"px";
            if(args.height!==undefined)  this.element.style.height= (this._height=args.height)+"px";
            return this.notify("resize",{type:"resize",width:args.width,height:args.height,src:this});
        }
        position(value?:string|boolean):string|IComponent{
            if(value===undefined) return this.css("position");
            if(value===true){
                let v = this.css("position");
                if(v==='static') this.element.style.position="relative";
                return this;
            }
            this.element.style.position= value as string;
            return this;
        }

        scrollX(value?:number):IComponent|number{
            if(value===undefined){
                return this.element.scrollLeft;
            }
            return this.scroll({x:value});
            
        }

        scrollY(value?:number):IComponent|number{
            if(value===undefined){
                return this.element.scrollTop;
            }
            return this.scroll({y:value});
        }

        scroll(point:IPoint|IEventHandler):IComponent{
            if(typeof point==="function"){
                return this.subscribe("scroll",point as IEventHandler);
            }
            if(point.x) this.element.scrollLeft= point.x;
            if(point.y) this.element.scrollTop = point.y;
            return this.notify("scroll",{type:"scroll",src:this,x:point.x,y:point.y});
        }
        _resizable:any;
        _resizableMousemoveHandler:any;
        _resizableMousedownHandler:any;
        resizable(value?:any){
            if(value===undefined) return this._resizable;
            let dockPos = this._dock;
            if(dockPos==="left"){
                this._resizableMousemoveHandler = (sender,args)=>{
                    let w = this.width(true);
                    let borderx = w-4;
                    if(args.x<borderx){
                        this.cursor("default");
                    }else {
                        this.cursor("ew-resize");
                    }
                };
                this.subscribe("mousemove",this._resizableMousemoveHandler);
                this._resizableMousedownHandler = (sender,args)=>{
                    let w = this.width(true);

                    let x0 :number;
                    let y0 :number;
                    let borderx = w-4;
                    if(args.x>borderx){
                        let mask = createElement("div");
                        mask.style.cssText="position:absolute;z-index:999999;width:100%;background-color:#fff;opacity:0.4;left:0;top:0;";
                        mask.style.height = this.root().height(true) + "px";
                        this.root().element.appendChild(mask);
                        mask.onmouseover = (evt)=>{
                            x0 = evt.offsetX;
                            y0 = evt.offsetY;
                            mask.onmouseover=null;
                        };
                        mask.onmousemove =(evt)=>{
                            let x = evt.offsetX;
                            let y = evt.offsetY;
                            this.width(w + x-x0);
                            (this._composite as IComponent).refresh(false);
                        };
                        mask.onmouseout = mask.onmouseup = (evt)=>{
                            mask.parentNode.removeChild(mask);
                        }
                    }
                };
                this.subscribe("mousedown",this._resizableMousedownHandler);
            }
        }

        css(name:string|{[name:string]:string},value?:string):string|IComponent{
            if(value===undefined) {
                if(typeof name==='object'){
                    for(let n in name) this.css(n,name[n]);
                    return this;
                }
                return getStyle(this.element,name);
            }
            this.element.style[name as string]=value;
            return this;

        }
        _opacity:string;
        opacity(value?:number):number|IComponent{
            if(value===undefined) return parseFloat(this._opacity===undefined?(this._opacity=getStyle(this.element,"opacity")).toString():this._opacity);
            this.element.style.opacity = this._opacity=value.toString();
            return this;
        }

        cursor(value?:string):string|IComponent{
            if(value===undefined) return getStyle(this.element,"cursor");
            this.element.style.cursor = value;
            return this;
        }
        attrs(name:string|{[attrname:string]:string},value?:string):string|IComponent{
            if(value===undefined) {
                if(typeof name==='object'){
                    for(let n in name) this.attrs(n,name[n]);
                    return this;
                }
                return this.element.getAttribute(name);
            }
            this.element.setAttribute(name as string,value);
            return this;

        }
        protected _preventEvent:boolean;
        suspend(handler?:(comp:IComponent)=>any):IComponent{
            if(handler){
                let old = this._preventEvent;
                this._preventEvent = true;
                let result = handler(this);
                this._preventEvent = old;
                if(result!==false && old) this.refresh();
                return this;
            }
            
            this._preventEvent = true;
            return this;
        }
        resume():IComponent{
            let old = this._preventEvent;
            this._preventEvent = false;
            if(old) this.refresh();
            return this;
        }
        refresh(includeChildren?:boolean):IComponent{
            let children = this._components;
            let dockInfo:IDockInfo;
            if(children && children.length){
                let filledChilds :IComponent[]=[];
                for(let i =0,j=children.length;i<j;i++){
                    let child = children[i] as IComponent;
                    let dockPos = child.dock();
                    if(dockPos){
                        if(!dockInfo){
                            let w = this.width(true);
                            let h = this.height(true);
                            dockInfo= {
                                left_x:0,top_y:0,spaceWidth:w,
                                right_x:w,bottom_y:h,spaceHeight:h
                            };
                            this.position(true);
                        }
                        if(dockPos==="fill") {
                            filledChilds.push(child);
                            continue;
                        }
                        child.suspend((me)=>this._makeDock(child,dockInfo));
                    }
                    if(includeChildren!==false) child.refresh(includeChildren);
                }
                if(filledChilds.length){
                    for(let i=0;i<filledChilds.length;i++){
                        let child = filledChilds[i];
                        child.suspend((me)=>this._makeDock(child,dockInfo));
                    }
                }
                
            }
            return this;   
        }

        //_dockInfo:IDockInfo;
        private _makeDock(child:IComponent,dockInfo:IDockInfo):boolean{
            if(dockInfo.spaceHeight<=0||dockInfo.spaceWidth<=0){
                child.visible(false);
                return;
            }
            let dockPos = child.dock();
            child.position("absolute");
            if(dockPos==="left"){
                let cw = child.width(true);
                child.resize({
                    width:(cw>=dockInfo.spaceWidth)?(cw=dockInfo.spaceWidth):undefined,
                    height:dockInfo.spaceHeight
                }).move({
                    x:dockInfo.left_x,
                    y:dockInfo.top_y
                });
                dockInfo.left_x += cw;
                dockInfo.spaceWidth-= cw;
            }else if(dockPos==="right"){
                let cw = child.width(true);
                
                dockInfo.right_x -= cw;
                child.resize({
                    width:(cw>=dockInfo.spaceWidth)?(cw=dockInfo.spaceWidth):undefined,
                    height:dockInfo.spaceHeight
                }).move({
                    x:dockInfo.right_x,
                    y:dockInfo.top_y
                });
                dockInfo.spaceWidth-= cw;
            }else if(dockPos==="top"){
                let ch = child.height(true);
                child.resize({
                    height:(ch>=dockInfo.spaceHeight)?(ch=dockInfo.spaceWidth):undefined,
                    width:dockInfo.spaceWidth
                }).move({
                    x:dockInfo.left_x,
                    y:dockInfo.top_y
                });
                dockInfo.top_y += ch;
                dockInfo.spaceHeight-= ch;
            }else if(dockPos==="bottom"){
                let ch = child.height(true);
                dockInfo.bottom_y -= ch;
                child.resize({
                    height:(ch>=dockInfo.spaceHeight)?(ch=dockInfo.spaceWidth):undefined,
                    width:dockInfo.spaceWidth
                }).move({
                    x:dockInfo.left_x,
                    y:dockInfo.bottom_y
                });
                dockInfo.spaceHeight-= ch;
            }else if(dockPos==="fill"){
                child.resize({width:dockInfo.spaceWidth,height:dockInfo.spaceHeight});
                child.move({x:dockInfo.left_x,y:dockInfo.top_y});
            }
            return false;
        }
        renovate(data?:any,diff?:boolean):IComponent{
            let oldPrevent = this._preventEvent;
            this._preventEvent = true;
            let binders = this._binders;
            if(binders){
                for(let n in binders){
                    binders[n].renovate(data,diff);
                }
            }
            let children = this._components;
            if(children && children.length){
                for(let i =0,j=children.length;i<j;i++){
                    let child = children[i] as IComponent;
                    child.renovate(data,diff);
                }
            }   
            
            this._preventEvent = oldPrevent;
            this.refresh();
            return this;
        }

        
        
        update(data:any,diff?:boolean):IComponent{
            let binders = this._binders;
            if(binders){
                for(let n in binders){
                    binders[n].update(data,diff);
                }
            }
            let children = this._components;
            if(children && children.length){
                for(let i =0,j=children.length;i<j;i++){
                    let child = children[i] as IComponent;
                    child.update(data,diff);
                }
            }  
            return this;
        }

        static types :{[name:string]:Function} = {};
        static feature(name:string,feature:Function){
            Component.prototype[name]=feature;
        }
        
    }
    export let componentTypes:{[name:string]:Function} = Component.types;
    export function component(opts:IComponentOpts,parent?:IComponent|HTMLElement):IComponent{
        let cls:any = componentTypes[opts.type]||Component;
        let component= new cls(opts);
        if(!parent) return component;
        if((parent as HTMLElement).nodeType){
            (parent as HTMLElement).appendChild((component as IComponent).element);
            (component as IComponent).refresh();
        }if((parent as IComponent).add){
            (parent as IComponent).add(component);
        }
        return component;
    }
    export let eventConvertors:{[event:string]:(e:Event)=>IEventArgs} = {};
    eventConvertors["scroll"] = (e:Event)=>{
        return {type:"scroll",x:(e.target as HTMLElement).scrollLeft,y:(e.target as HTMLElement).scrollTop} as IEventArgs;
    };
    eventConvertors["focus"] = (e:Event)=>({type:"focus"} as IEventArgs);
    eventConvertors["mousemove"] = (e:Event)=>keyEventConvertor(e,mouseEventConvertor(e,{type:"mousemove"}));
    eventConvertors["mousedown"] = (e:Event)=>keyEventConvertor(e,mouseEventConvertor(e,{type:"mousedown"}));
    eventConvertors["mouseup"] = (e:Event)=>keyEventConvertor(e,mouseEventConvertor(e,{type:"mouseup"}));
    eventConvertors["mouseenter"] = (e:Event)=>keyEventConvertor(e,mouseEventConvertor(e,{type:"mouseenter"}));
    eventConvertors["mouseout"] = (e:Event)=>keyEventConvertor(e,mouseEventConvertor(e,{type:"mouseout"}));
    eventConvertors["click"] = (e:Event)=>keyEventConvertor(e,mouseEventConvertor(e,{type:"click"}));
    eventConvertors["dblclick"] = (e:Event)=>keyEventConvertor(e,mouseEventConvertor(e,{type:"dblclick"}));
    eventConvertors["keyup"] = (e:Event)=>keyEventConvertor(e,{type:"keyup"});
    eventConvertors["keydown"] = (e:Event)=>keyEventConvertor(e,{type:"keydown"});
    eventConvertors["keypress"] = (e:Event)=>keyEventConvertor(e,{type:"keypress"});

    function keyEventConvertor(e:Event,args?:any):IEventArgs{
        args||(args={});
        args.altKey = (e as any).altKey;
        args.ctrlKey = (e as any).ctrlKey;
        args.shiftKey = (e as any).shiftKey;
        args.metaKey = (e as any).metaKey;
        args.code = (e as any).keyCode|| (e as any).which;
        return args;
    }
    function mouseEventConvertor(e:Event,args?:any):IEventArgs{
        args||(args={});
        args.x = (e as any).offsetX;
        args.y = (e as any).offsetY;
        return args;
    }
    

    export interface IDockInfo{
        left_x:number;
        right_x:number;
        spaceWidth:number;
        top_y:number;
        bottom_y:number;
        spaceHeight:number;
    }
    export interface IMaskOpts{
        css?:{[name:string]:string};
        content?:string|IComponent;
        className?:string;
    }
    Component.feature("mask",function(opts:IMaskOpts){
        let me = this as IComponent;
        let maskc = new Component("div");
        if(opts.css) maskc.css(opts.css);
        maskc.className("ya-mask " +(opts.className||""));
        maskc.css({
            position:"absolute",
            overflow:"hidden",
            zIndex:"9999999"
        });
        maskc.content("<div class='ya-mask-bg' style='position:absolute;left:0;right:0;margin:0;padding:0;border:0;'></div>");
        
        let maske = maskc.element;
        let maskb = maske.firstChild as HTMLElement;
        let refresh = ()=>{
            let x :number,y:number;
            if(me === me.root()){
                x = me.scrollX() as number;
                y = me.scrollY() as number;
            }else {
                let p:IPoint = me.location("absolute") as IPoint;
                x=p.x;
                y=p.y;
            }
            
            let w = me.width(true);
            let h = me.height(true);
            maske.style.left = x + "px";
            maske.style.top = y + "px";
            maske.style.width = maskb.style.width = w + "px";
            maske.style.height = maskb.style.height = h + "px";
        };

    });
    
    
    

    export interface IResiseableComponentOpts extends IComponentOpts{
        minSize:number;
        maxSize:number;
    }

    export class ResizeableComponent extends Component{
        _contentElement:HTMLElement;
        _collapsed:boolean;
        _minSize:number;
        _maxSize:number;
        _collapseable:boolean;
        _resizeable:boolean;
        _rszElement:HTMLElement;
        _pos;
        constructor(opts:IComponentOpts){
            super();
            this.element.style.cssText = "box-sizing:content-box;padding:0;overflow:hidden;";
            this.element.innerHTML="<div class='component-content'></div><div class='resize-handler'></div>";
            this._contentElement= this.element.firstChild as HTMLElement;
            this._rszElement = this.element.lastChild as HTMLElement;
        }
        
        update(){

            return this;
        }
        
    }

    export class AnchorableComponent extends Component{
        private _anchorTop:number;
        private _anchorBottom:number;
        private _anchorLeft:number;
        private _anchorRight:number;
        constructor(){
            super(null);
        }

        anchorTop(value?:any):any{
            if(value===undefined) return this._anchorTop;
            this._anchorTop = value;
            return this.refresh();
        }
        anchorBottom(value?:any):any{
            if(value===undefined) return this._anchorBottom;
            this._anchorBottom = value;
            return this.refresh();
        }

        anchorLeft(value?:any):any{
            if(value===undefined) return this._anchorLeft;
            this._anchorLeft = value;
            return this.refresh();
        }
        anchorRight(value?:any):any{
            if(value===undefined) return this._anchorRight;
            this._anchorRight = value;
            return this.refresh();
        }

        refresh():IComponent{
            super.refresh();
            let elem = this.element;
            if(this._anchorTop!=undefined){
                elem.style.top = this._anchorTop + "px";
            }else {
                elem.style.top = "auto";
            }
            if(this._anchorBottom!=undefined){
                var h = (this._composite as IComponent).element.clientHeight;
                h -= elem.offsetTop;
                elem.style.height = h + "px";
            }else {
                elem.style.height = "auto";
            }
            if(this._anchorLeft!=undefined){
                elem.style.left = this._anchorLeft + "px";
            }else {
                elem.style.left = "auto";
            }
            if(this._anchorRight!=undefined){
                var w = (this._composite as IComponent).element.clientWidth;
                w -= elem.offsetLeft;
                elem.style.width = w + "px";
            }else {
                elem.style.width = "auto";
            }
            return this;
        }
        
    }
    
    
    
}

let user = {
    id:"uid-yiy",
    roles:[
        {id:'rid-01',name:"admin",permissions:[]}
        , {id:'rid-02',name:"manager",permissions:[
            {id:"pid-1"}
            , {id:"pid-2"}
            , {id:"pid-3"}
        ]}
    ]
};
/*
let dp = new YA.DataPath("roles[1].permissions[last-1]");
let v = dp.getValue(user);
console.log(v);
dp.setValue(user,{});
console.log(user.roles[1].permissions[1]);*/

function xxx(ck,eq){
    
}
