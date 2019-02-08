
import Web3 from '/home/prateeksawhney97/Documents/Decentralized-Twitter-dApp/.embark/versions/web3/1.0.0-beta.34/web3';

import web3 from 'Embark/web3';

import IpfsApi from 'ipfs-api';

import EmbarkJS from 'embarkjs';
export default EmbarkJS;
global.EmbarkJS = EmbarkJS

let __MessageEvents = function() {
  this.cb = function() {};
};

__MessageEvents.prototype.then = function(cb) {
  this.cb = cb;
};

__MessageEvents.prototype.error = function(err) {
  return err;
};

__MessageEvents.prototype.stop = function() {
  this.filter.stopWatching();
};


/*global EmbarkJS, Web3, __MessageEvents */

// for the whisper v5 and web3.js 1.0
let __embarkWhisperNewWeb3 = {};

__embarkWhisperNewWeb3.setProvider = function (options) {
  const self = this;
  let provider;
  if (options === undefined) {
    provider = "localhost:8546";
  } else {
    provider = options.server + ':' + options.port;
  }
  // TODO: take into account type
  self.web3 = new Web3(new Web3.providers.WebsocketProvider("ws://" + provider, options.providerOptions));
  self.web3.currentProvider.on('connect', () => {
    self.getWhisperVersion(function (err, version) {
      if (err) {
        console.log("whisper not available");
      } else if (version >= 5) {
        self.web3.shh.newSymKey().then((id) => {
          self.symKeyID = id;
        });
        self.web3.shh.newKeyPair().then((id) => {
          self.sig = id;
        });
      } else {
        throw new Error("version of whisper not supported");
      }
      self.whisperVersion = self.web3.version.whisper;
    });
  });
  self.web3.currentProvider.on('error', () => {
    console.log("whisper not available");
  });
};

__embarkWhisperNewWeb3.sendMessage = function (options) {
  var topics, data, ttl, payload;
  topics = options.topic;
  data = options.data || options.payload;
  ttl = options.ttl || 100;
  var powTime = options.powTime || 3;
  var powTarget = options.powTarget || 0.5;

  if (data === undefined) {
    throw new Error("missing option: data");
  }

  if (topics) {
    topics = this.web3.utils.toHex(topics).slice(0, 10);
  }

  payload = JSON.stringify(data);

  let message = {
    sig: this.sig, // signs the message using the keyPair ID
    ttl: ttl,
    payload: EmbarkJS.Utils.fromAscii(payload),
    powTime: powTime,
    powTarget: powTarget
  };

  if (topics) {
    message.topic = topics;
  }

  if (options.pubKey) {
    message.pubKey = options.pubKey; // encrypt using a given pubKey
  } else if(options.symKeyID) {
    message.symKeyID = options.symKeyID; // encrypts using given sym key ID
  } else {
    message.symKeyID = this.symKeyID; // encrypts using the sym key ID
  }

  if (topics === undefined && message.symKeyID && !message.pubKey) {
    throw new Error("missing option: topic");
  }

  this.web3.shh.post(message, function () {
  });
};

__embarkWhisperNewWeb3.listenTo = function (options, callback) {
  var topics = options.topic;

  let promise = new __MessageEvents();

  let subOptions = {};

  if(topics){
    if (typeof topics === 'string') {
      topics = [this.web3.utils.toHex(topics).slice(0, 10)];
    } else {
      topics = topics.map((t) => this.web3.utils.toHex(t).slice(0, 10));
    }
    subOptions.topics = topics;
  }

  if (options.minPow) {
    subOptions.minPow = options.minPow;
  }

  if (options.usePrivateKey === true) {
    if (options.privateKeyID) {
      subOptions.privateKeyID = options.privateKeyID;
    } else {
      subOptions.privateKeyID = this.sig;
    }
  } else {
    if (options.symKeyID) {
      subOptions.symKeyID = options.symKeyID;
    } else {
      subOptions.symKeyID = this.symKeyID;
    }
  }

  let filter = this.web3.shh.subscribe("messages", subOptions)
  .on('data', function (result) {
    var payload = JSON.parse(EmbarkJS.Utils.toAscii(result.payload));
    var data;
    data = {
      topic: EmbarkJS.Utils.toAscii(result.topic),
      data: payload,
      //from: result.from,
      time: result.timestamp
    };

    if (callback) {
      return callback(null, data);
    }
    promise.cb(payload, data, result);
  });

  promise.filter = filter;

  return promise;
};

