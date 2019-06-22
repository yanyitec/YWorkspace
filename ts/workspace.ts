
namespace YA{
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
        let dele = delegateFactories[argc];
        if(!dele){
            let argList="";
            for(let i = 0,j=argc;i<j;i++){
                if(argList)argList += ",";
                argList += "arg"+i;
            }
            let code = `return function(${argList}){return func.call(self,${argList})}`;
            dele = delegateFactories[argc] = new Function("func","self",code) as (func:Function,self:object)=>Function;

        }
        return dele(func,self);
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
        (sender:any,eventArgs:any):any;
    }
    export interface IEventCapture{
        handler:IEventHandler;
        capture:object;
    }
    export interface IObservable{
        subscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable;
        unsubscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable;
        notify(event:string,args:any,sender?:any):IObservable;
    }
    

    export class Observable implements IObservable{
        private _eventMaps:{[evtName:string]:Array<IEventHandler|IEventCapture>};

        constructor(injectTaget?:Function|object){
            if(injectTaget)xable(injectTaget,Observable);
        }

        subscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable{
            let maps = this._eventMaps || (this._eventMaps={});
            let handlers = maps[event] || (maps[event]=[]);
            handlers.push(capture?{handler:handler,capture:this}:handler);
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
                if(handlers){
                    for(let i =0,j=handlers.length;i<j;i++){
                        let existed = handlers.shift();
                        if(capture){
                            if((existed as IEventCapture).handler!==handler) handlers.push(existed);
                        }
                        else {
                            if(existed!==handler) handlers.push(existed);
                        }
                        
                    }
                }
            }
            return this;
        }

        notify(event:string,args:any,sender?:any):IObservable{
            let maps = this._eventMaps;
            if(maps) {
                let handlers = maps[event];
                if(handlers){
                    if(!sender) sender = this;
                    let canceled = false;
                    for(let i =0,j=handlers.length;i<j;i++){
                        let existed:any = handlers.shift();
                        let handler = existed.handler||existed;
                        if(!canceled) {
                            if(existed.capture){
                                if(existed.capture!==this){
                                    handlers.push(existed);
                                    continue;
                                }
                            }
                            let result = handler(sender,args);
                            if(result===false|| result=="<cancel>"){
                                canceled = true;
                            }else if(result==="<remove>"){
                                continue;
                            }else if(result==="<remove,cancel>" || result ==="<cancel,remove>"){
                                canceled = true;
                                continue;
                            }
                            handlers.push(existed);
                        }
                        
                    }
                    if(args) args.canceled = canceled;
                }
            }
            return this;
        }
    }

    export interface ICompositable{
        
        name(value?:string):string|ICompositable;
        composite(newComposite?:ICompositable):ICompositable;
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
            getStyle = (obj:HTMLElement,attr:string):string=>(obj as any).currentStyle[attr];
        }else{
            getStyle = (obj:HTMLElement,attr:string):string=>{
                let f:any = false;
                return getComputedStyle(obj,f)[attr];
            };
        }
        return getStyle(obj,attr);
    }
    
    export function isInview(element:HTMLElement):boolean{
        let doc = element.ownerDocument;
        while(element){
            if(element===doc.body) return true;
            element = element.parentNode as HTMLElement;
        }
        return false;
    }
    
    export interface IComponentOpts{
        name?:string;
        tag?:string;
        type:string;
        className?:string;
        attrs?:{[index:string]:string};
        css?:{[index:string]:string};
        children?:Array<IComponentOpts>;
    }

    /**
     * 抽象的组件
     *
     * @interface IComponent
     */
    export interface IComponent extends IObservable,ICompositable{
       element:HTMLElement;
       opts(opts?:IComponentOpts):IComponentOpts|IComponent;
       className(value?:string):string|IComponent;
       visible(value?:boolean):boolean|IComponent;
       x(value?:number):number|IComponent;
       y(value?:number):number|IComponent;
       width(value?:any):any;
       height(value?:any):any;
       attrs(name:{[attrName:string]:string}|string,value?:string):string|IComponent;
       css(name:string|{[name:string]:string},value?:string):string|IComponent;
       dock(value?:string):string|IComponent;
       position(value?:string):string|IComponent;
       suspend(handler?:(comp:IComponent)=>void):IComponent;
       resume():IComponent;
       refresh(includeCHildren?:boolean):IComponent;
       renovate(data?:any,diff?:boolean):IComponent;
       update(data:any,diff?:boolean):IComponent;
       //update():IComponent;
    }

    
    export class Component extends Compositable implements IComponent{
        element:HTMLElement;
        

        private _width:any;
        private _height:any;
        private _percentHeight:number;
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
            this.opts(opts);
        }

        subscribe:(event:string,handler:IEventHandler,capture?:boolean)=>IComponent;
        unsubscribe:(event:string,handler:IEventHandler,capture?:boolean)=>IComponent;
        notify(event:string,args:any,sender?:any):IComponent{
            if(this._preventRefresh) return this;
            args= args||{};
            Observable.prototype.notify.call(this,args,sender);
            if(!args.canceled && this._composite){
                (this._composite as IComponent).notify(event,args,sender);
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
                this.notify("componentAdded",{index:index,component:component},this);
            }else if(event==="removed"){
                contentElement.removeChild(component.element);
                this.notify("componentRemoved",{index:index,component:component},this);
            }else if(event==="replaced"){
                contentElement.replaceChild(component.element,contentElement.childNodes[index]);
                this.notify("componentReplaced",{index:index,component:component},this);
            }
        }

        protected contentElement():HTMLElement{
            return this.element;
        }
        
        private _binders:{[prop:string]:Binder};
        _opts:IComponentOpts;
        opts(opts?:IComponentOpts):IComponent|IComponentOpts{
            if(opts===undefined) return this._opts;
            if(this._opts) throw new Error("还不支持重复设置opts");
            let oldPrevent = this._preventRefresh;
            this._preventRefresh = true;
            for(let key in opts){
                let value = opts[key];
                let cmd = key[0];
                if(cmd=="."){
                    let name = key.substr(1);
                    value.name = name;
                    let ctype = value.type;
                    let cls:any = componentTypes[ctype]||Component;
                    let component = new cls(value);
                    this.add(component);
                    continue;
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
            
            this._preventRefresh = oldPrevent;
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
        _x:number;
        x(value?:number|boolean):IComponent|number{
            if(value===undefined||value===true){
                return this._x = parseFloat(this.css("left") as string);
            }
            
            if(value===false){
                if(this._x===undefined) this._x = parseFloat(this.css("left") as string);
                return this._x;
            }
            if(this._dock && !this._preventRefresh){
                console.warn("已经设置了停靠dock,再设置x()为无效操作");
                //return this;
            }
            this.element.style.left = (this._x=value)+"px";
            return this;
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
            if(this._dock && !this._preventRefresh){
                console.warn("已经设置了停靠dock,再设置y()为无效操作");
                //return this;
            }
            this.element.style.top = (this._y=value)+"px";
            return this;
        }

        width(value?:any):any{
            if(value===undefined||value===false){
                return this._width;
            }else if(value===true){
                return this.element.clientWidth;
            }
            if(this._dock && !this._preventRefresh){
                console.warn("已经设置了停靠dock,再设置width()为无效操作");
                //return this;
            }
            if(value===this._width) return this;
            this._width=value;
            if(intRegx.test(this._width)){
                this.element.style.width= this._width+"px";
            }else this.element.style.width = this._width;
            return this;
        }

        height(value?:any):any{
            if(value===undefined||value===false){
                return this._height;
            }else if(value===true){
                return this.element.clientHeight;
            }
            if(this._dock && !this._preventRefresh){
                console.warn("已经设置了停靠dock,再设置height()为无效操作");
                //return this;
            }
            if(value===this._height) return this;
            this._height=value;
            this._percentHeight = undefined;
            if(intRegx.test(this._height)){
                this.element.style.height= this._height+"px";
            }else if(percentRegx.test(this._height)){
                this._percentHeight = parseFloat(value);
            }
            
            return this;
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
        protected _preventRefresh:boolean;
        suspend(handler?:(comp:IComponent)=>void):IComponent{
            if(handler){
                let old = this._preventRefresh;
                this._preventRefresh = true;
                handler(this);
                this._preventRefresh = old;
                return this;
            }
            
            this._preventRefresh = true;
            return this;
        }
        resume():IComponent{
            let old = this._preventRefresh;
            this._preventRefresh = false;
            if(old) this.refresh();
            return this;
        }
        refresh(includeCHildren?:boolean):IComponent{
            if(this._preventRefresh) return this;
            let children = this._components;
            let dockInfo:IDockInfo;
            if(children && children.length){
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
                        if(dockInfo.spaceHeight<=0||dockInfo.spaceWidth<=0){
                            child.visible(false);
                        }else{
                            child.suspend((me)=>this._makeDock(child,dockInfo));
                        }
                    }
                    if(includeCHildren) child.refresh(includeCHildren);
                }
                
            }
            return this;   
        }

        //_dockInfo:IDockInfo;
        private _makeDock(child:IComponent,dockInfo:IDockInfo){
            
            
            let dockPos = child.dock();
            child.position("absolute");
            if(dockPos==="left"){
                let cw = child.width(true);
                if(cw>=dockInfo.spaceWidth) this.width(cw=dockInfo.spaceWidth);
                child.x(dockInfo.left_x);
                child.height(dockInfo.spaceHeight);
                child.y(dockInfo.top_y);
                dockInfo.left_x += cw;
                dockInfo.spaceWidth-= cw;
            }else if(dockPos==="right"){
                let cw = child.width(true);
                if(cw>=dockInfo.spaceWidth) this.width(cw=dockInfo.spaceWidth);
                dockInfo.right_x -= cw;
                child.x(dockInfo.right_x);
                child.height(dockInfo.spaceHeight);
                child.y(dockInfo.top_y);
                dockInfo.spaceWidth-= cw;
            }else if(dockPos==="top"){
                let ch = child.height(true);
                if(ch>=dockInfo.spaceHeight) this.height(ch=dockInfo.spaceHeight);
                child.y(dockInfo.top_y);
                child.width(dockInfo.spaceWidth);
                dockInfo.top_y += ch;
                child.x(dockInfo.left_x);
                dockInfo.spaceHeight-= ch;
            }else if(dockPos==="bottom"){
                let ch = child.height(true);
                if(ch>dockInfo.spaceHeight) this.height(ch=dockInfo.spaceHeight);
                dockInfo.bottom_y -= ch;
                child.y(dockInfo.bottom_y);
                child.width(dockInfo.spaceWidth);
                child.x(dockInfo.left_x);
                dockInfo.spaceHeight-= ch;
            }
        }
        renovate(data?:any,diff?:boolean):IComponent{
            let oldPrevent = this._preventRefresh;
            this._preventRefresh = true;
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
            
            this._preventRefresh = oldPrevent;
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
        //static binds:{[token:string]:(prop:string,value:any,comp:IComponent)=>void}={};
        
    }
    (Observable as Function)(Component);
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
    export interface IDockInfo{
        left_x:number;
        right_x:number;
        spaceWidth:number;
        top_y:number;
        bottom_y:number;
        spaceHeight:number;
    }
    export class LayoutComponent extends Component{
        constructor(){
            super();
        }

        _direction:string;
        direction(value?:string):string|LayoutComponent{
            if(value===undefined) return this._direction;
            this._direction = value;
            return this;
        }

        refresh():LayoutComponent{
            if(this._preventRefresh)return this;
            if(this._direction==="horizontal"){
                this._layout_horizontal();
            }else {

            }
            super.refresh();
            return this;
        }

        /**
         *  水平排版
         *
         * @memberof LayoutComponent
         */
        private _layout_horizontal(){
            this.position(true);
            let width = this.width(true);
            let height = this.height(true);
            let components = this._components;
            let headx = 0;
            let tailx = width;
            let usableW = width;
            let unsets:Array<IComponent>=[];
            for(let i = 0,j=components.length;i<j;i++){
                let component = components[i] as IComponent;
                
                component.css("position","absolute");
                component.height(height);
                let cw:number = component.width(true);
                if(usableW<=0){
                    component.visible(false);
                    break;
                }
                if(usableW<cw){
                    component.width(usableW);
                    cw = usableW;
                }
                usableW-= cw;
                let dock = component.dock();
                if(dock==="head"){
                    component.x(headx);
                    headx+= cw;
                    usableW-= cw;
                }else if(dock==="tail"){
                    tailx -=cw;
                    component.x(tailx);
                    usableW -=cw;
                }else {
                    unsets.push(component);
                }
            }
            if(usableW>=0 && unsets.length>0){
                for(let i=0,j=unsets.length-1;i<j;i++){
                    let component = components[i] as IComponent;
                    if(usableW<=0){
                        component.visible(false);
                        break;
                    }
                    component.position("absolute");
                    component.height(height);
                    let cw:number = component.width(true);
                    if(usableW<cw){
                        component.width(usableW);
                        cw = usableW;
                    }
                    usableW-= cw;
                    component.x(headx);
                    headx+= cw;
                }
                let component = unsets[unsets.length-1];
                if(usableW<=0){
                    component.visible(false);
                }else{
                    component.position("absolute");
                    component.height(height);
                    component.width(usableW);
                    component.x(headx);
                }
                
            }
            return this;
        }
    }
    

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
let dp = new YA.DataPath("roles[1].permissions[last-1]");
let v = dp.getValue(user);
console.log(v);
dp.setValue(user,{});
console.log(user.roles[1].permissions[1]);
