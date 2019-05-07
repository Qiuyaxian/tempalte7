window.Template7 = (function () {
    'use strict';
    // 内部方法 进行类型判断(复合类型判断)
    function isArray(arr) {
        return Object.prototype.toString.apply(arr) === '[object Array]';
    }
    // 内部方法 进行类型判断(复合类型判断)
    function isObject(obj) {
        return obj instanceof Object;
    }
    // 内部方法 进行类型判断(基本类型判断)
    function isFunction(func) {
        return typeof func === 'function';
    }
    // 过滤特定的标识符
    function _escape(string) {
        return typeof window !== 'undefined' && window.escape ? window.escape(string) : string
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    //内部属性,用户存储
    var cache = {};
    //
    var quoteSingleRexExp = new RegExp('\'', 'g');
    //
    var quoteDoubleRexExp = new RegExp('"', 'g');
    // 内部方法 helper
    function helperToSlices(string) {
        var helperParts = string.replace(/[{}#}]/g, '').split(' ');
        var slices = [];
        var shiftIndex, i, j;
        for (i = 0; i < helperParts.length; i++) {
            var part = helperParts[i];
            var blockQuoteRegExp, openingQuote;
            if (i === 0) slices.push(part);
            else {
                if (part.indexOf('"') === 0 || part.indexOf('\'') === 0) {
                    blockQuoteRegExp = part.indexOf('"') === 0 ? quoteDoubleRexExp : quoteSingleRexExp;
                    openingQuote = part.indexOf('"') === 0 ? '"' : '\'';
                    // Plain String
                    if (part.match(blockQuoteRegExp).length === 2) {
                        // One word string
                        slices.push(part);
                    }
                    else {
                        // Find closed Index
                        shiftIndex = 0;
                        for (j = i + 1; j < helperParts.length; j++) {
                            part += ' ' + helperParts[j];
                            if (helperParts[j].indexOf(openingQuote) >= 0) {
                                shiftIndex = j;
                                slices.push(part);
                                break;
                            }
                        }
                        if (shiftIndex) i = shiftIndex;
                    }
                }
                else {
                    if (part.indexOf('=') > 0) {
                        // Hash
                        var hashParts = part.split('=');
                        var hashName = hashParts[0];
                        var hashContent = hashParts[1];
                        if (!blockQuoteRegExp) {
                            blockQuoteRegExp = hashContent.indexOf('"') === 0 ? quoteDoubleRexExp : quoteSingleRexExp;
                            openingQuote = hashContent.indexOf('"') === 0 ? '"' : '\'';
                        }
                        if (hashContent.match(blockQuoteRegExp).length !== 2) {
                            shiftIndex = 0;
                            for (j = i + 1; j < helperParts.length; j++) {
                                hashContent += ' ' + helperParts[j];
                                if (helperParts[j].indexOf(openingQuote) >= 0) {
                                    shiftIndex = j;
                                    break;
                                }
                            }
                            if (shiftIndex) i = shiftIndex;
                        }
                        var hash = [hashName, hashContent.replace(blockQuoteRegExp,'')];
                        slices.push(hash);
                    }
                    else {
                        // Plain variable
                        slices.push(part);
                    }
                }
            }
        }
        return slices;
    }
    //内部方法，禁止外部修改
    /**
     * [stringToBlocks description]
     * @param  {[type]} string [模板字符串]
     * @return {[type]}        [Array]
     */
    function stringToBlocks(string) {
        var blocks = [], i, j, k;
        if (!string) return []; //如果字符串不存在则返回空数组
        //通过正则拆分模板字符串
        //split 表达式解读
        // ( ) : 标记一个子表达式的开始和结束位置。
        // [ ] : 是定义匹配的字符范围
        // { } : 一般用来表示匹配的长度
        var _blocks = string.split(/({{[^{^}]*}})/);
        //遍历模板字符串数组
        for (i = 0; i < _blocks.length; i++) {
            var block = _blocks[i];
            if (block === '') continue;  //如果是空字符串,则进行下一次循环
            // 如果查找不到则设置
            if (block.indexOf('{{') < 0) { 
                //设置类型
                blocks.push({
                    type: 'plain',
                    content: block
                });
            }
            else {
                if (block.indexOf('{/') >= 0) {
                    continue;
                }
                //查找变量
                if (block.indexOf('{#') < 0 && block.indexOf(' ') < 0 && block.indexOf('else') < 0) {
                    // Simple variable
                    blocks.push({
                        type: 'variable',
                        contextName: block.replace(/[{}]/g, '')
                    });
                    continue;
                }
                // Helpers
                var helperSlices = helperToSlices(block);
                var helperName = helperSlices[0];
                var isPartial = helperName === '>';
                var helperContext = [];
                var helperHash = {};
                for (j = 1; j < helperSlices.length; j++) {
                    var slice = helperSlices[j];
                    if (isArray(slice)) {
                        // Hash
                        helperHash[slice[0]] = slice[1] === 'false' ? false : slice[1];
                    }
                    else {
                        helperContext.push(slice);
                    }
                }

                if (block.indexOf('{#') >= 0) {
                    // Condition/Helper
                    var helperStartIndex = i;
                    var helperContent = '';
                    var elseContent = '';
                    var toSkip = 0;
                    var shiftIndex;
                    var foundClosed = false, foundElse = false, foundClosedElse = false, depth = 0;
                    for (j = i + 1; j < _blocks.length; j++) {
                        if (_blocks[j].indexOf('{{#') >= 0) {
                            depth ++;
                        }
                        if (_blocks[j].indexOf('{{/') >= 0) {
                            depth --;
                        }
                        if (_blocks[j].indexOf('{{#' + helperName) >= 0) {
                            helperContent += _blocks[j];
                            if (foundElse) elseContent += _blocks[j];
                            toSkip ++;
                        }
                        else if (_blocks[j].indexOf('{{/' + helperName) >= 0) {
                            if (toSkip > 0) {
                                toSkip--;
                                helperContent += _blocks[j];
                                if (foundElse) elseContent += _blocks[j];
                            }
                            else {
                                shiftIndex = j;
                                foundClosed = true;
                                break;
                            }
                        }
                        else if (_blocks[j].indexOf('else') >= 0 && depth === 0) {
                            foundElse = true;
                        }
                        else {
                            if (!foundElse) helperContent += _blocks[j];
                            if (foundElse) elseContent += _blocks[j];
                        }

                    }
                    if (foundClosed) {
                        if (shiftIndex) i = shiftIndex;
                        blocks.push({
                            type: 'helper',
                            helperName: helperName,
                            contextName: helperContext,
                            content: helperContent,
                            inverseContent: elseContent,
                            hash: helperHash
                        });
                    }
                }
                else if (block.indexOf(' ') > 0) {
                    if (isPartial) {
                        helperName = '_partial';
                        if (helperContext[0]) helperContext[0] = '"' + helperContext[0].replace(/"|'/g, '') + '"';
                    }
                    blocks.push({
                        type: 'helper',
                        helperName: helperName,
                        contextName: helperContext,
                        hash: helperHash
                    });
                }
            }
        }
        // 返回结果
        return blocks;
    }
    //创建静态对象(用户缓存,同时实现方法，禁止外部修改)
    //return 为 compile方法
    var Template7 = function (template, options) {
        var t = this;
        t.template = template; //把传进来的模板字符串设置到当前对象的属性上，以便后续的查找操作

        function getCompileFn(block, depth) {
            if (block.content) return compile(block.content, depth);
            else return function () {return ''; };
        }
        function getCompileInverse(block, depth) {
            if (block.inverseContent) return compile(block.inverseContent, depth);
            else return function () {return ''; };
        }
        //层级变量
        function getCompileVar(name, ctx) {
            var variable, parts, levelsUp = 0, initialCtx = ctx;
            if (name.indexOf('../') === 0) {
                levelsUp = name.split('../').length - 1;
                var newDepth = ctx.split('_')[1] - levelsUp;
                ctx = 'ctx_' + (newDepth >= 1 ? newDepth : 1);
                parts = name.split('../')[levelsUp].split('.');
            }
            else if (name.indexOf('@global') === 0) {
                ctx = 'Template7.global';
                parts = name.split('@global.')[1].split('.');
            }
            else if (name.indexOf('@root') === 0) {
                ctx = 'root';
                parts = name.split('@root.')[1].split('.');
            }
            else {
                parts = name.split('.');
            }
            variable = ctx;
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                if (part.indexOf('@') === 0) {
                    if (i > 0) {
                        variable += '[(data && data.' + part.replace('@', '') + ')]';
                    }
                    else {
                        variable = '(data && data.' + name.replace('@', '') + ')';
                    }
                }
                else {
                    if (isFinite(part)) {
                        variable += '[' + part + ']';
                    }
                    else {
                        if (part === 'this' || part.indexOf('this.') >= 0 || part.indexOf('this[') >= 0 || part.indexOf('this(') >= 0) {
                            variable = part.replace('this', ctx);
                        }
                        else {
                            variable += '.' + part;
                        }
                    }
                }
            }

            return variable;
        }
        function getCompiledArguments(contextArray, ctx) {
            var arr = [];
            for (var i = 0; i < contextArray.length; i++) {
                if (/^['"]/.test(contextArray[i])) arr.push(contextArray[i]);
                else if (/^(true|false|\d+)$/.test(contextArray[i])) arr.push(contextArray[i]);
                else {
                    arr.push(getCompileVar(contextArray[i], ctx));
                }
            }

            return arr.join(', ');
        }
        //模板编译方法(核心)
        function compile(template, depth) {
            depth = depth || 1;
            // 设置模板字符串,如果有传进来的参数,则调用传来的模板，否则从对象属性身上查找
            template = template || t.template;
            // 进行模板检测
            if (typeof template !== 'string') {
                // 抛出异常
                throw new Error('Template7: Template must be a string');
            }
            //解析模板
            var blocks = stringToBlocks(template);
            //进行模板判断
            if (blocks.length === 0) {
                // 如果匹配回来的模板为空，则返回空字符串
                return function () { return ''; };
            }

            var ctx = 'ctx_' + depth;
            var resultString = '';
            if (depth === 1) {
                resultString += '(function (' + ctx + ', data, root) {\n';
            }
            else {
                resultString += '(function (' + ctx + ', data) {\n';
            }
            if (depth === 1) {
                resultString += 'function isArray(arr){return Object.prototype.toString.apply(arr) === \'[object Array]\';}\n';
                resultString += 'function isFunction(func){return (typeof func === \'function\');}\n';
                resultString += 'function c(val, ctx) {if (typeof val !== "undefined" && val !== null) {if (isFunction(val)) {return val.call(ctx);} else return val;} else return "";}\n';
                resultString += 'root = root || ctx_1 || {};\n';
            }
            resultString += 'var r = \'\';\n';
            var i, j, context;
            for (i = 0; i < blocks.length; i++) {
                var block = blocks[i];
                // Plain block
                if (block.type === 'plain') {
                    resultString += 'r +=\'' + (block.content).replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/'/g, '\\' + '\'') + '\';';
                    continue;
                }
                var variable, compiledArguments;
                // Variable block
                if (block.type === 'variable') {
                    variable = getCompileVar(block.contextName, ctx);
                    resultString += 'r += c(' + variable + ', ' + ctx + ');';
                }
                // Helpers block
                if (block.type === 'helper') {
                    if (block.helperName in t.helpers) {
                        compiledArguments = getCompiledArguments(block.contextName, ctx);

                        resultString += 'r += (Template7.helpers.' + block.helperName + ').call(' + ctx + ', ' + (compiledArguments && (compiledArguments + ', ')) +'{hash:' + JSON.stringify(block.hash) + ', data: data || {}, fn: ' + getCompileFn(block, depth + 1) + ', inverse: ' + getCompileInverse(block, depth + 1) + ', root: root});';

                    }
                    else {
                        if (block.contextName.length > 0) {
                            throw new Error('Template7: Missing helper: "' + block.helperName + '"');
                        }
                        else {
                            variable = getCompileVar(block.helperName, ctx);
                            resultString += 'if (' + variable + ') {';
                            resultString += 'if (isArray(' + variable + ')) {';
                            resultString += 'r += (Template7.helpers.each).call(' + ctx + ', ' + variable + ', {hash:' + JSON.stringify(block.hash) + ', data: data || {}, fn: ' + getCompileFn(block, depth+1) + ', inverse: ' + getCompileInverse(block, depth+1) + ', root: root});';
                            resultString += '}else {';
                            resultString += 'r += (Template7.helpers.with).call(' + ctx + ', ' + variable + ', {hash:' + JSON.stringify(block.hash) + ', data: data || {}, fn: ' + getCompileFn(block, depth+1) + ', inverse: ' + getCompileInverse(block, depth+1) + ', root: root});';
                            resultString += '}}';
                        }
                    }
                }
            }
            resultString += '\nreturn r;})';
            return eval.call(window, resultString);
        }
        t.compile = function (template) {
            //模板方法检测
            if (!t.compiled) {
                //调用模板方法，并返回给外部
                t.compiled = compile(template);
            }
            //调用模板方法，并返回给外部
            return t.compiled;
        };
    };
    // 给静态对象设置原型方法和属性 
    Template7.prototype = {
        options: {},
        partials: {},
        helpers: {   //默认hepler方法
            '_partial' : function (partialName, options) {
                var p = Template7.prototype.partials[partialName];
                if (!p || (p && !p.template)) return '';
                if (!p.compiled) {
                    p.compiled = new Template7(p.template).compile();
                }
                var ctx = this;
                for (var hashName in options.hash) {
                    ctx[hashName] = options.hash[hashName];
                }
                return p.compiled(ctx, options.data, options.root);
            },
            'escape': function (context, options) {
                if (typeof context !== 'string') {
                    throw new Error('Template7: Passed context to "escape" helper should be a string');
                }
                return _escape(context);
            },
            // if else 
            'if': function (context, options) {
                if (isFunction(context)) { context = context.call(this); }
                if (context) {
                    return options.fn(this, options.data);
                }
                else {
                    return options.inverse(this, options.data);
                }
            },
            // unless
            'unless': function (context, options) {
                if (isFunction(context)) { context = context.call(this); }
                if (!context) {
                    return options.fn(this, options.data);
                }
                else {
                    return options.inverse(this, options.data);
                }
            },
            // each 循环
            'each': function (context, options) {
                var ret = '', i = 0;
                if (isFunction(context)) { context = context.call(this); }
                if (isArray(context)) {
                    if (options.hash.reverse) {
                        context = context.reverse();
                    }
                    for (i = 0; i < context.length; i++) {
                        ret += options.fn(context[i], {first: i === 0, last: i === context.length - 1, index: i});
                    }
                    if (options.hash.reverse) {
                        context = context.reverse();
                    }
                }
                else {
                    for (var key in context) {
                        i++;
                        ret += options.fn(context[key], {key: key});
                    }
                }
                if (i > 0) return ret;
                else return options.inverse(this);
            },
            'with': function (context, options) {
                if (isFunction(context)) { context = context.call(this); }
                return options.fn(context);
            },
            // join 数组拆分
            'join': function (context, options) {
                if (isFunction(context)) { context = context.call(this); }
                return context.join(options.hash.delimiter || options.hash.delimeter);
            },
            // js 表达式
            'js': function (expression, options) {
                var func;
                if (expression.indexOf('return')>=0) {
                    func = '(function(){'+expression+'})';
                }
                else {
                    func = '(function(){return ('+expression+')})';
                }
                return eval.call(this, func).call(this);
            },
            // js 表达式 比较
            'js_compare': function (expression, options) {
                var func;
                if (expression.indexOf('return')>=0) {
                    func = '(function(){'+expression+'})';
                }
                else {
                    func = '(function(){return ('+expression+')})';
                }
                var condition = eval.call(this, func).call(this);
                if (condition) {
                    return options.fn(this, options.data);
                }
                else {
                    return options.inverse(this, options.data);
                }
            }
        }
    };
    // 实例化内部对象，并检测window下是否存在模板对象,并返回外部接口compile方法
    var t7 = function (template, data) {
        if (arguments.length === 2) {
            var instance = new Template7(template);  //实例化内部模板对象
            var rendered = instance.compile()(data); //调用内部模板编译方法
            instance = null;        // 释放对象，进行垃圾回收
            return (rendered);      // 立即执行编译(函数自执行)
        }
        else return new Template7(template);
    };
    // 外部接口方法 注册helper
    t7.registerHelper = function (name, fn) {
        Template7.prototype.helpers[name] = fn;
    };
    // 外部接口方法 删除helper
    t7.unregisterHelper = function (name) {
        // 通过对象的方式查找helper，查找到后删除指针指向
        Template7.prototype.helpers[name] = undefined;
        // 通过delete方法删除对应的属性
        delete Template7.prototype.helpers[name];
    };
    // 外部接口方法 修改标识符号
    t7.registerPartial = function (name, template) {
        // 通过对象的方式
        Template7.prototype.partials[name] = {template: template};
    };
    // 外部接口方法 删除标识符号
    t7.unregisterPartial = function (name, template) {
        if (Template7.prototype.partials[name]) {
            // 通过对象的方式查找unregisterPartial，查找到后删除指针指向
            Template7.prototype.partials[name] = undefined;
            // 通过delete方法删除对应的属性
            delete Template7.prototype.partials[name];
        }
    };
    // 外部接口方法 进行模板编译
    t7.compile = function (template, options) {
        // 实例化模板对象
        var instance = new Template7(template, options);
        // 返回模板渲染方法
        return instance.compile();
    };
    // 返回外部接口,操作Template7原型链对象属性
    t7.options = Template7.prototype.options;
    // 返回外部接口,操作Template7原型链对象方法
    t7.helpers = Template7.prototype.helpers;
    // 返回外部接口,操作Template7原型链对象属性
    t7.partials = Template7.prototype.partials;
    //内部构造t7对象，并且返回给外部调用接口(闭包原理)
    return t7;
})();