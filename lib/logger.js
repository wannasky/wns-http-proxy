const colors = require('colors');

//设置主题
colors.setTheme({
    info: 'green',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

//时间
function getTime() {
    let dd = new Date();
    let H = dd.getHours();
    let i = dd.getMinutes();
    let s = dd.getSeconds();
    let m = dd.getMilliseconds();
    H = H > 9 ? H : '0' + H;
    i = i > 9 ? i : '0' + i;
    s = s > 9 ? s : '0' + s;
    return `[${H}:${i}:${s}.${m}]`;
}

//打印主体控制方法
function print(type, ...args) {
    if(this.level.length && this.level.indexOf(type) === -1) return false;
    args.unshift(this.prefix[type], getTime()[type], type.toUpperCase()[type]);
    Reflect.apply(console.log,console, args);
}

function isString(str) {
    return Object.prototype.toString.call(str) === '[object String]';
}

/**
 * Log 日志
 *
 * @param level {Array} 项目打印日志级别
 * @param prefix {String} 项目日志前缀
 */
class Log {

    constructor({level = [], prefix = '' } = {}) {
        this.level = isString(level) ? [level] : level;
        this.prefix = prefix;
    }

    info () {
        Reflect.apply(print, this, ['info', ...arguments]);
    }

    warn () {
        Reflect.apply(print, this, ['warn', ...arguments]);
    }

    debug () {
        Reflect.apply(print, this, ['debug', ...arguments]);
    }

    error () {
        Reflect.apply(print, this, ['error', ...arguments]);
    }
}

module.exports = Log;