let proxyServer = require('./proxy').server;

/**
 * 代理服务器配置
 * @param options {Object}
 * @param options.port {Number} 默认80
 * @param options.root {String} 项目根目录
 * @param options.log {Array} 日志等级，默认['info','warn','debug','error']
 */
function createServer(options) {
    return new proxyServer(options);
}

exports.createServer = createServer;
