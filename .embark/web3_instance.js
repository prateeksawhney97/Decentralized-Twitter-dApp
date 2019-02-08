
import Web3 from '/home/prateeksawhney97/Documents/Decentralized-Twitter-dApp/.embark/versions/web3/1.0.0-beta.34/web3';

global.Web3 = Web3;

 if (typeof web3 === 'undefined') {
 var web3 = new Web3();

 }
global.web3 = web3;
var __mainContext = __mainContext || (
  this ? this : typeof self !== 'undefined' ? self : void 0
);
__mainContext.__LoadManager = function() { this.list = []; this.done = false; this.err = null; }
__mainContext.__LoadManager.prototype.execWhenReady = function(cb) { if (this.done) { cb(this.err); } else { this.list.push(cb) } }
__mainContext.__LoadManager.prototype.doFirst = function(todo) { var self = this; todo(function(err) { self.done = true; self.err = err; self.list.map((x) => x.apply(x, [self.err])) }) }
__mainContext.__loadManagerInstance = new __mainContext.__LoadManager();
var whenEnvIsLoaded = function(cb) {
  if (typeof document !== 'undefined' && document !== null && !/comp|inter|loaded/.test(document.readyState)) {
      document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}
whenEnvIsLoaded(function(){
  __mainContext.__loadManagerInstance.doFirst(function(done) {
    EmbarkJS.Blockchain.connect(["$WEB3","ws://localhost:8546","http://localhost:8545"], {warnAboutMetamask: true}, function(err) {
  done(err);
});

  });

  EmbarkJS.environment = "development";
});

export default web3;
