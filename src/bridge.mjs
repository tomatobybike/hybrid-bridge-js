const JSBridge = {
  _callbacks: {},
  _handlers: {}, // 存储 H5 注册的方法
  _timeout: 5000, // 超时时间（ms）

  invoke(method, data = {}) {
    return new Promise((resolve, reject) => {
      if (typeof method !== 'string') {
        reject(new Error('Method name must be a string'));
        return;
      }

      // 生成唯一 callbackId
      const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 设定超时机制
      const timeoutTimer = setTimeout(() => {
        if (JSBridge._callbacks[callbackId]) {
          reject(new Error(`Native method ${method} timeout`));
          delete JSBridge._callbacks[callbackId];
        }
      }, JSBridge._timeout);

      // 存储回调
      JSBridge._callbacks[callbackId] = (result, error) => {
        clearTimeout(timeoutTimer); // 清除超时计时器
        if (error) {
          reject(new Error(error));
        } else {
          resolve(result);
        }
        delete JSBridge._callbacks[callbackId];
      };

      const message = { method, data, callbackId };

      try {
        if (window.webkit?.messageHandlers?.[method]) {
          // iOS 端
          window.webkit.messageHandlers[method].postMessage(message);
        } else if (window.AndroidBridge?.[method]) {
          // Android 端
          window.AndroidBridge[method](JSON.stringify(message));
        } else {
          reject(new Error(`Native method ${method} is not available`));
        }
      } catch (err) {
        reject(new Error(`JSBridge invoke error: ${err.message}`));
      }
    });
  },

  receive(callbackId, result, error = null) {
    if (JSBridge._callbacks[callbackId]) {
      JSBridge._callbacks[callbackId](result, error);
    } else {
      console.warn(`JSBridge receive warning: callbackId ${callbackId} is expired or invalid`);
    }
  },

  /**
   * 注册 H5 方法，让 Native 端可以调用
   * @param {string} method 方法名
   * @param {Function} handler 处理函数 (data, callback)
   */
  register(method, handler) {
    if (typeof method !== 'string' || typeof handler !== 'function') {
      console.error('JSBridge.register 参数错误');
      return;
    }
    JSBridge._handlers[method] = handler;
  },

  /**
   * 供 Native 端调用 H5 方法
   * @param {string} method 方法名
   * @param {object} data 传递的参数
   * @param {string} callbackId Native 端传递的回调 ID
   */
  call(method, data = {}, callbackId = null) {
    if (JSBridge._handlers[method]) {
      try {
        JSBridge._handlers[method](data, (result) => {
          if (callbackId) {
            // H5 处理完后，回传给 Native
            JSBridge._sendToNative(callbackId, result);
          }
        });
      } catch (err) {
        console.error(`JSBridge call error: ${err.message}`);
      }
    } else {
      console.warn(`JSBridge call warning: H5 method ${method} is not registered`);
    }
  },

  /**
   * H5 处理完后，回传给 Native
   * @param {string} callbackId Native 传递的 callbackId
   * @param {any} result 返回给 Native 的数据
   */
  _sendToNative(callbackId, result) {
    try {
      if (window.webkit?.messageHandlers?.receiveFromH5) {
        // iOS 端
        window.webkit.messageHandlers.receiveFromH5.postMessage({ callbackId, result });
      } else if (window.AndroidBridge?.receiveFromH5) {
        // Android 端
        window.AndroidBridge.receiveFromH5(JSON.stringify({ callbackId, result }));
      } else {
        console.warn('JSBridge: No receiveFromH5 method found in Native');
      }
    } catch (err) {
      console.error(`JSBridge _sendToNative error: ${err.message}`);
    }
  },
};

export default JSBridge;
