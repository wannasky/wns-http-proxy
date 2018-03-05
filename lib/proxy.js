const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');

require('./response');

const Logger = require('./logger');
let log = new Logger({prefix: 'proxy-server', level: ['info', 'warn', 'error']});

/**
 * 代理服务器
 */
class ProxyServer {

    /**
     *
     * @param options {Object}
     * @param options.port {Number} 端口号，默认80
     * @param options.root {String} 项目根目录
     */
    constructor(options = {}) {
        !options.port && (options.port = 80);
        if (!options.root) throw new Error('请指定root');
        this.options = options;
        this.location = {};
    }

    /**
     * 设置代理规则
     * @param locations
     * @desc host配置内部可以自定义root,子对象基础父对象root
     * {
     *   'test.baidu.com': {
     *      root: 'D:/workspace/github-workspace/test/',                    //可以重置根目录
     *      '/index': '/index.html',
     *      '/api': 'http://apistore.baidu.com/api/',                       //路径代理
     *      '/service': {
     *          root: 'D:/workspace/github-workspace/test/',                //可以重置根目录
     *          '/user': 'http://apistore.baidu.com/service/user'
     *      }
     *   }
     * }
     */
    setLocation(locations) {
        for (let host in locations) {
            log.info('服务器转发', host);
            this.__calcLocation(host, '', locations[host], this.options.root);
        }
    }

    /**
     * 启动代理服务器
     */
    start() {
        this.proxyServer = http.createServer((req, res) => {
            const originHost = req.headers.host;
            const originUrl = url.parse(req.url);
            let location;
            if (Reflect.has(this.location, originHost)) {
                location = this.location[originHost];
                for (let item of location) {
                    if (item.regexp.test(originUrl.path)) {
                        this.__passServer(req, res, item);
                        break;
                    }
                }
            }
        });
        this.proxyServer.listen(this.options.port);
        log.info('代理服务器启动，端口号：', this.options.port);
    }

    __passServer(req, res, match) {
        let reqUrl = url.parse(req.url);
        let argURI = reqUrl.path.match(match.regexp)[1] || '';
        if (match.location && url.parse(match.location).protocol) {
            let mlUrl = url.parse(match.location);
            let proxyReq = (mlUrl.protocol === 'http:' ? http : https)
                .request(this.__orgRequestHeader(match, req), sres => {
                    sres.setEncoding('utf8');
                    sres.pipe(res);
                    log.info('请求', reqUrl.path,'转发至',match.location);
                });
            proxyReq.on('error', error => {
                log.error('代理请求出错', error.message);
            });

            if (/POST|PUT/i.test(req.method)) {
                req.pipe(proxyReq);
            } else {
                proxyReq.end();
            }
        } else {
            let URI = match.location ? match.location : '';
            URI = path.join(match.root, URI, argURI)
            res.renderUrl(URI);
            log.info('请求', reqUrl.path,'转发至',URI);
        }
    }

    __orgRequestHeader(match, req) {
        let options = {};
        let mlUrl = url.parse(match.location);
        options.port = mlUrl.port || 80;
        ['host', 'hostname'].forEach(key => {
            options[key] = mlUrl[key];
        });
        options.method = req.method;
        options.headers = Object.assign({}, req.headers);
        options.path = mlUrl.path + url.parse(req.url).path.match(match.regexp)[1] || '';
        return options;
    }

    __createRegxp(rule) {
        let regexp = rule.trim();
        regexp = regexp.replace(/\./g, '\\.').replace(/\*/g, '.*');
        if (regexp.indexOf('/') === 0) {
            regexp = '^' + regexp;
        }
        if (!regexp.match(/\$$/)) {
            regexp += '(\\S*$)';
        }
        return new RegExp(regexp);
    }

    __calcLocation(host, key, location, root) {
        if (!location || isString(location)) {
            !this.location[host] && (this.location[host] = []);
            this.location[host].push({regexp: this.__createRegxp(key), location, root});
        } else {
            root = location.root ? location.root : root;
            for (let cKey in location) {
                if (cKey !== 'root') {
                    this.__calcLocation(host, key + cKey, location[cKey], root);
                }
            }
            this.__calcLocation(host, key, null, root);
        }
    }
}

function isString(object) {
    return Object.prototype.toString.call(object) === '[object String]';
}

module.exports.server = ProxyServer;