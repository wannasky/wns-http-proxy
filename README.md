wns-http-proxy
======

`wns-http-proxy`是用来做简单的http/https请求转发

### Installation

`npm install wns-http-proxy --save`

### Use Cases

```javascript
    const wnsHttpProxy = require('wns-http-proxy');
    
    let proxyServer = wnsHttpProxy.createServer({
        port: 80,
        root: '/home/wannasky/workspace/test/'
    });
    
    proxyServer.setLocation({
       'test.baidu.com': {
           root: 'D:/workspace/github-workspace/test/',                   
           '/index': '/index.html',
           '/api': 'http://apistore.baidu.com/api/',                       
           '/service': {
               root: 'D:/workspace/github-workspace/test/',                
               '/user': 'http://apistore.baidu.com/service/user'
           }
       },
       
       ...
    });
```