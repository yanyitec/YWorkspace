
namespace YA{
    export let trimRegx :RegExp = /(^\s+)|(\s+$)/gi;
    export let intRegx :RegExp = /^\s*(\+\-)?\d+\s*$/;
    export let quoteRegx:RegExp = /"/gi;
    let lastRegx :RegExp = /^last(?:-(\d+))?$/;
    export function trim(txt:string){
        return txt?txt.toString().replace(trimRegx,""):"";
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
        getValue(data:any){}

        setValue(data:any,value:any):DataPath{
            return this;
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
    let dp = new DataPath("roles[1].permissions[last-1]");
    let v = dp.getValue(user);
    console.log(v);
    dp.setValue(user,{});
    console.log(user.roles[1].permissions[1]);
    /**
     * 抽象的组件
     *
     * @interface IYConponent
     */
    interface IYConponent{
       element:HTMLElement;
       children:Array<IYConponent>;
       parent:IYConponent;
       addChild(child:IYConponent):IYConponent;
       remove():IYConponent;
       visible():any;
    }
    
    class YConponent implements IYConponent{
        element:HTMLElement;
        children:Array<IYConponent>;
        parent:IYConponent;
        private _disNone:string;
        private _visible:boolean;
        constructor(){
            this.element = document.createElement("div");
        }
        addChild(child:IYConponent,index?:number):IYConponent{
            child.remove();
            child.parent = this;
            let inserted = false;
            if(index!==undefined){
                
                let children = this.children;
                for(let i =0,j=children.length;i<j;i++){
                    let existed = children.shift();
                    if(i==index){
                        children.push(child);
                        inserted=true;
                    }
                    children.push(existed);
                }
            }
            if(!inserted)this.children.push(child);
            this.element.appendChild(child.element);
            return this;
        }
        remove():IYConponent{
            if(!this.parent) return;
            let p = this.parent;
            let pchildren = p.children;
            for(let i =0,j=pchildren.length;i<j;i++){
                let existed = pchildren.shift();
                if(existed===this){
                    p.element.removeChild(this.element);
                    this.parent = undefined;
                    continue;
                }
                pchildren.push(existed);
            }
            return this;
        }
        visible(value?:boolean):any{
            if(value===undefined){
                if(this._visible===undefined){
    
                }
                if(this._visible){
                    return this.parent?this.parent.visible():true;
                }else {
                    return false;
                }
            }else{
                if(!this._disNone){}
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
    }
}
