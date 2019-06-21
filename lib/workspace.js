var YA;
(function (YA) {
    YA.trimRegx = /(^\s+)|(\s+$)/gi;
    YA.intRegx = /^\s*(\+\-)?\d+\s*$/;
    YA.quoteRegx = /"/gi;
    var lastRegx = /^last(?:-(\d+))?$/;
    function trim(txt) {
        return txt ? txt.toString().replace(YA.trimRegx, "") : "";
    }
    YA.trim = trim;
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
    var dp = new DataPath("roles[1].permissions[last-1]");
    var v = dp.getValue(user);
    console.log(v);
    dp.setValue(user, {});
    console.log(user.roles[1].permissions[1]);
    var YConponent = /** @class */ (function () {
        function YConponent() {
            this.element = document.createElement("div");
        }
        YConponent.prototype.addChild = function (child, index) {
            child.remove();
            child.parent = this;
            var inserted = false;
            if (index !== undefined) {
                var children = this.children;
                for (var i = 0, j = children.length; i < j; i++) {
                    var existed = children.shift();
                    if (i == index) {
                        children.push(child);
                        inserted = true;
                    }
                    children.push(existed);
                }
            }
            if (!inserted)
                this.children.push(child);
            this.element.appendChild(child.element);
            return this;
        };
        YConponent.prototype.remove = function () {
            if (!this.parent)
                return;
            var p = this.parent;
            var pchildren = p.children;
            for (var i = 0, j = pchildren.length; i < j; i++) {
                var existed = pchildren.shift();
                if (existed === this) {
                    p.element.removeChild(this.element);
                    this.parent = undefined;
                    continue;
                }
                pchildren.push(existed);
            }
            return this;
        };
        YConponent.prototype.visible = function (value) {
            if (value === undefined) {
                if (this._visible === undefined) {
                }
                if (this._visible) {
                    return this.parent ? this.parent.visible() : true;
                }
                else {
                    return false;
                }
            }
            else {
                if (!this._disNone) { }
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
        return YConponent;
    }());
})(YA || (YA = {}));
