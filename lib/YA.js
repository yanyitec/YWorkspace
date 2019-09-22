var YA;
(function (YA) {
    var ExecutionModes;
    (function (ExecutionModes) {
        ExecutionModes[ExecutionModes["Devalopment"] = 0] = "Devalopment";
        ExecutionModes[ExecutionModes["Production"] = 1] = "Production";
    })(ExecutionModes = YA.ExecutionModes || (YA.ExecutionModes = {}));
    YA.executionMode = ExecutionModes.Devalopment;
    /*=========================================================
     * 常用正则表达式
     *========================================================*/
    // 正则:去掉字符串首尾空白字符
    YA.trimRegx = /(^\s+)|(\s+$)/gi;
    // 正则:整数
    YA.intRegx = /^\s*(\+\-)?\d+\s*$/;
    // 正则: 数字，小数
    YA.numberRegx = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*$/;
    // 正则: 百分比
    YA.percentRegx = /^\s*(\+\-)?\s*\d{1，2}(?:.\d+)\s*\%\s*$/;
    YA.quoteRegx = /"/gi;
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
    function trim(txt) {
        return txt ? txt.toString().replace(YA.trimRegx, "") : "";
    }
    YA.trim = trim;
    /**
     * 判断参数是否是数组
     *
     * @export
     * @param {*} obj
     * @returns
     */
    function isArray(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
    }
    YA.isArray = isArray;
    function isObject(obj) {
        return Object.prototype.toString.call(obj) === "[object Object]";
    }
    YA.isObject = isObject;
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
    function delegate(func, self, argc) {
        if (argc === undefined)
            return function () { return func.apply(self, arguments); };
        if (argc === 0)
            return function () { return func.call(self); };
        if (argc === 1)
            return function (arg) { return func.call(self, arg); };
        var factory = delegateFactories[argc];
        if (!factory) {
            var argList = "";
            for (var i = 0, j = argc; i < j; i++) {
                if (argList)
                    argList += ",";
                argList += "arg" + i;
            }
            var code = "return function(" + argList + "){return func.call(self," + argList + ")}";
            factory = delegateFactories[argc] = new Function("func", "self", code);
        }
        return factory(func, self);
    }
    YA.delegate = delegate;
    var delegateFactories = [];
    /**
     * 创建函数簇
     *
     * @export
     * @param {number} [argc] (optional)函数参数个数，undefined表示任意多个
     * @param {(handler:any)=>Function} [ck] (optional)执行前检查函数，可以没有，表示所有的都执行；如果指定了该参数，在执行函数前会首先调用该函数，如果返回false表示未通过检查，不会执行
     * @param {(obj1:any,obj2:any)=>boolean} [eq] (optional) 等值检查函数。如果指定了，remove时会调用该函数来代替 ==
     * @returns {IFuncs}
     */
    function createFuncs(argc, ck, eq) {
        var factory = funcsFactories[argc || 0];
        if (!factory) {
            var argList = "";
            var isConst = false;
            if (argc === null) {
                isConst = true;
                argc = 24;
            }
            else if (argc >= 24)
                throw new Error("参数最多只能有23个");
            for (var i = 0, j = argc; i < j; i++) {
                if (argList)
                    argList += ",";
                argList += "arg" + i;
            }
            var code = "var handlers = [];\nvar funcs = function(" + argList + "){\n    var result;\n                \n    for(let i=0,j=handlers.length;i<j;i++){\n        var handler = handlers[i];\n        var rs;\n        if(ck){\n            handler = ck(handler);\n            if(!handler) continue;\n        }";
            if (isConst) {
                code += "\n        if(handler.handler){\n            if(handler.args){\n                if(handler.args===true){\n                    rs = handler.handler.call(handler.self||this,handler.arg0,handler.arg1);\n                }  else if(handler.args.length){\n                    rs = handler.handler.apply(hanlder.self||this,handler.args);\n                }\n            }\n              \n        }\n";
            }
            else {
                code += "\n        let rs = handler(" + argList + ");\n";
            }
            code += "\n        if(rs!==undefined){\n            result = rs;\n            if(rs===false)break;\n        }\n    }\n    return result;\n};\nfuncs.__YA_FUNCS_HANLDERS = handlers;\nfuncs.add=function(handler){handlers.push(handler);}\nfuncs.remove=function(handler){\n    for(var i=0,j=handlers.length;i<j;i++){\n        var existed = handlers.shift();\n        if(existed !==handler && (eq ?!eq(handler,existed):true)){continue;}\n    }\n}\nreturn funcs;\n";
            factory = funcsFactories[argc] = new Function("ck", "eq", code);
        }
        return factory(ck, eq);
    }
    YA.createFuncs = createFuncs;
    var funcsFactories = [];
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
    var DPath = /** @class */ (function () {
        function DPath(pathOrValue, type) {
            var _this = this;
            if (type === "const") {
                this.getValue = function (d) { return pathOrValue; };
                this.setValue = function (d, v) {
                    if (YA.executionMode === ExecutionModes.Devalopment) {
                        console.warn("向一个const的DPath写入了值", _this, d, v);
                    }
                    return _this;
                };
                return;
            }
            else if (type === "dynamic") {
                this.getValue = function (d) { return pathOrValue(d); };
                this.setValue = function (d, v) {
                    pathOrValue(d, v);
                    return _this;
                };
                return;
            }
            var path = pathOrValue;
            //$.user.roles[0].permissions:first.id;
            var lastAt = -1;
            var lastTokenCode;
            var lastPropName;
            var isLastArr;
            var inBrace = false;
            var getterCodes = [];
            var setterCodes = ["var $current$;\n"];
            var buildCodes = function (txt, isArr) {
                if (isArr) {
                    getterCodes.push("$obj$=$obj$[" + txt + "];if(!$obj$===undefined)return $obj$;\n");
                }
                else {
                    getterCodes.push("$obj$=$obj$." + txt + ";if(!$obj$===undefined)return $obj$;\n");
                }
                if (lastPropName) {
                    if (isLastArr) {
                        setterCodes.push("$current$=$obj$[" + lastPropName + "];if(!$current$) $obj$=$obj$[" + lastPropName + "]=" + (isArr ? "[]" : "{}") + ";else $obj$=$current$;\n");
                    }
                    else {
                        setterCodes.push("$current$=$obj$." + lastPropName + ";if(!$current$) $obj$=$obj$." + lastPropName + "=" + (isArr ? "[]" : "{}") + ";else $obj$=$current$;\n");
                    }
                }
                isLastArr = isArr;
                lastPropName = txt;
            };
            var tpath = "";
            for (var at = 0, len = path.length; at < len; at++) {
                var ch = path.charCodeAt(at);
                // .
                if (ch === 46) {
                    if (inBrace)
                        throw new Error("Invalid DPath:" + path);
                    var txt_1 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
                    if (txt_1 === "") {
                        if (lastPropName && lastTokenCode != 93)
                            throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;
                        lastAt = at;
                        continue;
                    }
                    lastPropName = txt_1;
                    if (txt_1 === "$")
                        this.fromRoot = true;
                    buildCodes(txt_1);
                    lastTokenCode = ch;
                    lastAt = at;
                    continue;
                }
                else if (ch === 91) {
                    if (inBrace)
                        throw new Error("Invalid DPath:" + path);
                    var txt_2 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
                    if (txt_2 === "") {
                        if (!lastPropName || lastTokenCode !== 93)
                            throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;
                        lastAt = at;
                        continue;
                    }
                    buildCodes(txt_2);
                    inBrace = true;
                    lastTokenCode = ch;
                    lastAt = at;
                    continue;
                }
                else if (ch === 93) {
                    if (!inBrace)
                        throw new Error("Invalid DPath:" + path);
                    var txt_3 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
                    if (txt_3 === "")
                        throw new Error("Invalid DPath:" + path);
                    var match = txt_3.match(lastRegx);
                    if (match) {
                        txt_3 = "$obj$.length-1" + match;
                    }
                    buildCodes(txt_3, true);
                    inBrace = false;
                    lastTokenCode = ch;
                    lastAt = at;
                    continue;
                }
            }
            if (inBrace)
                throw new Error("Invalid DPath:" + path);
            var txt = path.substr(lastAt + 1).replace(YA.trimRegx, "");
            if (txt) {
                getterCodes.push("return $obj$." + txt + ";\n");
                if (lastPropName) {
                    if (isLastArr) {
                        setterCodes.push("$current$=$obj$[" + lastPropName + "];if(!$current$) $obj$=$obj$[" + lastPropName + "]={};else $obj$=$current$;\n");
                    }
                    else {
                        setterCodes.push("$current$=$obj$." + lastPropName + ";if(!$current$) $obj$=$obj$." + lastPropName + "={};else $obj$=$current$;\n");
                    }
                }
                setterCodes.push("$obj$." + txt + "=$value$;\nreturn this;\n");
            }
            else {
                getterCodes.pop();
                getterCodes.push("return $obj$[" + lastPropName + "];");
                if (isLastArr) {
                    setterCodes.push("$obj$[" + lastPropName + "]=$value$;\nreturn this;\n");
                }
                else {
                    setterCodes.push("$obj$." + lastPropName + "=$value$;\nreturn this;\n");
                }
            }
            var getterCode = getterCodes.join("");
            var setterCode = setterCodes.join("");
            this.getValue = new Function("$obj$", getterCode);
            this.setValue = new Function("$obj$", "$value$", setterCode);
        }
        DPath.prototype.getValue = function (data) { };
        DPath.prototype.setValue = function (data, value) {
            return this;
        };
        DPath.fetch = function (pathtext) {
            return DPaths[pathtext] || (DPaths[pathtext] = new DPath(pathtext));
        };
        DPath["const"] = function (value) {
            return new DPath(value, "const");
        };
        DPath.dymanic = function (value) {
            return new DPath(value, "dynamic");
        };
        return DPath;
    }());
    YA.DPath = DPath;
    var DPaths = DPath.paths = {};
    function extend() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var obj = arguments[0] || {};
        for (var i = 1, j = arguments.length; i < j; i++) {
            var src = arguments[i];
            for (var n in src)
                obj[n] = src[n];
        }
        return obj;
    }
    YA.extend = extend;
    var lastRegx = /^-\d+$/;
    function replace(text, data) {
    }
    YA.replace = replace;
    var templateVar;
    function makeTemplate(text) {
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
    function merge(dest, src, prop, refs) {
        if (prop === undefined) {
            if (dest === src)
                return dest;
            for (var n in src)
                merge(dest, src, prop, []);
            return dest;
        }
        var srcValue = src[prop];
        if (srcValue === null)
            return dest[prop] = null;
        if (srcValue instanceof RegExp)
            return dest[prop] = srcValue;
        var destValue = dest[prop];
        if (srcValue === undefined)
            return destValue;
        var srcValueType = typeof srcValue;
        if (srcValueType === "string" || srcValueType === "number" || srcValueType === "boolean") {
            return dest[prop] = srcValue;
        }
        for (var i in refs) {
            var ref = refs[i];
            if (ref.src === srcValue) {
                return dest[prop] = ref.target;
            }
        }
        var isSrcValueArray = Object.prototype.toString.call(srcValue) === "[object Array]";
        var target;
        if (!destValue)
            target = isSrcValueArray ? [] : {};
        if (!target) {
            if (typeof destValue !== 'object' || destValue instanceof RegExp)
                destValue = isSrcValueArray ? [] : {};
        }
        else
            target = destValue;
        refs.push({ src: srcValue, target: target });
        merge(target, srcValue);
        return dest[prop] = target;
    }
    YA.merge = merge;
    function deepClone(obj) {
        if (!obj)
            return obj;
        var type = typeof obj;
        if (type === "object") {
            var result = isArray(obj) ? [] : {};
            for (var n in obj) {
                result[n] = deepClone(obj[n]);
            }
            return result;
        }
        return obj;
    }
    YA.deepClone = deepClone;
    /*=========================================================
     * 事件处理

     *========================================================*/
    function xable(injectTaget, Xable) {
        if (injectTaget) {
            var target = injectTaget;
            if (typeof injectTaget === "function")
                target = injectTaget.prototype;
            var src = Xable.prototype;
            for (var n in src) {
                target[n] = src[n];
            }
        }
    }
    YA.xable = xable;
    var Observable = /** @class */ (function () {
        function Observable(injectTaget) {
            if (injectTaget)
                xable(injectTaget, Observable);
        }
        Observable.prototype.subscribe = function (event, handler, capture) {
            var handlers = this.get_eventHandlers(event, true);
            handlers.add(capture ? { handler: handler, capture: this, src: handler } : handler);
            return this;
        };
        Observable.prototype.unsubscribe = function (event, handler, capture) {
            if (event === "<clear-all>") {
                this._eventMaps = undefined;
                return this;
            }
            var maps = this._eventMaps;
            if (maps) {
                var handlers = maps[event];
                if (handlers)
                    handlers.remove(capture ? { handler: handler, src: handler, capture: this } : handler);
            }
            return this;
        };
        Observable.prototype.notify = function (event, args) {
            var maps = this._eventMaps;
            if (maps) {
                var handlers = maps[event];
                if (handlers)
                    handlers.call(this, args);
            }
            return this;
        };
        Observable.prototype.get_eventHandlers = function (event, addIfNone) {
            var maps = this._eventMaps || (this._eventMaps = {});
            var handlers = maps[event];
            if (!handlers && addIfNone)
                maps[event] = handlers = createFuncs(2, function (handler) { return handler.handler || handler; }, function (e1, e2) { return e1 === e2 || (e1.capture === e2.capture && e1.raw == e2.raw); });
            return handlers;
        };
        return Observable;
    }());
    YA.Observable = Observable;
    /*=========================================================
     * 网页处理
     *========================================================*/
    function createElement(tagName) {
        return document.createElement(tagName);
    }
    YA.createElement = createElement;
    YA.getStyle = function (obj, attr) {
        if (obj.currentStyle) {
            YA.getStyle = YA.getStyle = function (obj, attr) { return obj.currentStyle[attr]; };
        }
        else {
            YA.getStyle = YA.getStyle = function (obj, attr) {
                var f = false;
                return getComputedStyle(obj, f)[attr];
            };
        }
        return YA.getStyle(obj, attr);
    };
    YA.attach = function (elem, event, handler) {
        if (elem.addEventListener) {
            YA.attach = YA.attach = function (elem, event, handler) { return elem.addEventListener(event, handler, false); };
        }
        else {
            YA.attach = YA.attach = function (elem, event, handler) { return elem.attachEvent("on" + event, handler); };
        }
        return YA.attach(elem, event, handler);
    };
    YA.detech = function (elem, event, handler) {
        if (elem.removeEventListener) {
            YA.detech = YA.detech = function (elem, event, handler) { return elem.removeEventListener(event, handler, false); };
        }
        else {
            YA.detech = YA.detech = function (elem, event, handler) { return elem.detechEvent("on" + event, handler); };
        }
        return YA.detech(elem, event, handler);
    };
    function replaceClass(element, addedCss, removeCss) {
        var clsText = element.className || "";
        var clsNames = clsText.split(/\s+/g);
        for (var i = 0, j = clsNames.length; i < j; i++) {
            var clsn = clsNames.shift();
            if (clsn === "")
                continue;
            if (clsn === removeCss) {
                clsNames.push(addedCss);
                addedCss = null;
                continue;
            }
            clsNames.push(clsn);
        }
        if (addedCss)
            clsNames.push(addedCss);
        element.className = clsNames.join(" ");
    }
    YA.replaceClass = replaceClass;
    function isInview(element) {
        var doc = element.ownerDocument;
        while (element) {
            if (element === doc.body)
                return true;
            element = element.parentNode;
        }
        return false;
    }
    YA.isInview = isInview;
    var DataPaths = /** @class */ (function () {
        function DataPaths(opts) {
            if (typeof opts === "string") {
                this.detail = this.filter = this.edit = this.cell = DPath.fetch(opts);
            }
            else {
                this.detail = DPath.fetch(opts.detail || opts.edit || opts.cell);
                this.detail = DPath.fetch(opts.edit || opts.detail || opts.cell);
                this.filter = DPath.fetch(opts.filter || opts.cell || opts.edit || opts.detail);
                this.cell = DPath.fetch(opts.cell || opts.detail || opts.edit);
            }
        }
        return DataPaths;
    }());
    YA.DataPaths = DataPaths;
    var Field = /** @class */ (function () {
        function Field(fieldOpts, fieldset) {
            this.opts = fieldOpts;
            this.fieldset = fieldset;
            this.type = fieldOpts.type || "text";
            this.name = fieldOpts.name;
            this.label = fieldOpts.label || this.name;
            this.validations = fieldOpts.validations || {};
            if (!this.validations[this.type]) {
                var validator = YA.validators[this.type];
                if (validator)
                    this.validations[this.type] = true;
            }
            this.required = this.validations.required;
            this.className = "field " + this.type + " " + this.name;
            this.dataViewCreator = YA.fieldDataViewCreators[this.type] || YA.fieldDataViewCreators["text"];
        }
        Field.prototype.path = function (fieldViewType) {
            if (!this.paths) {
                if (this.opts.constValue !== undefined) {
                    var constPath = DPath["const"](this.opts.constValue);
                    this.paths = {
                        cell: constPath,
                        edit: constPath,
                        detail: constPath,
                        filter: constPath
                    };
                }
                else
                    this.paths = new DataPaths(this.opts.paths || this.name);
            }
            switch (fieldViewType) {
                case FieldViewTypes.Edit: return this.paths.edit;
                case FieldViewTypes.Detail: return this.paths.detail;
                case FieldViewTypes.Cell: return this.paths.cell;
                case FieldViewTypes.Filter: return this.paths.filter;
            }
        };
        Field.prototype.validate = function (value, lng, isCheckRequired) {
            var validRs;
            if (this.required && isCheckRequired) {
                var requireValid = YA.validators["required"];
                validRs = requireValid(value, true, lng);
                if (validRs)
                    return validRs;
            }
            var validations = this.validations;
            for (var validName in validations) {
                if (validName === "required")
                    continue;
                var validator = YA.validators[validName];
                if (!validator) {
                    if (YA.executionMode === ExecutionModes.Devalopment)
                        console.warn("找不到验证器", validName, this);
                    continue;
                }
                validRs = validator(value, validations[validName], lng);
                if (validRs)
                    return validRs;
            }
            return validRs;
        };
        return Field;
    }());
    YA.Field = Field;
    var Fieldset = /** @class */ (function () {
        function Fieldset(opts) {
            this.__opts__ = opts;
            this.__name__ = opts.name;
            var fields = this.__opts__.fields;
            var idField;
            for (var name_1 in fields) {
                var fieldOpts = fields[name_1];
                if (!fieldOpts.name)
                    fieldOpts.name = name_1;
                var field = this[name_1] = new Field(fieldOpts, this);
                if (fieldOpts.isPrimary)
                    this.__primary__ = field;
                if (name_1 == "Id" || name_1 == "ID" || name_1 == "id")
                    idField = field;
            }
            if (!this.__primary__)
                this.__primary__ = idField;
        }
        Fieldset.prototype.TEXT = function (txt) {
            return txt;
        };
        return Fieldset;
    }());
    YA.Fieldset = Fieldset;
    var FieldViewTypes;
    (function (FieldViewTypes) {
        /**
         * 显示为一个Button或超连接
         */
        FieldViewTypes[FieldViewTypes["Button"] = 0] = "Button";
        /**
         * 显示为一个只读的字段，带着字段名与字段说明
         */
        FieldViewTypes[FieldViewTypes["Detail"] = 1] = "Detail";
        /**
         * 显示为一个可编辑的字段，带着字段名，验证信息等
         */
        FieldViewTypes[FieldViewTypes["Edit"] = 2] = "Edit";
        /**
         * 显示为一个表格的单元格内容
         */
        FieldViewTypes[FieldViewTypes["Cell"] = 3] = "Cell";
        /**
         * 显示为一个表格头的单元格内容
         */
        FieldViewTypes[FieldViewTypes["HeadCell"] = 4] = "HeadCell";
        /**
         * 显示为查询条件的字段，去掉必填标记，验证信息显示在title上
         */
        FieldViewTypes[FieldViewTypes["Filter"] = 5] = "Filter";
    })(FieldViewTypes = YA.FieldViewTypes || (YA.FieldViewTypes = {}));
    var AccessPermissions;
    (function (AccessPermissions) {
        /**
         * 可写
         */
        AccessPermissions[AccessPermissions["Writable"] = 0] = "Writable";
        /**
         * 可读
         */
        AccessPermissions[AccessPermissions["Readonly"] = 1] = "Readonly";
        AccessPermissions[AccessPermissions["Hidden"] = 2] = "Hidden";
        /**
         * 禁止访问
         */
        AccessPermissions[AccessPermissions["Denied"] = 3] = "Denied";
    })(AccessPermissions = YA.AccessPermissions || (YA.AccessPermissions = {}));
    var FieldActionTypes;
    (function (FieldActionTypes) {
        /**
         * 没有动作
         */
        FieldActionTypes[FieldActionTypes["None"] = 0] = "None";
        /**
         * 呼叫函数
         */
        FieldActionTypes[FieldActionTypes["Call"] = 1] = "Call";
        /**
         * 跳转
         */
        FieldActionTypes[FieldActionTypes["Navigate"] = 2] = "Navigate";
        /**
         * 新建一个window
         */
        FieldActionTypes[FieldActionTypes["NewWindow"] = 3] = "NewWindow";
        /**
         * 弹出一个对话框
         */
        FieldActionTypes[FieldActionTypes["Dialog"] = 4] = "Dialog";
        /**
         * 下转
         */
        FieldActionTypes[FieldActionTypes["Dive"] = 5] = "Dive";
    })(FieldActionTypes = YA.FieldActionTypes || (YA.FieldActionTypes = {}));
    var FieldView = /** @class */ (function () {
        function FieldView(opts, fieldsetView) {
            this.opts = opts;
            this.fieldsetView = fieldsetView;
            this.accessPermission = opts.accessPermission;
            this.actionType = (typeof opts.actionType === "string") ? FieldActionTypes[opts.actionType] : opts.actionType;
            this.action = opts.action;
            this.field = opts.field;
            if (this.actionType === undefined) {
                var t = typeof opts.action;
                if (t === "function")
                    this.actionType = FieldActionTypes.Call;
                else if (t === "string")
                    this.actionType = FieldActionTypes.Navigate;
                else
                    this.actionType = FieldActionTypes.None;
            }
            if (!this.field) {
                if (fieldsetView) {
                    var fieldset = fieldsetView.fieldset;
                    if (fieldset)
                        this.field = fieldset[opts.name];
                }
                if (!this.field) {
                    this.field = new Field(opts);
                }
            }
            var viewType = (typeof opts.feildViewType === "string") ? FieldViewTypes[opts.feildViewType] : opts.feildViewType;
            if (viewType === undefined) {
                if (fieldsetView) {
                    switch (fieldsetView.fieldsetViewType) {
                        case FieldsetViewTypes.Detail:
                            viewType = FieldViewTypes.Detail;
                            break;
                        case FieldsetViewTypes.Edit:
                            viewType = FieldViewTypes.Edit;
                            break;
                        case FieldsetViewTypes.Filter:
                            viewType = FieldViewTypes.Filter;
                            break;
                        case FieldsetViewTypes.Row:
                            viewType = FieldViewTypes.Cell;
                            break;
                        case FieldsetViewTypes.HeadRow:
                            viewType = FieldViewTypes.HeadCell;
                            break;
                    }
                }
                else
                    viewType = FieldViewTypes.Detail;
            }
            this.fieldViewType(viewType);
        }
        FieldView.prototype.fieldViewType = function (type) {
            if (type === undefined)
                return this._fieldViewType;
            if (type != this._fieldViewType) {
                this._fieldViewType = type;
                this.path = this.field.path(type);
                this.element = this.makeElement(this.element);
            }
            return this;
        };
        FieldView.prototype.makeLabelElement = function (wrapper, isMarkRequired) {
            var labelElem = YA.createElement("label");
            wrapper.appendChild(labelElem);
            labelElem.className = "label";
            labelElem.htmlFor = this.field.label;
            var labelText = this.field.label;
            if (this.field.required && isMarkRequired) {
                labelElem.innerHTML = labelText + "<ins>*</ins>";
            }
            else
                labelElem.innerHTML = labelText;
            return labelElem;
        };
        FieldView.prototype.makeElement = function (wrapper) {
            var _this = this;
            if (!wrapper)
                wrapper = this.element || (this.element = YA.createElement("div"));
            this.element.innerHTML = "";
            wrapper.className = this.field.className;
            if (this.opts.className)
                wrapper.className += " " + this.opts.className;
            if (this.opts.width)
                wrapper.style.width = this.opts.width + "px";
            if (this.isHidden())
                wrapper.style.display = "none";
            if (this._fieldViewType == FieldViewTypes.HeadCell) {
                wrapper.innerHTML = this.fieldsetView.TEXT(this.field.name);
                return wrapper;
            }
            if (this._fieldViewType != FieldViewTypes.Cell && this._fieldViewType != FieldViewTypes.Button) {
                this.makeLabelElement(wrapper, this._fieldViewType === FieldViewTypes.Edit || this._fieldViewType === FieldViewTypes.Detail);
            }
            var dataElem = YA.createElement("div");
            wrapper.appendChild(dataElem);
            dataElem.className = "data";
            var dataViewAccessor = this.dataViewAccessor = this.field.dataViewCreator(this.field, this);
            if (dataViewAccessor.valuechange)
                dataViewAccessor.valuechange(function (value) { return _this.setValue(value, false); });
            dataElem.appendChild(dataViewAccessor.element);
            if (this._fieldViewType == FieldViewTypes.Detail) {
                var remarkElem_1 = YA.createElement("label");
                wrapper.appendChild(remarkElem_1);
                remarkElem_1.className = "remark";
                remarkElem_1.htmlFor = this.field.name;
                this.errorMessage = function (msg) { return remarkElem_1.innerHTML = msg; };
            }
            else {
                this.errorMessage = function (msg) { return _this.dataViewAccessor.element.title = msg; };
            }
            return wrapper;
        };
        FieldView.prototype.getValue = function () {
            return this.path.getValue(this.fieldsetView.getValue());
        };
        FieldView.prototype.setValue = function (value, refresh) {
            if (refresh !== false)
                this.dataViewAccessor.setValue(value);
            this.path.setValue(this.fieldsetView.getValue(), value);
            if (this.isWritable())
                this.validate(value);
            return this;
        };
        FieldView.prototype.refresh = function () {
            var value = this.path.getValue(this.fieldsetView.getValue());
            this.dataViewAccessor.setValue(value);
            if (this.isWritable())
                this.validate(value);
            return this;
        };
        FieldView.prototype.validate = function (value) {
            var _this = this;
            if (this.isReadonly()) {
                if (YA.executionMode === ExecutionModes.Devalopment) {
                    console.warn("正在验证只读字段", this, value);
                }
                return;
            }
            if (value === undefined)
                value = this.getValue();
            var lng = function (txt) { return _this.fieldsetView.TEXT(txt); };
            var rs = this.field.validate(value, lng, this._fieldViewType == FieldViewTypes.Edit || this._fieldViewType == FieldViewTypes.Cell);
            if (!rs && this.dataViewAccessor.validate)
                rs = this.dataViewAccessor.validate(value, lng);
            if (rs) {
                replaceClass(this.element, "validate-error", "validate-success");
            }
            else {
                replaceClass(this.element, "validate-success", "validate-error");
            }
            return rs;
        };
        FieldView.prototype.isWritable = function () {
            if (this.accessPermission !== undefined)
                return this.accessPermission === AccessPermissions.Writable || this.accessPermission == AccessPermissions.Hidden;
            return this._fieldViewType === FieldViewTypes.Edit || this._fieldViewType === FieldViewTypes.Filter;
        };
        FieldView.prototype.isReadable = function () {
            return this.accessPermission === undefined || this.accessPermission !== AccessPermissions.Denied;
        };
        FieldView.prototype.isReadonly = function () {
            if (this.accessPermission !== undefined)
                return this.accessPermission === AccessPermissions.Readonly || this.accessPermission === AccessPermissions.Denied;
            return this._fieldViewType === FieldViewTypes.Cell || this._fieldViewType === FieldViewTypes.Detail || this._fieldViewType === FieldViewTypes.Button;
        };
        FieldView.prototype.isDenied = function () {
            if (this.accessPermission !== undefined)
                return this.accessPermission === AccessPermissions.Denied;
            return false;
        };
        FieldView.prototype.isHidden = function () {
            if (this.accessPermission !== undefined)
                return this.accessPermission === AccessPermissions.Hidden;
            return false;
        };
        return FieldView;
    }());
    YA.FieldView = FieldView;
    var requiredValidator = function (value, opts, lng) {
        var msg;
        if (isObject(opts))
            msg = opts.message;
        if (!value)
            return lng(msg || "必填");
        for (var n in value) {
            return;
        }
        return lng(msg || "必填");
    };
    YA.validators = {
        required: requiredValidator,
        length: function (value, opts, lng) {
            var min, max, message;
            if (isObject(opts)) {
                min = opts.min;
                max = opts.max;
                message = opts.message;
            }
            else
                max = parseInt(opts);
            if (!value) {
                if (min)
                    return message ? message.replace("{{min}}", min).replace("{{max}}", min) : lng("长度不能少于{{min}}个字符").replace("{min}", min);
            }
            var len = value.toString().replace(YA.trimRegx, "").length;
            if (min && len < min)
                return message ? message.replace("{{min}}", min).replace("{{max}}", min) : lng("长度不能少于{{min}}个字符").replace("{min}", min);
            if (max && len > max)
                return message ? message.replace("{{min}}", min).replace("{{max}}", min) : lng("长度不能超过{{max}}个字符").replace("{max}", max);
        },
        regex: function (value, opts, lng) {
            var reg, message, result;
            if (opts.match) {
                reg = opts;
                message = lng("格式不正确");
            }
            else {
                reg = opts.reg;
                message = lng(opts.message || "格式不正确");
            }
            if (!value)
                return;
            if (!reg.test(value.toString()))
                return message;
            return;
        }
    };
    YA.fieldDataViewCreators = {};
    function makeInputAccessor(inputElement, isReadonly) {
        var tick;
        return {
            element: inputElement,
            getValue: function () { return isReadonly ? inputElement.innerHTML : inputElement.value; },
            setValue: function (value) { if (isReadonly)
                inputElement.innerHTML = value;
            else
                inputElement.value = value; },
            valuechange: function (handler) {
                if (isReadonly)
                    return;
                var immidiate = function () { tick = 0; handler(inputElement.value); };
                var newTick = function () {
                    if (tick)
                        clearTimeout(tick);
                    tick = setTimeout(immidiate, 200);
                };
                YA.attach(inputElement, "keyup", newTick);
                YA.attach(inputElement, "keydown", newTick);
                YA.attach(inputElement, "blur", immidiate);
                YA.attach(inputElement, "change", immidiate);
            }
        };
    }
    YA.fieldDataViewCreators.text = function (field, fieldView) {
        if (fieldView.isReadonly()) {
            var span = YA.createElement("SPAN");
            span.innerHTML = fieldView.getValue();
            return makeInputAccessor(span, true);
        }
        var inputElement = YA.createElement("input");
        inputElement.type = "text";
        return makeInputAccessor(inputElement);
    };
    YA.fieldDataViewCreators.textarea = function (field, fieldView) {
        if (fieldView.isReadonly()) {
            var span = YA.createElement("div");
            span.innerHTML = fieldView.getValue();
            return makeInputAccessor(span, true);
        }
        var inputElement = YA.createElement("textarea");
        return makeInputAccessor(inputElement);
    };
    YA.fieldDataViewCreators.dropdown = function (field, fieldView) {
        var readonly = fieldView.isReadonly();
        var inputElement = readonly ? YA.createElement("span") : YA.createElement("select");
        inputElement.value = fieldView.getValue();
        var ddOpts = field.opts;
        var keypath = DPath.fetch(ddOpts.itemKey || "Id");
        var textpath = DPath.fetch(ddOpts.itemText || "Text");
        var items;
        var itemsOpt = ddOpts.items;
        function makeItems(items) {
            if (readonly) {
                var key = fieldView.getValue();
                for (var i = 0, j = items.length; i < j; i++) {
                    var item = items[i];
                    var id = keypath.getValue(item);
                    if (id == key) {
                        inputElement.innerHTML = textpath.getValue(item);
                        inputElement.__YA_SELECTITEM = item;
                        break;
                    }
                }
                inputElement.innerHTML = "";
            }
            else {
                buildSelectOptions(inputElement, items || [], keypath, textpath, fieldView.fieldsetView.TEXT(ddOpts.noSelectedText || "请选择..."));
            }
        }
        if (itemsOpt.url) {
            var ajaxOpts = itemsOpt;
            if (readonly) {
                inputElement.innerHTML = fieldView.fieldsetView.TEXT("加载中...");
            }
            else {
                buildSelectOptions(inputElement, [], keypath, textpath, fieldView.fieldsetView.TEXT("加载中..."));
            }
            YA.ajax(ajaxOpts).then(function (value) {
                items = value;
                makeItems(value);
            });
        }
        else if (isArray(itemsOpt)) {
            items = itemsOpt;
            makeItems(itemsOpt);
        }
        if (readonly) {
            return {
                element: inputElement,
                getValue: function () { return ddOpts.isObjectValue ? inputElement.__YA_SELECTITEM : keypath.getValue(inputElement.__YA_SELECTITEM); },
                setValue: function (value) {
                    var key = value;
                    if (isObject(value)) {
                        key = keypath.getValue(value);
                    }
                    for (var i = 0, j = items.length; i < j; i++) {
                        var item = items[i];
                        var id = keypath.getValue(item);
                        if (id == value) {
                            inputElement.innerHTML = textpath.getValue(item);
                            inputElement.__YA_SELECTITEM = item;
                            break;
                        }
                    }
                    inputElement.innerHTML = "";
                },
                valuechange: function (handler) { }
            };
        }
        return {
            element: inputElement,
            getValue: function () {
                var opt = inputElement.options[inputElement.selectedIndex];
                return ddOpts.isObjectValue ? opt.__YA_SELECTITEM : opt.value;
            },
            setValue: function (value) {
                var key = value;
                if (isObject(value)) {
                    key = keypath.getValue(value);
                }
                for (var i = 0, j = inputElement.options.length; i < j; i++) {
                    var opt = inputElement.options[i];
                    if (opt.value === key) {
                        inputElement.selectedIndex = i;
                        opt.selected = true;
                        break;
                    }
                }
            },
            valuechange: function (handler) {
                var immidiate = function () {
                    var opt = inputElement.options[inputElement.selectedIndex];
                    var value = ddOpts.isObjectValue ? opt.__YA_SELECTITEM : opt.value;
                    handler(value);
                };
                YA.attach(inputElement, "blur", immidiate);
                YA.attach(inputElement, "change", immidiate);
            }
        };
    };
    function buildSelectOptions(select, items, keypath, textpath, noSelected) {
        select.innerHTML = "";
        if (noSelected) {
            var option = YA.createElement("option");
            option.value = "";
            option.text = noSelected;
            select.appendChild(option);
        }
        for (var i = 0, j = items.length; i < j; i++) {
            var item = items[i];
            var option = YA.createElement("option");
            option.value = keypath.getValue(item);
            option.text = textpath.getValue(item);
            option.__YA_SELECTITEM = item;
            select.appendChild(option);
        }
    }
    var FieldsetViewTypes;
    (function (FieldsetViewTypes) {
        FieldsetViewTypes[FieldsetViewTypes["Detail"] = 0] = "Detail";
        FieldsetViewTypes[FieldsetViewTypes["Edit"] = 1] = "Edit";
        FieldsetViewTypes[FieldsetViewTypes["Filter"] = 2] = "Filter";
        FieldsetViewTypes[FieldsetViewTypes["Row"] = 3] = "Row";
        FieldsetViewTypes[FieldsetViewTypes["HeadRow"] = 4] = "HeadRow";
    })(FieldsetViewTypes = YA.FieldsetViewTypes || (YA.FieldsetViewTypes = {}));
    var FieldsetView = /** @class */ (function () {
        function FieldsetView(opts) {
            this.opts = opts;
            this.element = opts.element;
            this.fieldset = opts.fieldset;
            this.fieldsetViewType = (typeof opts.fieldsetViewType === "string") ? FieldsetViewTypes[opts.fieldsetViewType] : opts.fieldsetViewType;
            this._makeDetailElement(this.name);
        }
        FieldsetView.prototype._makeDetailElement = function (layoutName) {
            var fields = this.opts.fields;
            this.fieldviews = [];
            var elem = this.element || YA.createElement("div");
            elem.innerHTML = "";
            elem.className = "fieldset " + (layoutName || "");
            for (var name_2 in fields) {
                var fieldOpts = fields[name_2];
                if (fieldOpts.accessPermission === AccessPermissions.Denied)
                    continue;
                if (layoutName !== undefined) {
                    var layout = fieldOpts.layout || "";
                    if (layout !== layoutName)
                        continue;
                }
                if (!fieldOpts.name)
                    fieldOpts.name = name_2;
                //let restoredType = fieldOpts.feildViewType;
                var fieldView = new FieldView(fieldOpts, this);
                this.fieldviews.push(fieldView);
                elem.appendChild(fieldView.element);
            }
        };
        FieldsetView.prototype.TEXT = function (txt) {
            return txt;
        };
        FieldsetView.prototype.getValue = function () {
            return this._data || (this._data = {});
        };
        FieldsetView.prototype.setValue = function (value) {
            var data = this._data = value || {};
            for (var name_3 in this.fieldviews) {
                var fieldview = this.fieldviews[name_3];
                fieldview.refresh();
            }
            return this;
        };
        FieldsetView.prototype.validate = function () {
            var rs;
            var hasError = false;
            for (var i in this.fieldviews) {
                var fieldview = this.fieldviews[i];
                var fieldValid = fieldview.validate();
                if (fieldValid) {
                    if (!rs)
                        rs = {};
                    rs[fieldview.field.name] = fieldValid;
                    hasError = true;
                }
            }
            return rs;
        };
        return FieldsetView;
    }());
    YA.FieldsetView = FieldsetView;
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
})(YA || (YA = {}));