__embarkWhisperNewWeb3.getWhisperVersion = function (cb) {
  this.web3.shh.getVersion(function (err, version) {
    cb(err, version);
  });
};

__embarkWhisperNewWeb3.isAvailable = function () {
  return new Promise((resolve, reject) => {
    if (!this.web3.shh) {
      return resolve(false);
    }
    try {
      this.getWhisperVersion((err) => {
        resolve(Boolean(!err));
      });
    }
    catch (err) {
      reject(err);
    }
  });
};


EmbarkJS.Messages.registerProvider('whisper', __embarkWhisperNewWeb3);
/*global IpfsApi*/

const __embarkIPFS = {};

const NoConnectionError = 'No IPFS connection. Please ensure to call Embark.Storage.setProvider()';

__embarkIPFS.setProvider = function (options) {
  const self = this;
  return new Promise(function (resolve, reject) {
    try {
      if (!options) {
        self._config = options;
        self._ipfsConnection = IpfsApi('localhost', '5001');
        self._getUrl = "http://localhost:8080/ipfs/";
      } else {
        const ipfsOptions = {host: options.host || options.server, protocol: 'http'};
        if (options.protocol) {
          ipfsOptions.protocol = options.protocol;
        }
        if (options.port && options.port !== 'false') {
          ipfsOptions.port = options.port;
        }
        self._ipfsConnection = IpfsApi(ipfsOptions);
        self._getUrl = options.getUrl || "http://localhost:8080/ipfs/";
      }
      resolve(self);
    } catch (err) {
      console.error(err);
      self._ipfsConnection = null;
      reject(new Error('Failed to connect to IPFS'));
    }
  });
};

__embarkIPFS.isAvailable = function () {
  return new Promise((resolve) => {
    if (!this._ipfsConnection) {
      return resolve(false);
    }
    this._ipfsConnection.id()
      .then((id) => {
        resolve(Boolean(id));
      })
      .catch((err) => {
        console.error(err);
        resolve(false);
      });
  });
};

__embarkIPFS.saveText = function (text) {
  const self = this;
  return new Promise(function (resolve, reject) {
    if (!self._ipfsConnection) {
      return reject(new Error(NoConnectionError));
    }
    self._ipfsConnection.add(self._ipfsConnection.Buffer.from(text), function (err, result) {
      if (err) {
        return reject(err);
      }

      resolve(result[0].path);
    });
  });
};

__embarkIPFS.get = function (hash) {
  const self = this;
  // TODO: detect type, then convert if needed
  //var ipfsHash = web3.toAscii(hash);
  return new Promise(function (resolve, reject) {
    if (!self._ipfsConnection) {
      var connectionError = new Error(NoConnectionError);
      return reject(connectionError);
    }
    self._ipfsConnection.get(hash, function (err, files) {
      if (err) {
        return reject(err);
      }
      resolve(files[0].content.toString());
    });
  });
};

__embarkIPFS.uploadFile = function (inputSelector) {
  const self = this;
  const file = inputSelector[0].files[0];

  if (file === undefined) {
    throw new Error('no file found');
  }

  return new Promise(function (resolve, reject) {
    if (!self._ipfsConnection) {
      return reject(new Error(NoConnectionError));
    }
    const reader = new FileReader();
    reader.onloadend = function () {
      const buffer = self._ipfsConnection.Buffer.from(reader.result);
      self._ipfsConnection.add(buffer, function (err, result) {
        if (err) {
          return reject(err);
        }

        resolve(result[0].path);
      });
    };
    reader.readAsArrayBuffer(file);
  });
};

__embarkIPFS.getUrl = function (hash) {
  return (this._getUrl || "http://localhost:8080/ipfs/") + hash;
};

__embarkIPFS.resolve = function (name, callback) {
  callback = callback || function () {};
  if (!this._ipfsConnection) {
    return callback(new Error(NoConnectionError));
  }

  this._ipfsConnection.name.resolve(name)
    .then(res => {
      callback(null, res.Path);
    })
    .catch(() => {
      callback(name + " is not registered");
    });
};

__embarkIPFS.register = function(addr, callback) {
  callback = callback || function () {};
  if (!this._ipfsConnection) {
    return new Error(NoConnectionError);
  }

  if (addr.length !== 46 || !addr.startsWith('Qm')) {
    return callback('String is not an IPFS hash');
  }

  this._ipfsConnection.name.publish("/ipfs/" + addr)
    .then(res => {
      callback(null, res.Name);
    })
    .catch(() => {
      callback(addr + " could not be registered");
    });
};

