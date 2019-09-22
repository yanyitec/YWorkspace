class DynamicPage{
    orgCategoryConfigs:any;
    blCategoryConfigs:any;
    viewType:string;
    element:HTMLElement;
    contentComponent:any;
    data:any;
    fields:{[name:string]:any};
    constructor(opts){
        this.viewType = opts.viewType;
        this.element = opts.element;
        
    }
    

    init(){
        ajax({url:"localhost/GetOrgCategoryConfigs"}).then((rs)=>{
            this.orgCategoryConfigs=rs;
            if(this.orgCategoryConfigs && this.blCategoryConfigs){
                this.initEditPage();
            }
        });

        ajax({url:"localhost/GetBLCategoryConfigs"}).then((rs)=>{
            this.blCategoryConfigs=rs;
            if(this.orgCategoryConfigs && this.blCategoryConfigs){
                this.initEditPage();
            }
        });
    }

    initEditPage(){
        this.element.innerHTML = `<fieldset>
    <legend>信息分类</legend>
    <div>
        <div>
            <label>机构</label>
            <input type="text" value="" id="info_org">
            <label>+<label>
        </div>
        <div>
            <label>机构分类项</label>
            <select id="info_org_cate"></select>
        </div>
    </div>
    <div id="BL0">
        <div>
            <div>
            <label>专业</label>
            <input type="text" value="" id="info_bl_0">
            <label>+<label>
        </div>
        <div>
            <label>专业分类项</label>
            <select id="info_bl_cate_0"></select>
        </div>
    </div>
    <div style='text-align:center;color:red;font-weight:bold;' id="addBL">+</div>
</fieldset>
<fieldset>
    <legend>信息描述</legend>
    <div id="info_content"></div>
</fieldset>
<button id='info_submit'>提交</button>
`;
        this.initCagetories(document.getElementById("info_org_cate"),this.orgCategoryConfigs);
        this.initCagetories(document.getElementById("info_bl_cate_0"),this.blCategoryConfigs);
        //this.initContent();
        document.getElementById("info_submit").onclick=()=>{
            let valids = this.contentComponent.validate();
            if(valids){
                let msgs=[];
                for(let n in valids){
                    msgs.push(this.fields[n].label + ":" + valids[n]);
                }
                alert(msgs.join("\n"));
                return;
            }
            let data = this.contentComponent.getValue();
            alert(JSON.stringify(data));
            console.log(data);
        };
    }
    initCagetories(sel,cfgs){
        sel.innerHTML="";
        sel.appendChild(new Option("请选择...",""));
        for(var n in cfgs){
            var cfg = cfgs[n];
            if(typeof cfg !=="object") continue;
            if(YA.isArray(cfg)) continue;
            var opt = new Option(cfg.label,n);
            sel.appendChild(opt);
        }
        sel.onchange =()=>this.initContent();
        return sel;
    }
    initContent(){
        if(this.contentComponent) this.data = this.contentComponent.getValue();
        let contentElem = document.getElementById("info_content");
        contentElem.innerHTML="";
        let fields = this.makeFields();
        this.fields = fields;
        let opts = {
            fields :fields,
            element:contentElem,
            data:this.data,
            fieldsetViewType:this.viewType=="readonly"?"Detail":"Edit"
        };
        this.contentComponent = new YA.FieldsetView(opts);

    }
    makeFields(){
        let orgElem = document.getElementById("info_org_cate") as HTMLSelectElement;
        let cfgName = orgElem.options[orgElem.selectedIndex].value;
        
        let cfg = this.orgCategoryConfigs[cfgName];
        let fields = cfg?YA.deepClone(cfg.fields):null;
        let i = 0;
        while(true){
            let blElem = document.getElementById("info_bl_cate_"+i) as HTMLSelectElement;
            if(!blElem)break;
            let selectedCateName =  blElem.options[blElem.selectedIndex].value;
            if(!selectedCateName) return fields;
            let selectedCfg = this.blCategoryConfigs[selectedCateName];
            let appendFields = selectedCfg.fields;
            if(!fields) {fields = YA.deepClone(appendFields); continue;}
            for(let n in appendFields){
                if(fields[n]) continue;
                fields[n] = YA.deepClone(appendFields[n]);
            }
            i++;
        }
        return fields;
    }
}



function ajax(opts:any):any{
    let rs:any;
    if(opts.url=="localhost/GetOrgCategoryConfigs"){
        rs = orgCategoryConfigs;
    }

    if(opts.url=="localhost/GetBLCategoryConfigs"){
        rs = blCategoryConfigs;
    }
    if(opts.url=="localhost/GetCheckCategories"){
        rs = [
            {"Id":1,"Text":"重大突发事件"},
            {"Id":2,"Text":"常规重大事项"},
            {"Id":3,"Text":"重大安全事故"}
        ];
    }
    return {
        __rs:rs,
        __tick:0,
        __funcs:[],
        then:function(callback){
            this.__funcs.push(callback);
            let self = this;
            if(!self.__tick) self.__tick = setTimeout(() => {
                for(let i=0,j=self.__funcs.length;i<j;i++) self.__funcs[i](self.__rs);
                self.then = function(cb){cb(this.__rs);};
            }, 100);
        }
    };

}
YA.ajax = ajax;



var orgCategoryConfigs = {
    "meeting":{
        "label":"会议纪要",
        "fields":{
            "Title":{
                type:"text",
                label:"标题",
                validations:{
                    required:true,
                    length:{min:5,max:20}
                }
            },
            "MeetingNo":{
                type:"MeetingNoView",
                label:"期数"
            },
            "Summary":{
                type:"textarea",
                label:"摘要",
                validations:{
                    length:{max:20}
                }
            }
        }
    },
    "leader":{
        "label":"领导班子",
        "type":"LeaderView"
    }

};

var blCategoryConfigs = {
    "check":{
        "label":"监督检查",
        "fields":{
            Title:{
                label:"标题",
                type:"text",
                validations:{
                    required:true,
                    length:{min:5,max:20}
                }
            },
            Category:{
                label:"类别",
                type:"dropdown",
                items:{url:"localhost/GetCheckCategories"},
                validations:{
                    required:true
                }
            }
        }
    },
    "exception":{
        "label":"重大异常",
        "fields":{
            Title:{
                label:"标题",
                type:"text",
                validations:{
                    required:true,
                    length:{min:5,max:20}
                }
            },
            Location:{
                label:"地点",
                type:"text",
                validations:{
                    length:{max:10}
                }
            }
        }
    }
}