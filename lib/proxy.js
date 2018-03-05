const http = require('http');
const https = require('https');
const url = require('url');
const zlib = require('zlib');
const path = require('path');
const Logger = require('./logger');

require('./response');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
        this.log = new Logger({prefix: 'proxy-server', level: options.level || ['info', 'warn', 'error', 'debug']});
        !options.port && (options.port = 80);
        if (!options.root){
            this.log.warn('未指定root，setLocation时请重新指定root')
        }
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
            this.log.info('服务器转发', host);
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
        this.log.info('代理服务器启动，端口号：', this.options.port);
    }

    __passServer(req, res, match) {
        let reqUrl = url.parse(req.url);
        let argURI = reqUrl.path.match(match.regexp)[1] || '';
        if (match.location && url.parse(match.location).protocol) {
            let mlUrl = url.parse(match.location);
            let proxyReq = (mlUrl.protocol === 'http:' ? http : https)
                .request(this.__orgRequestHeader(match, req), sres => {
                    let contentEncoding = sres.headers['content-encoding'] || 'identity';
                    contentEncoding = contentEncoding.trim().toLowerCase();

                    const zlibOptions = {
                        flush: zlib.Z_SYNC_FLUSH,
                        finishFlush: zlib.Z_SYNC_FLUSH
                    }

                    let responseContent;

                    //添加gzip处理
                    if (contentEncoding === 'gzip') {
                        responseContent = zlib.createGunzip(zlibOptions);
                        sres.pipe(responseContent);
                    } else if (contentEncoding === 'deflate') {
                        responseContent = zlib.createInflate(zlibOptions);
                        sres.pipe(responseContent);
                    } else {
                        responseContent = sres;
                    }

                    responseContent.setEncoding('utf8');
                    responseContent.pipe(res);
                    this.log.debug('请求', reqUrl.path,'转发至',match.location);
                });
            proxyReq.on('error', error => {
                this.log.error('代理请求出错', error.message);
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
            this.log.debug('请求', reqUrl.path,'转发至',URI);
        }
    }

    __orgRequestHeader(match, req) {
        let options = {};
        let mlUrl = url.parse(match.location);
        options.port = mlUrl.port || (mlUrl.protocol === 'http:' ? 80 : 443);
        ['host', 'hostname'].forEach(key => {
            options[key] = mlUrl[key];
        });
        options.method = req.method;
        options.headers = Object.assign({}, req.headers);
        options.headers.host = mlUrl.host;
        options.path = mlUrl.path + '/' + url.parse(req.url).path.match(match.regexp)[1] || '';
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