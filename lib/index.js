let proxyServer = require('./proxy').server;

/**
 * 代理服务器配置
 * @param options {Object}
 * @param options.port {Number} 默认80
 * @param options.root {String} 项目根目录
 */
function createServer(options) {
    return new proxyServer(options);
}

exports.createServer = createServer;
