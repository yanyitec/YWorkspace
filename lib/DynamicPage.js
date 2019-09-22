var DynamicPage = /** @class */ (function () {
    function DynamicPage(opts) {
        this.viewType = opts.viewType;
        this.element = opts.element;
    }
    DynamicPage.prototype.init = function () {
        var _this = this;
        ajax({ url: "localhost/GetOrgCategoryConfigs" }).then(function (rs) {
            _this.orgCategoryConfigs = rs;
            if (_this.orgCategoryConfigs && _this.blCategoryConfigs) {
                _this.initEditPage();
            }
        });
        ajax({ url: "localhost/GetBLCategoryConfigs" }).then(function (rs) {
            _this.blCategoryConfigs = rs;
            if (_this.orgCategoryConfigs && _this.blCategoryConfigs) {
                _this.initEditPage();
            }
        });
    };
    DynamicPage.prototype.initEditPage = function () {
        var _this = this;
        this.element.innerHTML = "<fieldset>\n    <legend>\u4FE1\u606F\u5206\u7C7B</legend>\n    <div>\n        <div>\n            <label>\u673A\u6784</label>\n            <input type=\"text\" value=\"\" id=\"info_org\">\n            <label>+<label>\n        </div>\n        <div>\n            <label>\u673A\u6784\u5206\u7C7B\u9879</label>\n            <select id=\"info_org_cate\"></select>\n        </div>\n    </div>\n    <div id=\"BL0\">\n        <div>\n            <div>\n            <label>\u4E13\u4E1A</label>\n            <input type=\"text\" value=\"\" id=\"info_bl_0\">\n            <label>+<label>\n        </div>\n        <div>\n            <label>\u4E13\u4E1A\u5206\u7C7B\u9879</label>\n            <select id=\"info_bl_cate_0\"></select>\n        </div>\n    </div>\n    <div style='text-align:center;color:red;font-weight:bold;' id=\"addBL\">+</div>\n</fieldset>\n<fieldset>\n    <legend>\u4FE1\u606F\u63CF\u8FF0</legend>\n    <div id=\"info_content\"></div>\n</fieldset>\n<button id='info_submit'>\u63D0\u4EA4</button>\n";
        this.initCagetories(document.getElementById("info_org_cate"), this.orgCategoryConfigs);
        this.initCagetories(document.getElementById("info_bl_cate_0"), this.blCategoryConfigs);
        //this.initContent();
        document.getElementById("info_submit").onclick = function () {
            var valids = _this.contentComponent.validate();
            if (valids) {
                var msgs = [];
                for (var n in valids) {
                    msgs.push(_this.fields[n].label + ":" + valids[n]);
                }
                alert(msgs.join("\n"));
                return;
            }
            var data = _this.contentComponent.getValue();
            alert(JSON.stringify(data));
            console.log(data);
        };
    };
    DynamicPage.prototype.initCagetories = function (sel, cfgs) {
        var _this = this;
        sel.innerHTML = "";
        sel.appendChild(new Option("请选择...", ""));
        for (var n in cfgs) {
            var cfg = cfgs[n];
            if (typeof cfg !== "object")
                continue;
            if (YA.isArray(cfg))
                continue;
            var opt = new Option(cfg.label, n);
            sel.appendChild(opt);
        }
        sel.onchange = function () { return _this.initContent(); };
        return sel;
    };
    DynamicPage.prototype.initContent = function () {
        if (this.contentComponent)
            this.data = this.contentComponent.getValue();
        var contentElem = document.getElementById("info_content");
        contentElem.innerHTML = "";
        var fields = this.makeFields();
        this.fields = fields;
        var opts = {
            fields: fields,
            element: contentElem,
            data: this.data,
            fieldsetViewType: this.viewType == "readonly" ? "Detail" : "Edit"
        };
        this.contentComponent = new YA.FieldsetView(opts);
    };
    DynamicPage.prototype.makeFields = function () {
        var orgElem = document.getElementById("info_org_cate");
        var cfgName = orgElem.options[orgElem.selectedIndex].value;
        var cfg = this.orgCategoryConfigs[cfgName];
        var fields = cfg ? YA.deepClone(cfg.fields) : null;
        var i = 0;
        while (true) {
            var blElem = document.getElementById("info_bl_cate_" + i);
            if (!blElem)
                break;
            var selectedCateName = blElem.options[blElem.selectedIndex].value;
            if (!selectedCateName)
                return fields;
            var selectedCfg = this.blCategoryConfigs[selectedCateName];
            var appendFields = selectedCfg.fields;
            if (!fields) {
                fields = YA.deepClone(appendFields);
                continue;
            }
            for (var n in appendFields) {
                if (fields[n])
                    continue;
                fields[n] = YA.deepClone(appendFields[n]);
            }
            i++;
        }
        return fields;
    };
    return DynamicPage;
}());
function ajax(opts) {
    var rs;
    if (opts.url == "localhost/GetOrgCategoryConfigs") {
        rs = orgCategoryConfigs;
    }
    if (opts.url == "localhost/GetBLCategoryConfigs") {
        rs = blCategoryConfigs;
    }
    if (opts.url == "localhost/GetCheckCategories") {
        rs = [
            { "Id": 1, "Text": "重大突发事件" },
            { "Id": 2, "Text": "常规重大事项" },
            { "Id": 3, "Text": "重大安全事故" }
        ];
    }
    return {
        __rs: rs,
        __tick: 0,
        __funcs: [],
        then: function (callback) {
            this.__funcs.push(callback);
            var self = this;
            if (!self.__tick)
                self.__tick = setTimeout(function () {
                    for (var i = 0, j = self.__funcs.length; i < j; i++)
                        self.__funcs[i](self.__rs);
                    self.then = function (cb) { cb(this.__rs); };
                }, 100);
        }
    };
}
YA.ajax = ajax;
var orgCategoryConfigs = {
    "meeting": {
        "label": "会议纪要",
        "fields": {
            "Title": {
                type: "text",
                label: "标题",
                validations: {
                    required: true,
                    length: { min: 5, max: 20 }
                }
            },
            "MeetingNo": {
                type: "MeetingNoView",
                label: "期数"
            },
            "Summary": {
                type: "textarea",
                label: "摘要",
                validations: {
                    length: { max: 20 }
                }
            }
        }
    },
    "leader": {
        "label": "领导班子",
        "type": "LeaderView"
    }
};
var blCategoryConfigs = {
    "check": {
        "label": "监督检查",
        "fields": {
            Title: {
                label: "标题",
                type: "text",
                validations: {
                    required: true,
                    length: { min: 5, max: 20 }
                }
            },
            Category: {
                label: "类别",
                type: "dropdown",
                items: { url: "localhost/GetCheckCategories" },
                validations: {
                    required: true
                }
            }
        }
    },
    "exception": {
        "label": "重大异常",
        "fields": {
            Title: {
                label: "标题",
                type: "text",
                validations: {
                    required: true,
                    length: { min: 5, max: 20 }
                }
            },
            Location: {
                label: "地点",
                type: "text",
                validations: {
                    length: { max: 10 }
                }
            }
        }
    }
};
