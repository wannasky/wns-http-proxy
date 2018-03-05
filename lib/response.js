/**
 * 扩展response
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

//text
http.ServerResponse.prototype.text = function (text) {
    this.setHeader('Content-Type','text/plain;  charset=utf-8');
    this.end(text);
}

//json
http.ServerResponse.prototype.json = function (jsonObject) {
    this.setHeader('Content-Type','application/json; charset=utf-8');
    this.end(JSON.stringify(jsonObject));
}

//others
http.ServerResponse.prototype.renderUrl = function (url) {
    let query = url.indexOf('?');
    if(query !== -1) url = url.slice(0,query);
    this.setHeader('Content-Type',mime.getType(url) + '; charset=utf-8');
    try{
        this.end(fs.readFileSync(path.resolve(url)));
    }catch (e){
        this.statusCode = 404;
    }finally {
        this.end();
    }
}