EmbarkJS.Storage.registerProvider('ipfs', __embarkIPFS);
/*global web3 */
let __embarkSwarm = {_swarmConnection: undefined};
let SwarmAPI = require('swarm-api');
if (SwarmAPI.default) {
  SwarmAPI = SwarmAPI.default;
}

__embarkSwarm.setProvider = function (options) {
  let protocol = options.protocol || 'http';
  let port = options.port ? `:${options.port}` : '';

  this._config = options;
  this._connectUrl = `${protocol}://${options.host}${port}`;
  this._connectError = new Error(`Cannot connect to Swarm node on ${this._connectUrl}`);

  return new Promise((resolve, reject) => {
    try {
      if (!web3.bzz.currentProvider && !options.useOnlyGivenProvider) {
        this._swarmConnection = new SwarmAPI({gateway: this._connectUrl});
      }
      else if (options.useOnlyGivenProvider && web3.bzz.givenProvider !== null) {
        this._swarmConnection = new SwarmAPI({gateway: web3.bzz.givenProvider});
      }
      resolve(this);
    } catch (err) {
      console.log(err);
      reject(this._connectError);
    }
  });
};

__embarkSwarm.isAvailable = function () {
  return new Promise((resolve, reject) => {
    // if web3 swarm object doesn't exist
    if (!this._swarmConnection) {
      return resolve(false);
    }
    // swarm obj exists, but has no provider set (seems to happen a LOT!),
    // try setting the provider to our currently set provider again
    else if (!this._swarmConnection.gateway && this._config.host) {
      this._swarmConnection.gateway = this._connectUrl;
    }
    if (!this._swarmConnection.gateway) {
      return resolve(false);
    }
    this._swarmConnection.isAvailable((err, isAvailable) => {
      if (err) return reject(err);
      resolve(isAvailable);
    });
  });
};

__embarkSwarm.saveText = function (text) {
  return new Promise((resolve, reject) => {
    this.isAvailable().then((isAvailable) => {
      if (!isAvailable) {
        return reject(this._connectError);
      }
      this._swarmConnection.uploadRaw(text, (err, hash) => {
        if (err) return reject(err);
        resolve(hash);
      });
    });
  });
};

__embarkSwarm.get = function (hash) {
  return new Promise((resolve, reject) => {
    this.isAvailable().then((isAvailable) => {
      if (!isAvailable) {
        return reject(this._connectError);
      }
      this._swarmConnection.downloadRaw(hash, (err, content) => {
        if (err) return reject(err);
        resolve(content);
      });
    });
  });
};

__embarkSwarm.uploadFile = function (inputSelector) {
  let file = inputSelector[0].files[0];

  if (file === undefined) {
    throw new Error('no file found');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (event) => {
      const fileContent = new Uint8Array(event.target.result);
      this.isAvailable().then((isAvailable) => {
        if (!isAvailable) {
          return reject(this._connectError);
        }
        this._swarmConnection.uploadRaw(fileContent, (err, hash) => {
          if (err) return reject(err);
          resolve(hash);
        });
      });
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

__embarkSwarm.getUrl = function (hash) {
  return `${this._connectUrl}/bzz-raw:/${hash}`;
};

const NotAvailable = "Not available with Swarm";

__embarkSwarm.resolve = function (_name, callback) {
  callback(NotAvailable);
};

__embarkSwarm.register = function (_addr, callback) {
  callback(NotAvailable);
};

EmbarkJS.Storage.registerProvider('swarm', __embarkSwarm);
var whenEnvIsLoaded = function(cb) {
  if (typeof document !== 'undefined' && document !== null && !/comp|inter|loaded/.test(document.readyState)) {
      document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}
whenEnvIsLoaded(function() {
  
EmbarkJS.Messages.setProvider('whisper', {"server":"localhost","port":8546,"type":"ws"});
});

var whenEnvIsLoaded = function(cb) {
  if (typeof document !== 'undefined' && document !== null && !/comp|inter|loaded/.test(document.readyState)) {
      document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}
whenEnvIsLoaded(function() {
  
EmbarkJS.Storage.setProviders([{"provider":"ipfs","host":"localhost","port":5001,"getUrl":"http://localhost:8080/ipfs/"},{"provider":"swarm","host":"localhost","port":5001,"getUrl":"http://localhost:8080/ipfs/"}]);
});

var whenEnvIsLoaded = function(cb) {
  if (typeof document !== 'undefined' && document !== null && !/comp|inter|loaded/.test(document.readyState)) {
      document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}
