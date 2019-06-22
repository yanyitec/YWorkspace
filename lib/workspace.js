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
var YA;
(function (YA) {
    YA.trimRegx = /(^\s+)|(\s+$)/gi;
    YA.intRegx = /^\s*(\+\-)?\d+\s*$/;
    YA.numberRegx = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*$/;
    YA.percentRegx = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*\%\s*$/;
    YA.quoteRegx = /"/gi;
    var lastRegx = /^last(?:-(\d+))?$/;
    function trim(txt) {
        return txt ? txt.toString().replace(YA.trimRegx, "") : "";
    }
    YA.trim = trim;
    var delegateFactories = [];
    function delegate(func, self, argc) {
        if (argc === undefined)
            return function () { return func.apply(self, arguments); };
        if (argc === 0)
            return function () { return func.call(self); };
        if (argc === 1)
            return function (arg) { return func.call(self, arg); };
        var dele = delegateFactories[argc];
        if (!dele) {
            var argList = "";
            for (var i = 0, j = argc; i < j; i++) {
                if (argList)
                    argList += ",";
                argList += "arg" + i;
            }
            var code = "return function(" + argList + "){return func.call(self," + argList + ")}";
            dele = delegateFactories[argc] = new Function("func", "self", code);
        }
        return dele(func, self);
    }
    YA.delegate = delegate;
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
                    var txt_1 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
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
                    var txt_2 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
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
                    var txt_3 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
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
        DataPath.prototype.getValue = function (data) { };
        DataPath.prototype.setValue = function (data, value) {
            return this;
        };
        return DataPath;
    }());
    YA.DataPath = DataPath;
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
            pathExpr = pathExpr.replace(YA.trimRegx, "");
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
    YA.Binder = Binder;
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
    YA.ObjectBinder = ObjectBinder;
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
            var maps = this._eventMaps || (this._eventMaps = {});
            var handlers = maps[event] || (maps[event] = []);
            handlers.push(capture ? { handler: handler, capture: this } : handler);
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
                if (handlers) {
                    for (var i = 0, j = handlers.length; i < j; i++) {
                        var existed = handlers.shift();
                        if (capture) {
                            if (existed.handler !== handler)
                                handlers.push(existed);
                        }
                        else {
                            if (existed !== handler)
                                handlers.push(existed);
                        }
                    }
                }
            }
            return this;
        };
        Observable.prototype.notify = function (event, args, sender) {
            var maps = this._eventMaps;
            if (maps) {
                var handlers = maps[event];
                if (handlers) {
                    if (!sender)
                        sender = this;
                    var canceled = false;
                    for (var i = 0, j = handlers.length; i < j; i++) {
                        var existed = handlers.shift();
                        var handler = existed.handler || existed;
                        if (!canceled) {
                            if (existed.capture) {
                                if (existed.capture !== this) {
                                    handlers.push(existed);
                                    continue;
                                }
                            }
                            var result = handler(sender, args);
                            if (result === false || result == "<cancel>") {
                                canceled = true;
                            }
                            else if (result === "<remove>") {
                                continue;
                            }
                            else if (result === "<remove,cancel>" || result === "<cancel,remove>") {
                                canceled = true;
                                continue;
                            }
                            handlers.push(existed);
                        }
                    }
                    if (args)
                        args.canceled = canceled;
                }
            }
            return this;
        };
        return Observable;
    }());
    YA.Observable = Observable;
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
    YA.Compositable = Compositable;
    function createElement(tagName) {
        return document.createElement(tagName);
    }
    YA.createElement = createElement;
    YA.getStyle = function (obj, attr) {
        if (obj.currentStyle) {
            YA.getStyle = function (obj, attr) { return obj.currentStyle[attr]; };
        }
        else {
            YA.getStyle = function (obj, attr) {
                var f = false;
                return getComputedStyle(obj, f)[attr];
            };
        }
        return YA.getStyle(obj, attr);
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
    YA.isInview = isInview;
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
            _this.opts(opts);
            return _this;
        }
        Component.prototype.notify = function (event, args, sender) {
            if (this._preventRefresh)
                return this;
            args = args || {};
            Observable.prototype.notify.call(this, args, sender);
            if (!args.canceled && this._composite) {
                this._composite.notify(event, args, sender);
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
                this.notify("componentAdded", { index: index, component: component }, this);
            }
            else if (event === "removed") {
                contentElement.removeChild(component.element);
                this.notify("componentRemoved", { index: index, component: component }, this);
            }
            else if (event === "replaced") {
                contentElement.replaceChild(component.element, contentElement.childNodes[index]);
                this.notify("componentReplaced", { index: index, component: component }, this);
            }
        };
        Component.prototype.contentElement = function () {
            return this.element;
        };
        Component.prototype.opts = function (opts) {
            if (opts === undefined)
                return this._opts;
            if (this._opts)
                throw new Error("还不支持重复设置opts");
            var oldPrevent = this._preventRefresh;
            this._preventRefresh = true;
            for (var key in opts) {
                var value = opts[key];
                var cmd = key[0];
                if (cmd == ".") {
                    var name_1 = key.substr(1);
                    value.name = name_1;
                    var ctype = value.type;
                    var cls = YA.componentTypes[ctype] || Component;
                    var component_1 = new cls(value);
                    this.add(component_1);
                    continue;
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
            this._preventRefresh = oldPrevent;
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
        Component.prototype.visible = function (value) {
            if (value === undefined) {
                if (this._visible === undefined) {
                    this._visible = YA.getStyle(this.element, "display") !== "none";
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
                    var v_1 = YA.getStyle(this.element, "display");
                    if (v_1 === "none")
                        v_1 = "block";
                    else
                        this._disNone = v_1;
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
        Component.prototype.x = function (value) {
            if (value === undefined || value === true) {
                return this._x = parseFloat(this.css("left"));
            }
            if (value === false) {
                if (this._x === undefined)
                    this._x = parseFloat(this.css("left"));
                return this._x;
            }
            if (this._dock && !this._preventRefresh) {
                console.warn("已经设置了停靠dock,再设置x()为无效操作");
                //return this;
            }
            this.element.style.left = (this._x = value) + "px";
            return this;
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
            if (this._dock && !this._preventRefresh) {
                console.warn("已经设置了停靠dock,再设置y()为无效操作");
                //return this;
            }
            this.element.style.top = (this._y = value) + "px";
            return this;
        };
        Component.prototype.width = function (value) {
            if (value === undefined || value === false) {
                return this._width;
            }
            else if (value === true) {
                return this.element.clientWidth;
            }
            if (this._dock && !this._preventRefresh) {
                console.warn("已经设置了停靠dock,再设置width()为无效操作");
                //return this;
            }
            if (value === this._width)
                return this;
            this._width = value;
            if (YA.intRegx.test(this._width)) {
                this.element.style.width = this._width + "px";
            }
            else
                this.element.style.width = this._width;
            return this;
        };
        Component.prototype.height = function (value) {
            if (value === undefined || value === false) {
                return this._height;
            }
            else if (value === true) {
                return this.element.clientHeight;
            }
            if (this._dock && !this._preventRefresh) {
                console.warn("已经设置了停靠dock,再设置height()为无效操作");
                //return this;
            }
            if (value === this._height)
                return this;
            this._height = value;
            this._percentHeight = undefined;
            if (YA.intRegx.test(this._height)) {
                this.element.style.height = this._height + "px";
            }
            else if (YA.percentRegx.test(this._height)) {
                this._percentHeight = parseFloat(value);
            }
            return this;
        };
        Component.prototype.position = function (value) {
            if (value === undefined)
                return this.css("position");
            if (value === true) {
                var v_2 = this.css("position");
                if (v_2 === 'static')
                    this.element.style.position = "relative";
                return this;
            }
            this.element.style.position = value;
            return this;
        };
        Component.prototype.css = function (name, value) {
            if (value === undefined) {
                if (typeof name === 'object') {
                    for (var n in name)
                        this.css(n, name[n]);
                    return this;
                }
                return YA.getStyle(this.element, name);
            }
            this.element.style[name] = value;
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
                var old = this._preventRefresh;
                this._preventRefresh = true;
                handler(this);
                this._preventRefresh = old;
                return this;
            }
            this._preventRefresh = true;
            return this;
        };
        Component.prototype.resume = function () {
            var old = this._preventRefresh;
            this._preventRefresh = false;
            if (old)
                this.refresh();
            return this;
        };
        Component.prototype.refresh = function (includeCHildren) {
            var _this = this;
            if (this._preventRefresh)
                return this;
            var children = this._components;
            var dockInfo;
            if (children && children.length) {
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
                        if (dockInfo.spaceHeight <= 0 || dockInfo.spaceWidth <= 0) {
                            child.visible(false);
                        }
                        else {
                            child.suspend(function (me) { return _this._makeDock(child, dockInfo); });
                        }
                    }
                    if (includeCHildren)
                        child.refresh(includeCHildren);
                };
                var this_1 = this;
                for (var i = 0, j = children.length; i < j; i++) {
                    _loop_1(i, j);
                }
            }
            return this;
        };
        //_dockInfo:IDockInfo;
        Component.prototype._makeDock = function (child, dockInfo) {
            var dockPos = child.dock();
            child.position("absolute");
            if (dockPos === "left") {
                var cw = child.width(true);
                if (cw >= dockInfo.spaceWidth)
                    this.width(cw = dockInfo.spaceWidth);
                child.x(dockInfo.left_x);
                child.height(dockInfo.spaceHeight);
                child.y(dockInfo.top_y);
                dockInfo.left_x += cw;
                dockInfo.spaceWidth -= cw;
            }
            else if (dockPos === "right") {
                var cw = child.width(true);
                if (cw >= dockInfo.spaceWidth)
                    this.width(cw = dockInfo.spaceWidth);
                dockInfo.right_x -= cw;
                child.x(dockInfo.right_x);
                child.height(dockInfo.spaceHeight);
                child.y(dockInfo.top_y);
                dockInfo.spaceWidth -= cw;
            }
            else if (dockPos === "top") {
                var ch = child.height(true);
                if (ch >= dockInfo.spaceHeight)
                    this.height(ch = dockInfo.spaceHeight);
                child.y(dockInfo.top_y);
                child.width(dockInfo.spaceWidth);
                dockInfo.top_y += ch;
                child.x(dockInfo.left_x);
                dockInfo.spaceHeight -= ch;
            }
            else if (dockPos === "bottom") {
                var ch = child.height(true);
                if (ch > dockInfo.spaceHeight)
                    this.height(ch = dockInfo.spaceHeight);
                dockInfo.bottom_y -= ch;
                child.y(dockInfo.bottom_y);
                child.width(dockInfo.spaceWidth);
                child.x(dockInfo.left_x);
                dockInfo.spaceHeight -= ch;
            }
        };
        Component.prototype.renovate = function (data, diff) {
            var oldPrevent = this._preventRefresh;
            this._preventRefresh = true;
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
            this._preventRefresh = oldPrevent;
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
        Component.types = {};
        return Component;
    }(Compositable));
    YA.Component = Component;
    Observable(Component);
    YA.componentTypes = Component.types;
    function component(opts, parent) {
        var cls = YA.componentTypes[opts.type] || Component;
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
    YA.component = component;
    var LayoutComponent = /** @class */ (function (_super) {
        __extends(LayoutComponent, _super);
        function LayoutComponent() {
            return _super.call(this) || this;
        }
        LayoutComponent.prototype.direction = function (value) {
            if (value === undefined)
                return this._direction;
            this._direction = value;
            return this;
        };
        LayoutComponent.prototype.refresh = function () {
            if (this._preventRefresh)
                return this;
            if (this._direction === "horizontal") {
                this._layout_horizontal();
            }
            else {
            }
            _super.prototype.refresh.call(this);
            return this;
        };
        /**
         *  水平排版
         *
         * @memberof LayoutComponent
         */
        LayoutComponent.prototype._layout_horizontal = function () {
            this.position(true);
            var width = this.width(true);
            var height = this.height(true);
            var components = this._components;
            var headx = 0;
            var tailx = width;
            var usableW = width;
            var unsets = [];
            for (var i = 0, j = components.length; i < j; i++) {
                var component_2 = components[i];
                component_2.css("position", "absolute");
                component_2.height(height);
                var cw = component_2.width(true);
                if (usableW <= 0) {
                    component_2.visible(false);
                    break;
                }
                if (usableW < cw) {
                    component_2.width(usableW);
                    cw = usableW;
                }
                usableW -= cw;
                var dock = component_2.dock();
                if (dock === "head") {
                    component_2.x(headx);
                    headx += cw;
                    usableW -= cw;
                }
                else if (dock === "tail") {
                    tailx -= cw;
                    component_2.x(tailx);
                    usableW -= cw;
                }
                else {
                    unsets.push(component_2);
                }
            }
            if (usableW >= 0 && unsets.length > 0) {
                for (var i = 0, j = unsets.length - 1; i < j; i++) {
                    var component_3 = components[i];
                    if (usableW <= 0) {
                        component_3.visible(false);
                        break;
                    }
                    component_3.position("absolute");
                    component_3.height(height);
                    var cw = component_3.width(true);
                    if (usableW < cw) {
                        component_3.width(usableW);
                        cw = usableW;
                    }
                    usableW -= cw;
                    component_3.x(headx);
                    headx += cw;
                }
                var component_4 = unsets[unsets.length - 1];
                if (usableW <= 0) {
                    component_4.visible(false);
                }
                else {
                    component_4.position("absolute");
                    component_4.height(height);
                    component_4.width(usableW);
                    component_4.x(headx);
                }
            }
            return this;
        };
        return LayoutComponent;
    }(Component));
    YA.LayoutComponent = LayoutComponent;
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
    YA.ResizeableComponent = ResizeableComponent;
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
    YA.AnchorableComponent = AnchorableComponent;
})(YA || (YA = {}));
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
var dp = new YA.DataPath("roles[1].permissions[last-1]");
var v = dp.getValue(user);
console.log(v);
dp.setValue(user, {});
console.log(user.roles[1].permissions[1]);
