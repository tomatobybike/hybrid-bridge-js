const JSBridge = {
  _callbacks: {},

  invoke(method, data = {}) {
    return new Promise((resolve, reject) => {
      if (typeof method !== "string") {
        reject(new Error("Method name must be a string"));
        return;
      }

      // 生成唯一 callbackId
      const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 存储回调
      JSBridge._callbacks[callbackId] = (result, error) => {
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
    }
  }
};
