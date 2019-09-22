var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var YA1;
(function (YA1) {
    YA1.trimRegx = /(^\s+)|(\s+$)/gi;
    YA1.intRegx = /^\s*(\+\-)?\d+\s*$/;
    YA1.numberRegx = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*$/;
    YA1.percentRegx = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*\%\s*$/;
    YA1.quoteRegx = /"/gi;
    var lastRegx = /^last(?:-(\d+))?$/;
    function trim(txt) {
        return txt ? txt.toString().replace(YA1.trimRegx, "") : "";
    }
    YA1.trim = trim;
    var delegateFactories = [];
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
    YA1.delegate = delegate;
    var funcsFactories = [];
    function createFuncs(argc, ck, eq) {
        var factory = funcsFactories[argc || 0];
        if (!factory) {
            var argList = "";
            for (var i = 0, j = argc; i < j; i++) {
                if (argList)
                    argList += ",";
                argList += "arg" + i;
            }
            var code = "var handlers = [];\n            var funcs = function(" + argList + "){\n                var result;\n                for(let i=0,j=handlers.length;i<j;i++){\n                    let handler = handlers[i];\n                    if(ck){\n                        handler = ck(handler);\n                        if(!handler) continue;\n                    }\n                    let rs = handler(" + argList + ");\n                    if(rs!==undefined){\n                        result = rs;\n                        if(rs===false)break;\n                    }\n                }\n                return result;\n            };\n            funcs.__YA_FUNCS_HANLDERS = handlers;\n            funcs.add=function(handler){\n                handlers.push(handler);\n            }\n            funcs.remove=function(handler){\n                for(var i=0,j=handlers.length;i<j;i++){\n                    var existed = handlers.shift();\n                    if(existed !==handler && (eq ?!eq(handler,existed):true)){\n                        continue;\n                    }\n                }\n            }\n            return funcs;\n";
            factory = funcsFactories[argc] = new Function("ck", "eq", code);
        }
        return factory(ck, eq);
    }
    YA1.createFuncs = createFuncs;
    var DataPath = /** @class */ (function () {
        function DataPath(path) {
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
                        throw new Error("Invalid DataPath:" + path);
                    var txt_1 = path.substring(lastAt + 1, at).replace(YA1.trimRegx, "");
                    if (txt_1 === "") {
                        if (lastPropName && lastTokenCode != 93)
                            throw new Error("Invalid DataPath:" + path);
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
                        throw new Error("Invalid DataPath:" + path);
                    var txt_2 = path.substring(lastAt + 1, at).replace(YA1.trimRegx, "");
                    if (txt_2 === "") {
                        if (!lastPropName || lastTokenCode !== 93)
                            throw new Error("Invalid DataPath:" + path);
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
                        throw new Error("Invalid DataPath:" + path);
                    var txt_3 = path.substring(lastAt + 1, at).replace(YA1.trimRegx, "");
                    if (txt_3 === "")
                        throw new Error("Invalid DataPath:" + path);
                    var match = txt_3.match(lastRegx);
                    if (match) {
                        txt_3 = "$obj$.length-1";
                        if (match[1]) {
                            txt_3 = "$obj$.length-1-" + match[1];
                        }
                    }
                    buildCodes(txt_3, true);
                    inBrace = false;
                    lastTokenCode = ch;
                    lastAt = at;
                    continue;
                }
            }
            if (inBrace)
                throw new Error("Invalid DataPath:" + path);
            var txt = path.substr(lastAt + 1).replace(YA1.trimRegx, "");
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
        DataPath.prototype.getValue = function (data) { };
        DataPath.prototype.setValue = function (data, value) {
            return this;
        };
        return DataPath;
    }());
    YA1.DataPath = DataPath;
    var Binder = /** @class */ (function () {
        function Binder(path, accessor) {
            this.path = path;
            this.accessor = accessor;
        }
        Binder.prototype.update = function (data, diff) {
            this.path.setValue(data, this.accessor());
        };
        Binder.prototype.renovate = function (data, diff) {
            var newValue = this.path.getValue(data);
            this.accessor(newValue);
        };
        Binder.tryMake = function (pathExpr, prop, comp) {
            if (typeof pathExpr !== "string")
                return pathExpr;
            pathExpr = pathExpr.replace(YA1.trimRegx, "");
            if (pathExpr[0] == "@") {
                if (pathExpr[1] == "@")
                    return;
                return new Binder(new DataPath(pathExpr), delegate(comp[prop], comp, 3));
            }
            if (pathExpr[0] == "{" && pathExpr[pathExpr.length - 1] == "}") {
                if (pathExpr[1] == "{")
                    return;
                return new ObjectBinder(new DataPath(pathExpr.substring(1, pathExpr.length - 1)), delegate(comp[prop], comp, 3));
            }
            if (pathExpr[0] == "<" && pathExpr[pathExpr.length - 1] == ">") {
                if (pathExpr[1] == "<")
                    return;
                return new ObjectBinder(new DataPath(pathExpr.substring(1, pathExpr.length - 1)), delegate(comp[prop], comp, 3));
            }
            //return pathExpr;
        };
        return Binder;
    }());
    YA1.Binder = Binder;
    var ObjectBinder = /** @class */ (function (_super) {
        __extends(ObjectBinder, _super);
        function ObjectBinder(path, accessor) {
            return _super.call(this, path, accessor) || this;
        }
        ObjectBinder.prototype.update = function (data, diff) {
            var srcData = this.accessor();
            if (diff) {
                var modelData = this.path.getValue(data);
                merge(modelData, srcData);
                this.path.setValue(data, modelData);
            }
            else {
                this.path.setValue(data, srcData);
            }
        };
        ObjectBinder.prototype.renovate = function (data, diff) {
            var newValue = this.path.getValue(data);
            if (diff) {
                for (var n in newValue) {
                    this.accessor(n, newValue[n], diff);
                }
            }
            else {
                this.accessor(newValue);
            }
        };
        return ObjectBinder;
    }(Binder));
    YA1.ObjectBinder = ObjectBinder;
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
    YA1.merge = merge;
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
    YA1.xable = xable;
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
    YA1.Observable = Observable;
    var Compositable = /** @class */ (function () {
        function Compositable(injectTaget) {
            if (injectTaget)
                xable(injectTaget, Compositable);
            //this.onComponentChanged=null;
        }
        Compositable.prototype.onComponentChanged = function (event, component, index) { };
        Compositable.prototype.length = function () {
            return this._components ? this._components.length : 0;
        };
        Compositable.prototype.name = function (value) {
            if (value === undefined)
                return this._name;
            var oldname = this._name;
            if (this._name = value) {
                if (oldname && this._composite) {
                    delete this._composite[oldname];
                    if (value)
                        this._composite[value] = this;
                }
            }
            return this;
        };
        Compositable.prototype.composite = function (newParent, internalUsage) {
            if (newParent === undefined)
                return this._composite;
            if (newParent === this._composite)
                return this;
            if (internalUsage === "<internal_use>") {
                this._composite = newParent;
                return this;
            }
            if (this._composite)
                this._composite.remove(this);
            if (newParent === null) {
                this._composite = null;
            }
            else {
                newParent.add(this);
            }
            return this;
        };
        Compositable.prototype.components = function (name, child, evtable) {
            if (name === undefined) {
                return (this._components || (this._components = []));
            }
            if (child === undefined) {
                if (typeof name === "string")
                    return this[name];
                return this._components[name];
            }
            var children = this._components || (this._components = []);
            var index;
            var childName = child.name();
            for (var i = 0, j = children.length; i < j; i++) {
                var existed = children.shift();
                var existedName = existed.name();
                if (existedName === name) {
                    children.push(child);
                    index = i;
                }
                else if (i === name) {
                    children.push(child);
                    if (existedName !== childName) {
                        delete this[existedName];
                        this[childName] = child;
                    }
                    index = i;
                }
                else
                    children.push(existed);
            }
            if (index === undefined) {
                children.push(child);
                if (childName)
                    this[childName] = child;
                if (this.onComponentChanged) {
                    this.onComponentChanged("added", child);
                }
            }
            else {
                if (this.onComponentChanged) {
                    this.onComponentChanged("replaced", child, index);
                }
            }
        };
        Compositable.prototype.add = function (child, index, eventable) {
            var oldParent = child.composite();
            if (oldParent)
                oldParent.remove(child);
            this._add(child, index);
            if (this.onComponentChanged) {
                this.onComponentChanged("added", child, index);
            }
            return this;
        };
        Compositable.prototype._add = function (child, index) {
            var components = this._components || (this._components = []);
            var inserted;
            for (var i = 0, j = components.length; i < j; i++) {
                var existed = components.shift();
                if (inserted === index) {
                    if (i == index) {
                        components.push(child);
                        inserted = index;
                    }
                    else {
                        if (existed === child) {
                            index++;
                            continue;
                        }
                    }
                }
                components.push(existed);
            }
            if (!inserted) {
                components.push(child);
            }
            if (child.name())
                this[child.name()] = child;
            child.composite(this, "<internal_use>");
            return inserted;
        };
        Compositable.prototype.remove = function (child, evtable) {
            var components = this._components;
            if (!components || components.length == 0)
                throw new Error("不是该节点的子节点");
            var removed = false;
            var index;
            for (var i = 0, j = components.length; i < j; i++) {
                var existed = components.shift();
                if (existed !== child) {
                    components.push(existed);
                }
                else {
                    removed = true;
                    index = i;
                }
            }
            if (!removed)
                throw new Error("不是该节点的子节点");
            if (child._name)
                delete this[child._name];
            child.composite(null, "<internal_use>");
            if (this.onComponentChanged) {
                this.onComponentChanged("removed", child, index);
            }
            return this;
        };
        return Compositable;
    }());
    YA1.Compositable = Compositable;
    function createElement(tagName) {
        return document.createElement(tagName);
    }
    YA1.createElement = createElement;
    YA1.getStyle = function (obj, attr) {
        if (obj.currentStyle) {
            YA1.getStyle = YA1.getStyle = function (obj, attr) { return obj.currentStyle[attr]; };
        }
        else {
            YA1.getStyle = YA1.getStyle = function (obj, attr) {
                var f = false;
                return getComputedStyle(obj, f)[attr];
            };
        }
        return YA1.getStyle(obj, attr);
    };
    YA1.attach = function (elem, event, handler) {
        if (elem.addEventListener) {
            YA1.attach = YA1.attach = function (elem, event, handler) { return elem.addEventListener(event, handler, false); };
        }
        else {
            YA1.attach = YA1.attach = function (elem, event, handler) { return elem.attachEvent("on" + event, handler); };
        }
        return YA1.attach(elem, event, handler);
    };
    YA1.detech = function (elem, event, handler) {
        if (elem.removeEventListener) {
            YA1.detech = YA1.detech = function (elem, event, handler) { return elem.removeEventListener(event, handler, false); };
        }
        else {
            YA1.detech = YA1.detech = function (elem, event, handler) { return elem.detechEvent("on" + event, handler); };
        }
        return YA1.detech(elem, event, handler);
    };
    function isInview(element) {
        var doc = element.ownerDocument;
        while (element) {
            if (element === doc.body)
                return true;
            element = element.parentNode;
        }
        return false;
    }
    YA1.isInview = isInview;
    var notify = Observable.prototype.notify;
    var Component = /** @class */ (function (_super) {
        __extends(Component, _super);
        function Component(element) {
            var _this = _super.call(this) || this;
            if (typeof element === "string") {
                _this.element = createElement(element);
                return _this;
            }
            if (element.nodeType !== undefined) {
                _this.element = element;
                return _this;
            }
            var opts = element;
            var tag = opts.tag || "div";
            _this.element = createElement(tag);
            _this.element.__YA_COMPOMENT = _this;
            _this.opts(opts);
            return _this;
        }
        Component.prototype.get_eventHandlers = function (event, addIfNone) {
            return Observable.prototype.get_eventHandlers.call(this, event, addIfNone);
        };
        Component.prototype.subscribe = function (event, handler, capture) {
            var _this = this;
            var convertor = YA1.eventConvertors[event];
            if (convertor) {
                var funcs_1 = (this._bindedEvents || (this._bindedEvents = {}))[event];
                if (!funcs_1) {
                    funcs_1 = this._bindedEvents[event] = this.get_eventHandlers(event, true);
                    (function (fns) { return YA1.attach(_this.element, event, function (sender, evt) {
                        var args;
                        if (evt === undefined) {
                            evt = sender;
                            sender = undefined;
                            args = convertor(evt || (evt = window.event));
                            var target = evt.target;
                            while (target) {
                                if (sender = target.__YA_COMPOMENT) {
                                    break;
                                }
                                target = target.parentNode;
                            }
                        }
                        return funcs_1(sender || component, args);
                    }); })(funcs_1);
                }
                funcs_1.add(handler);
            }
            else {
                this.get_eventHandlers(event, true).add(handler);
            }
            return this;
        };
        Component.prototype.unsubscribe = function (event, handler, capture) {
            return Observable.prototype.unsubscribe(event, handler, capture);
        };
        Component.prototype.notify = function (event, args) {
            if (this._preventEvent)
                return this;
            args = args || { src: this };
            notify.call(this, args);
            if (!args.canceled && this._composite) {
                this._composite.notify(event, args);
            }
            return this;
        };
        Component.prototype.onComponentChanged = function (event, component, index) {
            var contentElement = this.contentElement();
            if (event === "added") {
                if (index === undefined) {
                    contentElement.appendChild(component.element);
                }
                else {
                    var a = contentElement.childNodes[index];
                    contentElement.insertBefore(component.element, a);
                }
                if (isInview(this.element))
                    component.refresh();
                this.notify("componentChange", { index: index, component: component, type: "added", src: this });
            }
            else if (event === "removed") {
                contentElement.removeChild(component.element);
                this.notify("componentChange", { index: index, component: component, type: "removed", src: this });
            }
            else if (event === "replaced") {
                contentElement.replaceChild(component.element, contentElement.childNodes[index]);
                this.notify("componentChange", { index: index, component: component, type: "replaced", src: this });
            }
        };
        Component.prototype.componentChange = function (handler) {
            this.subscribe("componentChange", handler);
            return this;
        };
        Component.prototype.contentElement = function () {
            return this.element;
        };
        Component.prototype.root = function () {
            var root = this._root;
            if (!root) {
                root = this.element.ownerDocument.__YA_ROOT_COMPONENT;
                if (!root) {
                    var rootElement = this.element.ownerDocument.compatMode === "BackCompat" ? this.element.ownerDocument.body : this.element.ownerDocument.documentElement;
                    root = this._root = this.element.ownerDocument.__YA_ROOT_COMPONENT = new Component(rootElement);
                }
                else
                    this._root = root;
            }
            return root;
        };
        Component.prototype.opts = function (opts) {
            if (opts === undefined)
                return this._opts;
            if (this._opts)
                throw new Error("还不支持重复设置opts");
            var oldPrevent = this._preventEvent;
            this._preventEvent = true;
            for (var key in opts) {
                var value = opts[key];
                var cmd = key[0];
                if (cmd == "#") {
                    var name_1 = key.substr(1);
                    value.name = name_1;
                    var ctype = value.type;
                    var cls = YA1.componentTypes[ctype] || Component;
                    var component_1 = new cls(value);
                    this.add(component_1);
                    continue;
                }
                else if (cmd == "!") {
                    var name_2 = key.substr(1);
                    if (typeof value === "function") {
                        this.subscribe(name_2, value);
                    }
                    else {
                        var dataPath = new DataPath(value);
                    }
                }
                else if (typeof value === "string") {
                    var binder = Binder.tryMake(value, key, this);
                    if (binder) {
                        var binders = this._binders || (this._binders = {});
                        binders[key] = binder;
                        continue;
                    }
                }
                var prop = this[key];
                if (typeof prop === "function") {
                    prop.call(this, value);
                }
            }
            this._preventEvent = oldPrevent;
            return this;
        };
        Component.prototype.dock = function (value) {
            if (value === undefined)
                return this._dock;
            if (this._dock != value) {
                this._dock = value;
                if (this._composite) {
                    this._composite.refresh(false);
                }
            }
            return this;
        };
        Component.prototype.className = function (value) {
            if (value === undefined)
                return this.element.className;
            this.element.className = value;
            return this;
        };
        Component.prototype.content = function (value) {
            if (value === undefined)
                return this.contentElement().innerHTML;
            this.contentElement().innerHTML = value;
            return this;
        };
        Component.prototype.visible = function (value) {
            if (value === undefined) {
                if (this._visible === undefined) {
                    this._visible = YA1.getStyle(this.element, "display") !== "none";
                }
                if (this._visible) {
                    return this._composite ? this._composite.visible() : true;
                }
                else {
                    return false;
                }
            }
            else {
                if (this._disNone === undefined) {
                    var v = YA1.getStyle(this.element, "display");
                    if (v === "none")
                        v = "block";
                    else
                        this._disNone = v;
                }
                if (this._visible === value)
                    return this;
                if (value === false) {
                    this.element.style.display = "none";
                    this._visible = false;
                }
                else {
                    this.element.style.display = this._disNone;
                    this._visible = true;
                }
                return this;
            }
        };
        Component.prototype.show = function (animate) {
        };
        Component.prototype.x = function (value) {
            if (value === undefined || value === true) {
                return this._x = parseFloat(this.css("left"));
            }
            if (value === false) {
                if (this._x === undefined)
                    this._x = parseFloat(this.css("left"));
                return this._x;
            }
            return this.move({ x: value });
        };
        Component.prototype.y = function (value) {
            if (value === undefined || value === true) {
                return this._y = parseFloat(this.css("top"));
            }
            if (value === false) {
                if (this._y === undefined)
                    this._y = parseFloat(this.css("top"));
                return this._y;
            }
            return this.move({ y: value });
        };
        Component.prototype.move = function (args) {
            if (typeof args === "function") {
                this.subscribe("move", args);
                return this;
            }
            if (this._dock && !this._preventEvent) {
                console.warn("已经设置了停靠dock,再设置y()为无效操作");
                //return this;
            }
            this.position(true);
            if (args.x !== undefined)
                this.element.style.left = (this._x = args.x) + "px";
            if (args.y !== undefined)
                this.element.style.top = (this._y = args.y) + "px";
            this.notify("move", { x: args.x, y: args.y, src: this, type: "move" });
            return this;
        };
        Component.prototype.location = function (point, relative) {
            if (point === undefined || point === "absolute") {
                var elm = this.element;
                var p = { x: 0, y: 0 };
                var meetBody = false;
                while (elm) {
                    p.x += elm.offsetLeft;
                    p.y += elm.offsetTop;
                    elm = elm.offsetParent;
                    if (elm === elm.ownerDocument.body) {
                        meetBody = true;
                    }
                }
                if (meetBody)
                    return p;
                else
                    return {};
            }
            else if (point === "fixed") {
                //let scrollx = Math.max(document.body.scrollLeft,document);
            }
        };
        Component.prototype.width = function (value) {
            if (value === undefined || value === false) {
                return this._width;
            }
            else if (value === true) {
                return this.element.clientWidth;
            }
            if (this._dock && !this._preventEvent) {
                console.warn("已经设置了停靠dock,再设置width()为无效操作");
                //return this;
            }
            if (value === this._width)
                return this;
            this._width = value;
            if (YA1.intRegx.test(this._width)) {
                this.element.style.width = this._width + "px";
            }
            else
                this.element.style.width = this._width;
            return this.notify("resize", { width: this.element.clientWidth });
        };
        Component.prototype.height = function (value) {
            if (value === undefined || value === false) {
                return this._height;
            }
            else if (value === true) {
                return this.element.clientHeight;
            }
            if (this._dock && !this._preventEvent) {
                console.warn("已经设置了停靠dock,再设置height()为无效操作");
                //return this;
            }
            if (value === this._height)
                return this;
            this._height = value;
            if (YA1.intRegx.test(this._height)) {
                this.element.style.height = this._height + "px";
            }
            else {
                this.element.style.height = this._height;
            }
            return this.notify("resize", { height: this.element.clientHeight });
        };
        Component.prototype.resize = function (args) {
            if (typeof args === "function") {
                return this.subscribe("resize", args);
            }
            if (args.width !== undefined)
                this.element.style.width = (this._width = args.width) + "px";
            if (args.height !== undefined)
                this.element.style.height = (this._height = args.height) + "px";
            return this.notify("resize", { type: "resize", width: args.width, height: args.height, src: this });
        };
        Component.prototype.position = function (value) {
            if (value === undefined)
                return this.css("position");
            if (value === true) {
                var v = this.css("position");
                if (v === 'static')
                    this.element.style.position = "relative";
                return this;
            }
            this.element.style.position = value;
            return this;
        };
        Component.prototype.scrollX = function (value) {
            if (value === undefined) {
                return this.element.scrollLeft;
            }
            return this.scroll({ x: value });
        };
        Component.prototype.scrollY = function (value) {
            if (value === undefined) {
                return this.element.scrollTop;
            }
            return this.scroll({ y: value });
        };
        Component.prototype.scroll = function (point) {
            if (typeof point === "function") {
                return this.subscribe("scroll", point);
            }
            if (point.x)
                this.element.scrollLeft = point.x;
            if (point.y)
                this.element.scrollTop = point.y;
            return this.notify("scroll", { type: "scroll", src: this, x: point.x, y: point.y });
        };
        Component.prototype.resizable = function (value) {
            var _this = this;
            if (value === undefined)
                return this._resizable;
            var dockPos = this._dock;
            if (dockPos === "left") {
                this._resizableMousemoveHandler = function (sender, args) {
                    var w = _this.width(true);
                    var borderx = w - 4;
                    if (args.x < borderx) {
                        _this.cursor("default");
                    }
                    else {
                        _this.cursor("ew-resize");
                    }
                };
                this.subscribe("mousemove", this._resizableMousemoveHandler);
                this._resizableMousedownHandler = function (sender, args) {
                    var w = _this.width(true);
                    var x0;
                    var y0;
                    var borderx = w - 4;
                    if (args.x > borderx) {
                        var mask_1 = createElement("div");
                        mask_1.style.cssText = "position:absolute;z-index:999999;width:100%;background-color:#fff;opacity:0.4;left:0;top:0;";
                        mask_1.style.height = _this.root().height(true) + "px";
                        _this.root().element.appendChild(mask_1);
                        mask_1.onmouseover = function (evt) {
                            x0 = evt.offsetX;
                            y0 = evt.offsetY;
                            mask_1.onmouseover = null;
                        };
                        mask_1.onmousemove = function (evt) {
                            var x = evt.offsetX;
                            var y = evt.offsetY;
                            _this.width(w + x - x0);
                            _this._composite.refresh(false);
                        };
                        mask_1.onmouseout = mask_1.onmouseup = function (evt) {
                            mask_1.parentNode.removeChild(mask_1);
                        };
                    }
                };
                this.subscribe("mousedown", this._resizableMousedownHandler);
            }
        };
        Component.prototype.css = function (name, value) {
            if (value === undefined) {
                if (typeof name === 'object') {
                    for (var n in name)
                        this.css(n, name[n]);
                    return this;
                }
                return YA1.getStyle(this.element, name);
            }
            this.element.style[name] = value;
            return this;
        };
        Component.prototype.opacity = function (value) {
            if (value === undefined)
                return parseFloat(this._opacity === undefined ? (this._opacity = YA1.getStyle(this.element, "opacity")).toString() : this._opacity);
            this.element.style.opacity = this._opacity = value.toString();
            return this;
        };
        Component.prototype.cursor = function (value) {
            if (value === undefined)
                return YA1.getStyle(this.element, "cursor");
            this.element.style.cursor = value;
            return this;
        };
        Component.prototype.attrs = function (name, value) {
            if (value === undefined) {
                if (typeof name === 'object') {
                    for (var n in name)
                        this.attrs(n, name[n]);
                    return this;
                }
                return this.element.getAttribute(name);
            }
            this.element.setAttribute(name, value);
            return this;
        };
        Component.prototype.suspend = function (handler) {
            if (handler) {
                var old = this._preventEvent;
                this._preventEvent = true;
                var result = handler(this);
                this._preventEvent = old;
                if (result !== false && old)
                    this.refresh();
                return this;
            }
            this._preventEvent = true;
            return this;
        };
        Component.prototype.resume = function () {
            var old = this._preventEvent;
            this._preventEvent = false;
            if (old)
                this.refresh();
            return this;
        };
        Component.prototype.refresh = function (includeChildren) {
            var _this = this;
            var children = this._components;
            var dockInfo;
            if (children && children.length) {
                var filledChilds = [];
                var _loop_1 = function (i, j) {
                    var child = children[i];
                    var dockPos = child.dock();
                    if (dockPos) {
                        if (!dockInfo) {
                            var w = this_1.width(true);
                            var h = this_1.height(true);
                            dockInfo = {
                                left_x: 0, top_y: 0, spaceWidth: w,
                                right_x: w, bottom_y: h, spaceHeight: h
                            };
                            this_1.position(true);
                        }
                        if (dockPos === "fill") {
                            filledChilds.push(child);
                            return "continue";
                        }
                        child.suspend(function (me) { return _this._makeDock(child, dockInfo); });
                    }
                    if (includeChildren !== false)
                        child.refresh(includeChildren);
                };
                var this_1 = this;
                for (var i = 0, j = children.length; i < j; i++) {
                    _loop_1(i, j);
                }
                if (filledChilds.length) {
                    var _loop_2 = function (i) {
                        var child = filledChilds[i];
                        child.suspend(function (me) { return _this._makeDock(child, dockInfo); });
                    };
                    for (var i = 0; i < filledChilds.length; i++) {
                        _loop_2(i);
                    }
                }
            }
            return this;
        };
        //_dockInfo:IDockInfo;
        Component.prototype._makeDock = function (child, dockInfo) {
            if (dockInfo.spaceHeight <= 0 || dockInfo.spaceWidth <= 0) {
                child.visible(false);
                return;
            }
            var dockPos = child.dock();
            child.position("absolute");
            if (dockPos === "left") {
                var cw = child.width(true);
                child.resize({
                    width: (cw >= dockInfo.spaceWidth) ? (cw = dockInfo.spaceWidth) : undefined,
                    height: dockInfo.spaceHeight
                }).move({
                    x: dockInfo.left_x,
                    y: dockInfo.top_y
                });
                dockInfo.left_x += cw;
                dockInfo.spaceWidth -= cw;
            }
            else if (dockPos === "right") {
                var cw = child.width(true);
                dockInfo.right_x -= cw;
                child.resize({
                    width: (cw >= dockInfo.spaceWidth) ? (cw = dockInfo.spaceWidth) : undefined,
                    height: dockInfo.spaceHeight
                }).move({
                    x: dockInfo.right_x,
                    y: dockInfo.top_y
                });
                dockInfo.spaceWidth -= cw;
            }
            else if (dockPos === "top") {
                var ch = child.height(true);
                child.resize({
                    height: (ch >= dockInfo.spaceHeight) ? (ch = dockInfo.spaceWidth) : undefined,
                    width: dockInfo.spaceWidth
                }).move({
                    x: dockInfo.left_x,
                    y: dockInfo.top_y
                });
                dockInfo.top_y += ch;
                dockInfo.spaceHeight -= ch;
            }
            else if (dockPos === "bottom") {
                var ch = child.height(true);
                dockInfo.bottom_y -= ch;
                child.resize({
                    height: (ch >= dockInfo.spaceHeight) ? (ch = dockInfo.spaceWidth) : undefined,
                    width: dockInfo.spaceWidth
                }).move({
                    x: dockInfo.left_x,
                    y: dockInfo.bottom_y
                });
                dockInfo.spaceHeight -= ch;
            }
            else if (dockPos === "fill") {
                child.resize({ width: dockInfo.spaceWidth, height: dockInfo.spaceHeight });
                child.move({ x: dockInfo.left_x, y: dockInfo.top_y });
            }
            return false;
        };
        Component.prototype.renovate = function (data, diff) {
            var oldPrevent = this._preventEvent;
            this._preventEvent = true;
            var binders = this._binders;
            if (binders) {
                for (var n in binders) {
                    binders[n].renovate(data, diff);
                }
            }
            var children = this._components;
            if (children && children.length) {
                for (var i = 0, j = children.length; i < j; i++) {
                    var child = children[i];
                    child.renovate(data, diff);
                }
            }
            this._preventEvent = oldPrevent;
            this.refresh();
            return this;
        };
        Component.prototype.update = function (data, diff) {
            var binders = this._binders;
            if (binders) {
                for (var n in binders) {
                    binders[n].update(data, diff);
                }
            }
            var children = this._components;
            if (children && children.length) {
                for (var i = 0, j = children.length; i < j; i++) {
                    var child = children[i];
                    child.update(data, diff);
                }
            }
            return this;
        };
        Component.feature = function (name, feature) {
            Component.prototype[name] = feature;
        };
        Component.types = {};
        return Component;
    }(Compositable));
    YA1.Component = Component;
    YA1.componentTypes = Component.types;
    function component(opts, parent) {
        var cls = YA1.componentTypes[opts.type] || Component;
        var component = new cls(opts);
        if (!parent)
            return component;
        if (parent.nodeType) {
            parent.appendChild(component.element);
            component.refresh();
        }
        if (parent.add) {
            parent.add(component);
        }
        return component;
    }
    YA1.component = component;
    YA1.eventConvertors = {};
    YA1.eventConvertors["scroll"] = function (e) {
        return { type: "scroll", x: e.target.scrollLeft, y: e.target.scrollTop };
    };
    YA1.eventConvertors["focus"] = function (e) { return ({ type: "focus" }); };
    YA1.eventConvertors["mousemove"] = function (e) { return keyEventConvertor(e, mouseEventConvertor(e, { type: "mousemove" })); };
    YA1.eventConvertors["mousedown"] = function (e) { return keyEventConvertor(e, mouseEventConvertor(e, { type: "mousedown" })); };
    YA1.eventConvertors["mouseup"] = function (e) { return keyEventConvertor(e, mouseEventConvertor(e, { type: "mouseup" })); };
    YA1.eventConvertors["mouseenter"] = function (e) { return keyEventConvertor(e, mouseEventConvertor(e, { type: "mouseenter" })); };
    YA1.eventConvertors["mouseout"] = function (e) { return keyEventConvertor(e, mouseEventConvertor(e, { type: "mouseout" })); };
    YA1.eventConvertors["click"] = function (e) { return keyEventConvertor(e, mouseEventConvertor(e, { type: "click" })); };
    YA1.eventConvertors["dblclick"] = function (e) { return keyEventConvertor(e, mouseEventConvertor(e, { type: "dblclick" })); };
    YA1.eventConvertors["keyup"] = function (e) { return keyEventConvertor(e, { type: "keyup" }); };
    YA1.eventConvertors["keydown"] = function (e) { return keyEventConvertor(e, { type: "keydown" }); };
    YA1.eventConvertors["keypress"] = function (e) { return keyEventConvertor(e, { type: "keypress" }); };
    function keyEventConvertor(e, args) {
        args || (args = {});
        args.altKey = e.altKey;
        args.ctrlKey = e.ctrlKey;
        args.shiftKey = e.shiftKey;
        args.metaKey = e.metaKey;
        args.code = e.keyCode || e.which;
        return args;
    }
    function mouseEventConvertor(e, args) {
        args || (args = {});
        args.x = e.offsetX;
        args.y = e.offsetY;
        return args;
    }
    Component.feature("mask", function (opts) {
        var me = this;
        var maskc = new Component("div");
        if (opts.css)
            maskc.css(opts.css);
        maskc.className("ya-mask " + (opts.className || ""));
        maskc.css({
            position: "absolute",
            overflow: "hidden",
            zIndex: "9999999"
        });
        maskc.content("<div class='ya-mask-bg' style='position:absolute;left:0;right:0;margin:0;padding:0;border:0;'></div>");
        var maske = maskc.element;
        var maskb = maske.firstChild;
        var refresh = function () {
            var x, y;
            if (me === me.root()) {
                x = me.scrollX();
                y = me.scrollY();
            }
            else {
                var p = me.location("absolute");
                x = p.x;
                y = p.y;
            }
            var w = me.width(true);
            var h = me.height(true);
            maske.style.left = x + "px";
            maske.style.top = y + "px";
            maske.style.width = maskb.style.width = w + "px";
            maske.style.height = maskb.style.height = h + "px";
        };
    });
    var ResizeableComponent = /** @class */ (function (_super) {
        __extends(ResizeableComponent, _super);
        function ResizeableComponent(opts) {
            var _this = _super.call(this) || this;
            _this.element.style.cssText = "box-sizing:content-box;padding:0;overflow:hidden;";
            _this.element.innerHTML = "<div class='component-content'></div><div class='resize-handler'></div>";
            _this._contentElement = _this.element.firstChild;
            _this._rszElement = _this.element.lastChild;
            return _this;
        }
        ResizeableComponent.prototype.update = function () {
            return this;
        };
        return ResizeableComponent;
    }(Component));
    YA1.ResizeableComponent = ResizeableComponent;
    var AnchorableComponent = /** @class */ (function (_super) {
        __extends(AnchorableComponent, _super);
        function AnchorableComponent() {
            return _super.call(this, null) || this;
        }
        AnchorableComponent.prototype.anchorTop = function (value) {
            if (value === undefined)
                return this._anchorTop;
            this._anchorTop = value;
            return this.refresh();
        };
        AnchorableComponent.prototype.anchorBottom = function (value) {
            if (value === undefined)
                return this._anchorBottom;
            this._anchorBottom = value;
            return this.refresh();
        };
        AnchorableComponent.prototype.anchorLeft = function (value) {
            if (value === undefined)
                return this._anchorLeft;
            this._anchorLeft = value;
            return this.refresh();
        };
        AnchorableComponent.prototype.anchorRight = function (value) {
            if (value === undefined)
                return this._anchorRight;
            this._anchorRight = value;
            return this.refresh();
        };
        AnchorableComponent.prototype.refresh = function () {
            _super.prototype.refresh.call(this);
            var elem = this.element;
            if (this._anchorTop != undefined) {
                elem.style.top = this._anchorTop + "px";
            }
            else {
                elem.style.top = "auto";
            }
            if (this._anchorBottom != undefined) {
                var h = this._composite.element.clientHeight;
                h -= elem.offsetTop;
                elem.style.height = h + "px";
            }
            else {
                elem.style.height = "auto";
            }
            if (this._anchorLeft != undefined) {
                elem.style.left = this._anchorLeft + "px";
            }
            else {
                elem.style.left = "auto";
            }
            if (this._anchorRight != undefined) {
                var w = this._composite.element.clientWidth;
                w -= elem.offsetLeft;
                elem.style.width = w + "px";
            }
            else {
                elem.style.width = "auto";
            }
            return this;
        };
        return AnchorableComponent;
    }(Component));
    YA1.AnchorableComponent = AnchorableComponent;
})(YA1 || (YA1 = {}));
var user = {
    id: "uid-yiy",
    roles: [
        { id: 'rid-01', name: "admin", permissions: [] },
        { id: 'rid-02', name: "manager", permissions: [
                { id: "pid-1" },
                { id: "pid-2" },
                { id: "pid-3" }
            ] }
    ]
};
/*
let dp = new YA.DataPath("roles[1].permissions[last-1]");
let v = dp.getValue(user);
console.log(v);
dp.setValue(user,{});
console.log(user.roles[1].permissions[1]);*/
function xxx(ck, eq) {
}
